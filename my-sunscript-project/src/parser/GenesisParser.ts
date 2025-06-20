import { Token, TokenType, SourceLocation } from '../types';
import { 
  GenesisProgram, 
  ImportDeclaration, 
  ConfigBlock, 
  EntrypointDeclaration,
  BuildConfig,
  DependencyDeclaration,
  DeploymentConfig,
  AIDirective
} from '../types/ast';
import { Parser } from './Parser';
import { ParserError } from './ParserError';

export class GenesisParser extends Parser {
  protected currentLocation(): SourceLocation {
    const token = this.peek();
    return {
      start: token.position,
      end: token.position
    };
  }
  constructor(tokens: Token[]) {
    super(tokens);
  }

  public parseGenesis(): GenesisProgram {
    const genesis: GenesisProgram = {
      type: 'GenesisProgram',
      projectName: '',
      version: '',
      sourceDir: './src',  // Default source directory
      outputDir: './dist', // Default output directory
      imports: [],
      location: this.currentLocation()
    };

    // Parse project metadata
    this.parseProjectMetadata(genesis);

    // Parse the rest of the genesis file
    while (!this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      if (this.match(TokenType.COMMENT)) {
        continue;
      }

      if (this.check(TokenType.MARKDOWN_HEADER)) {
        this.parseDescription(genesis);
      } else if (this.match(TokenType.IMPORTS)) {
        genesis.imports = this.parseImports();
      } else if (this.match(TokenType.CONFIG)) {
        genesis.config = this.parseConfig();
      } else if (this.match(TokenType.ENTRYPOINTS)) {
        genesis.entrypoints = this.parseEntrypoints();
      } else if (this.match(TokenType.BUILD)) {
        genesis.buildConfig = this.parseBuildConfig();
      } else if (this.match(TokenType.DEPENDENCIES)) {
        genesis.dependencies = this.parseDependencies();
      } else if (this.match(TokenType.DEPLOYMENT)) {
        genesis.deployment = this.parseDeployment();
      } else if (this.check(TokenType.AI_DIRECTIVE)) {
        if (!genesis.globalDirectives) {
          genesis.globalDirectives = [];
        }
        genesis.globalDirectives.push(this.parseAIDirective());
      } else {
        this.advance(); // Skip unknown tokens
      }
    }

    return genesis;
  }

  private parseProjectMetadata(genesis: GenesisProgram): void {
    // @project "name"
    if (this.match(TokenType.AI_DIRECTIVE) && this.previous().value === '@project') {
      genesis.projectName = this.consume(TokenType.STRING, 'Expected project name string').value;
    }

    // @version "x.x.x"
    if (this.match(TokenType.AI_DIRECTIVE) && this.previous().value === '@version') {
      genesis.version = this.consume(TokenType.STRING, 'Expected version string').value;
    }

    // @author "name"
    if (this.match(TokenType.AI_DIRECTIVE) && this.previous().value === '@author') {
      genesis.author = this.consume(TokenType.STRING, 'Expected author string').value;
    }
    
    // @source "path"
    if (this.match(TokenType.AI_DIRECTIVE) && this.previous().value === '@source') {
      genesis.sourceDir = this.consume(TokenType.STRING, 'Expected source directory path').value;
    }
    
    // @output "path"
    if (this.match(TokenType.AI_DIRECTIVE) && this.previous().value === '@output') {
      genesis.outputDir = this.consume(TokenType.STRING, 'Expected output directory path').value;
    }

    // @context
    if (this.match(TokenType.AI_DIRECTIVE) && this.previous().value === '@context') {
      // Handle context as part of global directives
      if (!genesis.globalDirectives) {
        genesis.globalDirectives = [];
      }
      const contextValue = this.parseUntilNewline();
      genesis.globalDirectives.push({
        type: 'AIDirective',
        directive: 'context',
        parameters: { value: contextValue }
      });
    }
  }

