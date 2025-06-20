import * as fs from 'fs/promises';
import * as path from 'path';
import { AIProvider } from '../ai/AIProvider';
import { CodeAnalyzer } from './CodeAnalyzer';
import { SunScriptGenerator } from './SunScriptGenerator';
import chalk from 'chalk';
import { glob } from 'glob';

export interface ReverseCompileOptions {
  inputDir: string;
  outputDir: string;
  aiProvider: AIProvider;
  includeComments?: boolean;
  preserveStructure?: boolean;
  language?: string;
}

export interface ReverseCompileResult {
  files: Map<string, string>;
  imports: string[];
  dependencies: Record<string, string>;
  projectStructure: ProjectStructure;
}

export interface ProjectStructure {
  name: string;
  type: 'library' | 'application' | 'component';
  entryPoints: string[];
  mainFeatures: string[];
  architecture: string;
}

export class ReverseCompiler {
  private analyzer: CodeAnalyzer;
  private generator: SunScriptGenerator;

  constructor(private aiProvider: AIProvider) {
    this.analyzer = new CodeAnalyzer(aiProvider);
    this.generator = new SunScriptGenerator(aiProvider);
  }

  async reverseCompile(options: ReverseCompileOptions): Promise<ReverseCompileResult> {
    const { inputDir, outputDir, includeComments = true, preserveStructure = true } = options;

    console.log(chalk.blue('🔍 Analyzing project structure...'));
    
    // Analyze the project structure
    const projectStructure = await this.analyzeProjectStructure(inputDir);
    
    console.log(chalk.cyan(`📊 Detected: ${projectStructure.type} - ${projectStructure.name}`));
    
    // Find all source files
    const sourceFiles = await this.findSourceFiles(inputDir);
    
    console.log(chalk.cyan(`📄 Found ${sourceFiles.length} source files`));
    
    // Analyze each file
    const analyzedFiles = new Map<string, any>();
    const dependencies = new Set<string>();
    
    for (const filePath of sourceFiles) {
      console.log(chalk.gray(`   Analyzing ${path.relative(inputDir, filePath)}...`));
      
      const analysis = await this.analyzer.analyzeFile(filePath);
      analyzedFiles.set(filePath, analysis);
      
      // Collect dependencies
      analysis.dependencies.forEach((dep: string) => dependencies.add(dep));
    }

    // Generate SunScript files
    console.log(chalk.blue('🌟 Generating SunScript code...'));
    
    const sunScriptFiles = new Map<string, string>();
    const imports: string[] = [];

    for (const [filePath, analysis] of analyzedFiles) {
      const relativePath = path.relative(inputDir, filePath);
      const sunPath = this.convertToSunPath(relativePath);
      
      console.log(chalk.gray(`   Generating ${sunPath}...`));
      
      const sunScriptCode = await this.generator.generateSunScript({
        analysis,
        originalPath: relativePath,
        projectStructure,
        includeComments
      });
      
      sunScriptFiles.set(sunPath, sunScriptCode);
      
      // Generate import statement
      if (analysis.isPublic) {
        imports.push(`${sunPath.replace('.sun', '')} as ${analysis.moduleName}`);
      }
    }

    // Write output files
    await this.writeOutputFiles(outputDir, sunScriptFiles, preserveStructure);

    return {
      files: sunScriptFiles,
      imports,
      dependencies: Object.fromEntries(Array.from(dependencies).map(dep => [dep, 'latest'])),
      projectStructure
    };
  }

  private async analyzeProjectStructure(inputDir: string): Promise<ProjectStructure> {
    // Look for package.json, setup.py, etc.
    const configFiles = await this.findConfigFiles(inputDir);
    
    // Use AI to analyze the project
    const prompt = `
    Analyze this project structure and determine:
    1. Project name
    2. Project type (library, application, or component)
    3. Main entry points
    4. Key features and functionality
    5. Overall architecture pattern

    Config files found: ${JSON.stringify(configFiles, null, 2)}
    
    Respond with JSON in this format:
    {
      "name": "project-name",
      "type": "library|application|component",
      "entryPoints": ["path1", "path2"],
      "mainFeatures": ["feature1", "feature2"],
      "architecture": "description"
    }
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'json',
        maxTokens: 500
      });
      
      return JSON.parse(response.code);
    } catch (error) {
      // Fallback to basic analysis
      return {
        name: path.basename(inputDir),
        type: 'application',
        entryPoints: ['index'],
        mainFeatures: ['main functionality'],
        architecture: 'standard'
      };
    }
  }

  private async findSourceFiles(inputDir: string): Promise<string[]> {
    const patterns = [
      '**/*.js',
      '**/*.ts',
      '**/*.jsx',
      '**/*.tsx',
      '**/*.py',
      '**/*.java',
      '**/*.go',
      '**/*.rs'
    ];

    const excludePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.test.*',
      '**/*.spec.*'
    ];

    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: inputDir,
        absolute: true,
        ignore: excludePatterns
      });
      allFiles.push(...files);
    }

    return Array.from(new Set(allFiles));
  }

  private async findConfigFiles(inputDir: string): Promise<Record<string, any>> {
    const configFiles = [
      'package.json',
      'setup.py',
      'requirements.txt',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'build.gradle'
    ];

    const configs: Record<string, any> = {};

    for (const configFile of configFiles) {
      try {
        const filePath = path.join(inputDir, configFile);
        const content = await fs.readFile(filePath, 'utf-8');
        
        if (configFile.endsWith('.json')) {
          configs[configFile] = JSON.parse(content);
        } else {
          configs[configFile] = content;
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    return configs;
  }

  private convertToSunPath(originalPath: string): string {
    // Convert file extensions to .sun
    const parsedPath = path.parse(originalPath);
    const sunPath = path.join(parsedPath.dir, parsedPath.name + '.sun');
    return sunPath.replace(/\\/g, '/'); // Normalize path separators
  }

  private async writeOutputFiles(
    outputDir: string, 
    files: Map<string, string>, 
    preserveStructure: boolean
  ): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });

    for (const [filePath, content] of files) {
      const fullPath = path.join(outputDir, filePath);
      
      if (preserveStructure) {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
      }
      
      await fs.writeFile(fullPath, content, 'utf-8');
    }
  }
}