import { SourceLocation } from './index';

export type ASTNodeType = 
  | 'Program'
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
  | 'Block';

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
  };
}

export interface FunctionDeclaration extends ASTNode {
  type: 'FunctionDeclaration';
  name: string;
  body: Statement[];
  metadata: FunctionMetadata;
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
