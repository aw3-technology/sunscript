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
  | 'AppDeclaration'
  | 'ExpressionStatement'
  | 'NaturalLanguageExpression'
  | 'AIDirective'
  | 'AICompileBlock'
  | 'Block'
  | 'ImportStatement'
  | 'ImportDeclaration'
  | 'ExportStatement'
  | 'StateDeclaration'
  | 'RoutesDeclaration'
  | 'StylesDeclaration'
  | 'RenderStatement'
  | 'JSXElement'
  | 'JSXAttribute'
  | 'JSXExpression'
  | 'JSXText'
  | 'TemplateDirective'
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
    syntaxMode?: 'standard' | 'flex';
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

// New AST nodes for advanced syntax
export interface AppDeclaration extends ASTNode {
  type: 'AppDeclaration';
  name: string;
  body: Statement[];
  metadata: AppMetadata;
}

export interface AppMetadata {
  title?: string;
  description?: string;
  pages?: PageDefinition[];
  routes?: Record<string, RouteDefinition>;
  config?: Record<string, any>;
  directives?: AIDirective[];
}

export interface PageDefinition {
  path: string;
  component: string;
  title?: string;
  protected?: boolean;
}

export interface RouteDefinition {
  component?: string;
  redirect?: string;
  action?: string;
}

export interface ImportStatement extends ASTNode {
  type: 'ImportStatement';
  specifiers: ImportSpecifier[];
  source: string;
}

export interface ImportSpecifier {
  type: 'ImportDefaultSpecifier' | 'ImportSpecifier' | 'ImportNamespaceSpecifier';
  local: string;
  imported?: string;
}

export interface ExportStatement extends ASTNode {
  type: 'ExportStatement';
  declaration?: ASTNode;
  specifiers?: ExportSpecifier[];
  source?: string;
  default?: boolean;
}

export interface ExportSpecifier {
  local: string;
  exported: string;
}

export interface StateDeclaration extends ASTNode {
  type: 'StateDeclaration';
  properties: StateProperty[];
}

export interface StateProperty {
  name: string;
  type?: string;
  initialValue?: any;
}

export interface RoutesDeclaration extends ASTNode {
  type: 'RoutesDeclaration';
  routes: RouteEntry[];
}

export interface RouteEntry {
  path: string;
  component: string;
  guards?: string[];
}

export interface StylesDeclaration extends ASTNode {
  type: 'StylesDeclaration';
  rules: StyleRule[];
}

export interface StyleRule {
  selector: string;
  declarations: StyleDeclaration[];
}

export interface StyleDeclaration {
  property: string;
  value: string;
}

export interface RenderStatement extends ASTNode {
  type: 'RenderStatement';
  renderType: 'html' | 'json' | 'text';
  body: JSXElement | Expression;
}

export interface JSXElement extends ASTNode {
  type: 'JSXElement';
  openingElement: JSXOpeningElement;
  closingElement?: JSXClosingElement;
  children: (JSXElement | JSXExpression | JSXText)[];
  selfClosing?: boolean;
}

export interface JSXOpeningElement {
  name: string;
  attributes: JSXAttribute[];
}

export interface JSXClosingElement {
  name: string;
}

export interface JSXAttribute extends ASTNode {
  type: 'JSXAttribute';
  name: string;
  value?: JSXAttributeValue;
}

export type JSXAttributeValue = string | JSXExpression | boolean;

export interface JSXExpression extends ASTNode {
  type: 'JSXExpression';
  expression: Expression | string;
}

export interface JSXText extends ASTNode {
  type: 'JSXText';
  value: string;
}

export interface TemplateDirective extends ASTNode {
  type: 'TemplateDirective';
  directive: 'if' | 'else' | 'for' | 'each';
  condition?: Expression;
  iterator?: IteratorDefinition;
  body: (JSXElement | JSXExpression | JSXText | TemplateDirective)[];
  alternate?: (JSXElement | JSXExpression | JSXText | TemplateDirective)[];
}

export interface IteratorDefinition {
  variable: string;
  iterable: Expression;
  index?: string;
}

// AI Compilation Block
export interface AICompileBlock extends ASTNode {
  type: 'AICompileBlock';
  description: string;
  context?: string;
  constraints?: string[];
  targetLanguage?: string;
  inline?: boolean;
}