  private parseDescription(genesis: GenesisProgram): void {
    const lines: string[] = [];
    
    // Skip markdown headers
    while (this.match(TokenType.MARKDOWN_HEADER)) {
      this.parseUntilNewline();
    }

    // Collect description lines
    while (!this.isAtEnd() && !this.checkAny([
      TokenType.IMPORTS, TokenType.CONFIG, TokenType.ENTRYPOINTS,
      TokenType.BUILD, TokenType.DEPENDENCIES, TokenType.DEPLOYMENT,
      TokenType.MARKDOWN_HEADER, TokenType.AI_DIRECTIVE
    ])) {
      if (this.check(TokenType.TEXT)) {
        lines.push(this.advance().value);
      } else if (this.match(TokenType.NEWLINE)) {
        if (lines.length > 0 && lines[lines.length - 1] !== '') {
          lines.push('');
        }
      } else {
        this.advance();
      }
    }

    genesis.description = lines.join('\n').trim();
  }

  private parseImports(): ImportDeclaration[] {
    const imports: ImportDeclaration[] = [];
    
    this.consume(TokenType.OPEN_BRACE, 'Expected { after imports');
    this.consumeNewlines();

    while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      const importPath = this.parseImportPath();
      let alias: string | undefined;

      if (this.match(TokenType.AS)) {
        alias = this.consume(TokenType.IDENTIFIER, 'Expected alias name').value;
      }

      imports.push({
        type: 'ImportDeclaration',
        path: importPath,
        alias,
        location: this.currentLocation()
      });

      this.consumeNewlines();
    }

