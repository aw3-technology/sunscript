import { SourceLocation } from './index';

export type ASTNodeType = 
  | 'Program'
  | 'GenesisProgram'
  | 'FunctionDeclaration'
  | 'ComponentDeclaration'
  | 'APIDeclaration'
  | 'ModelDeclaration'
  | 'PipelineDeclaration'
  | 'BehaviorDeclaration'
  | 'TestDeclaration'
  | 'ExpressionStatement'
  | 'NaturalLanguageExpression'
  | 'AIDirective'
  | 'Block'
  | 'ImportDeclaration'
  | 'ConfigBlock'
  | 'EntrypointDeclaration'
  | 'BuildConfig'
  | 'DependencyDeclaration'
  | 'DeploymentConfig';

export interface ASTNode {
  type: ASTNodeType;
  location?: SourceLocation;
  parent?: ASTNode;
}

export interface Program extends ASTNode {
  type: 'Program';
  body: ASTNode[];
  metadata: {
    version: string;
    context?: string;
    parseErrors?: any[];
  };
}

export interface FunctionDeclaration extends ASTNode {
  type: 'FunctionDeclaration';
  name: string;
  body: Statement[];
  metadata: FunctionMetadata;
}

export interface ComponentDeclaration extends ASTNode {
  type: 'ComponentDeclaration';
  name: string;
  body: Statement[];
  metadata: ComponentMetadata;
}

export interface APIDeclaration extends ASTNode {
  type: 'APIDeclaration';
  name: string;
  endpoints: EndpointDefinition[];
  metadata: APIMetadata;
}

export interface ComponentMetadata {
  description?: string;
  props?: ParameterDefinition[];
  aiQuestions?: string[];
  directives?: AIDirective[];
}

export interface APIMetadata {
  description?: string;
  version?: string;
  aiQuestions?: string[];
  directives?: AIDirective[];
}

export interface EndpointDefinition {
  method: string;
  path: string;
  description?: string;
}

export interface FunctionMetadata {
  description?: string;
  parameters?: ParameterDefinition[];
  returns?: string;
  aiQuestions?: string[];
  directives?: AIDirective[];
  tests?: TestDeclaration[];
}

export interface ParameterDefinition {
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
  default?: any;
}

export interface Statement extends ASTNode {
  // Base for all statements
}

export interface ExpressionStatement extends Statement {
  type: 'ExpressionStatement';
  expression: Expression;
}

export interface Expression extends ASTNode {
  // Base for all expressions
}

export interface NaturalLanguageExpression extends Expression {
  type: 'NaturalLanguageExpression';
  text: string;
  intent?: string;
}

export interface AIDirective extends ASTNode {
  type: 'AIDirective';
  directive: string;
  parameters?: Record<string, any>;
}

export interface TestDeclaration extends ASTNode {
  type: 'TestDeclaration';
  name: string;
  body: Statement[];
}

// Genesis-specific AST nodes
export interface GenesisProgram extends ASTNode {
  type: 'GenesisProgram';
  projectName: string;
  version: string;
  author?: string;
  sourceDir: string;
  outputDir: string;
  description?: string;
  imports: ImportDeclaration[];
  config?: ConfigBlock;
  entrypoints?: EntrypointDeclaration[];
  buildConfig?: BuildConfig;
  dependencies?: DependencyDeclaration;
  deployment?: DeploymentConfig;
  globalDirectives?: AIDirective[];
}

export interface ImportDeclaration extends ASTNode {
  type: 'ImportDeclaration';
  path: string;
  alias?: string;
}

export interface ConfigBlock extends ASTNode {
  type: 'ConfigBlock';
  settings: Record<string, any>;
}

export interface EntrypointDeclaration extends ASTNode {
  type: 'EntrypointDeclaration';
  name: string;
  target: string;
}

export interface BuildConfig extends ASTNode {
  type: 'BuildConfig';
  targets: string[];
  options: Record<string, any>;
}

export interface DependencyDeclaration extends ASTNode {
  type: 'DependencyDeclaration';
  external?: Record<string, string>;
  aiModels?: Record<string, string>;
}

export interface DeploymentConfig extends ASTNode {
  type: 'DeploymentConfig';
  environments: Record<string, DeploymentEnvironment>;
}

export interface DeploymentEnvironment {
  url: string;
  branch?: string;
  ssl?: boolean;
  cdn?: boolean;
  [key: string]: any;
}