    this.consume(TokenType.CLOSE_BRACE, 'Expected } to close imports');
    return imports;
  }

  private parseImportPath(): string {
    if (this.check(TokenType.STRING)) {
      return this.advance().value;
    }
    
    // Handle unquoted paths
    const pathTokens: string[] = [];
    while (!this.checkAny([TokenType.AS, TokenType.NEWLINE, TokenType.CLOSE_BRACE]) && !this.isAtEnd()) {
      pathTokens.push(this.advance().value);
    }
    
    return pathTokens.join('');
  }

  private parseConfig(): ConfigBlock {
    this.consume(TokenType.OPEN_BRACE, 'Expected { after config');
    this.consumeNewlines();

    const settings: Record<string, any> = {};

    while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      const key = this.consume(TokenType.IDENTIFIER, 'Expected config key').value;
      this.consume(TokenType.COLON, 'Expected : after config key');
      
      const value = this.parseConfigValue();
      settings[key] = value;

      this.consumeNewlines();
    }

    this.consume(TokenType.CLOSE_BRACE, 'Expected } to close config');

    return {
      type: 'ConfigBlock',
      settings,
      location: this.currentLocation()
    };
  }

  private parseConfigValue(): any {
    if (this.check(TokenType.STRING)) {
      return this.advance().value;
    } else if (this.check(TokenType.NUMBER)) {
      return Number(this.advance().value);
    } else if (this.check(TokenType.BOOLEAN)) {
      return this.advance().value === 'true';
    } else {
      // Handle unquoted values
      return this.parseUntilNewline();
    }
  }

  private parseEntrypoints(): EntrypointDeclaration[] {
    const entrypoints: EntrypointDeclaration[] = [];
    
    this.consume(TokenType.OPEN_BRACE, 'Expected { after entrypoints');
    this.consumeNewlines();

    while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      const name = this.consume(TokenType.IDENTIFIER, 'Expected entrypoint name').value;
      this.consume(TokenType.COLON, 'Expected : after entrypoint name');
      
      const target = this.parseUntilNewline();

      entrypoints.push({
        type: 'EntrypointDeclaration',
        name,
        target,
        location: this.currentLocation()
      });

      this.consumeNewlines();
    }

    this.consume(TokenType.CLOSE_BRACE, 'Expected } to close entrypoints');
    return entrypoints;
  }

  private parseBuildConfig(): BuildConfig {
    this.consume(TokenType.OPEN_BRACE, 'Expected { after build');
    this.consumeNewlines();

    const config: BuildConfig = {
      type: 'BuildConfig',
      targets: [],
      options: {},
      location: this.currentLocation()
    };

    while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      const key = this.consume(TokenType.IDENTIFIER, 'Expected build config key').value;
      this.consume(TokenType.COLON, 'Expected : after build config key');

      switch (key) {
        case 'targets':
          config.targets = this.parseStringArray();
          break;
        default:
          config.options[key] = this.parseConfigValue();
      }

      this.consumeNewlines();
    }

    this.consume(TokenType.CLOSE_BRACE, 'Expected } to close build config');
    return config;
  }

  private parseStringArray(): string[] {
    const values: string[] = [];
    
    if (this.match(TokenType.OPEN_BRACE)) {
      // Array notation: ["value1", "value2"]
      while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
        if (this.match(TokenType.STRING)) {
          values.push(this.previous().value);
        }
        this.match(TokenType.COMMA);
        this.consumeNewlines();
      }
      this.consume(TokenType.CLOSE_BRACE, 'Expected ] to close array');
    } else {
      // Single value
      values.push(this.consume(TokenType.STRING, 'Expected string value').value);
    }

    return values;
  }

  private parseDependencies(): DependencyDeclaration {
    this.consume(TokenType.OPEN_BRACE, 'Expected { after dependencies');
    this.consumeNewlines();

    const deps: DependencyDeclaration = {
      type: 'DependencyDeclaration',
      location: this.currentLocation()
    };

    while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      const section = this.consume(TokenType.IDENTIFIER, 'Expected dependency section').value;
      this.consume(TokenType.COLON, 'Expected : after dependency section');
      this.consume(TokenType.OPEN_BRACE, 'Expected { to open dependency section');
      this.consumeNewlines();

      const items: Record<string, string> = {};

      while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
        if (this.match(TokenType.NEWLINE) || this.match(TokenType.COMMENT)) {
          continue;
        }

        const name = this.consume(TokenType.STRING, 'Expected dependency name').value;
        this.consume(TokenType.COLON, 'Expected : after dependency name');
        const version = this.consume(TokenType.STRING, 'Expected dependency version').value;
        
        items[name] = version;
        this.consumeNewlines();
      }

      this.consume(TokenType.CLOSE_BRACE, 'Expected } to close dependency section');

      if (section === 'external') {
        deps.external = items;
      } else if (section === 'ai_models') {
        deps.aiModels = items;
      }

      this.consumeNewlines();
    }

    this.consume(TokenType.CLOSE_BRACE, 'Expected } to close dependencies');
    return deps;
  }

  private parseDeployment(): DeploymentConfig {
    this.consume(TokenType.OPEN_BRACE, 'Expected { after deployment');
    this.consumeNewlines();

    const environments: Record<string, any> = {};

    while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      const envName = this.consume(TokenType.IDENTIFIER, 'Expected environment name').value;
      this.consume(TokenType.COLON, 'Expected : after environment name');
      this.consume(TokenType.OPEN_BRACE, 'Expected { to open environment config');
      this.consumeNewlines();

      const envConfig: Record<string, any> = {};

      while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
        if (this.match(TokenType.NEWLINE)) {
          continue;
        }

        const key = this.consume(TokenType.IDENTIFIER, 'Expected config key').value;
        this.consume(TokenType.COLON, 'Expected : after config key');
        
        envConfig[key] = this.parseConfigValue();
        this.consumeNewlines();
      }

      this.consume(TokenType.CLOSE_BRACE, 'Expected } to close environment config');
      environments[envName] = envConfig;
      this.consumeNewlines();
    }

    this.consume(TokenType.CLOSE_BRACE, 'Expected } to close deployment');

    return {
      type: 'DeploymentConfig',
      environments,
      location: this.currentLocation()
    };
  }

  private parseAIDirective(): AIDirective {
    const directiveToken = this.consume(TokenType.AI_DIRECTIVE, 'Expected AI directive');
    const directive = directiveToken.value.substring(1); // Remove @ prefix
    
    const parameters: Record<string, any> = {};
    
    // Parse the rest of the line as directive content
    const content = this.parseUntilNewline();
    if (content) {
      parameters.value = content;
    }

    return {
      type: 'AIDirective',
      directive,
      parameters,
      location: this.currentLocation()
    };
  }

  private parseUntilNewline(): string {
    const tokens: string[] = [];
    
    while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      tokens.push(this.advance().value);
    }
    
    return tokens.join(' ').trim();
  }

  private consumeNewlines(): void {
    while (this.match(TokenType.NEWLINE)) {
      // consume all newlines
    }
  }

  private checkAny(types: TokenType[]): boolean {
    return types.some(type => this.check(type));
  }
}