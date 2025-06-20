import { Position } from './base';

export enum TokenType {
  // Keywords
  FUNCTION = 'FUNCTION',
  COMPONENT = 'COMPONENT',
  API = 'API',
  MODEL = 'MODEL',
  PIPELINE = 'PIPELINE',
  BEHAVIOR = 'BEHAVIOR',
  TEST = 'TEST',
  
  // Genesis-specific keywords
  PROJECT = 'PROJECT',
  VERSION = 'VERSION',
  AUTHOR = 'AUTHOR',
  SOURCE = 'SOURCE',
  OUTPUT = 'OUTPUT',
  IMPORTS = 'IMPORTS',
  CONFIG = 'CONFIG',
  ENTRYPOINTS = 'ENTRYPOINTS',
  BUILD = 'BUILD',
  DEPENDENCIES = 'DEPENDENCIES',
  DEPLOYMENT = 'DEPLOYMENT',
  AS = 'AS',
  
  // Control flow
  IF = 'IF',
  ELSE = 'ELSE',
  WHEN = 'WHEN',
  FOR = 'FOR',
  RETURN = 'RETURN',
  
  // Directives
  AI_DIRECTIVE = 'AI_DIRECTIVE',
  OPTIMIZE = 'OPTIMIZE',
  CONTEXT = 'CONTEXT',
  TARGETS = 'TARGETS',
  
  // Structure
  INDENT = 'INDENT',
  DEDENT = 'DEDENT',
  NEWLINE = 'NEWLINE',
  COLON = 'COLON',
  COMMA = 'COMMA',
  OPEN_BRACE = 'OPEN_BRACE',
  CLOSE_BRACE = 'CLOSE_BRACE',
  
  // Literals
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  TEXT = 'TEXT',
  IDENTIFIER = 'IDENTIFIER',
  
  // Special
  AI_QUESTION = 'AI_QUESTION',
  COMMENT = 'COMMENT',
  MARKDOWN_HEADER = 'MARKDOWN_HEADER',
  MARKDOWN_LIST = 'MARKDOWN_LIST',
  EOF = 'EOF'
}

export interface Token {
  type: TokenType;
  value: string;
  position: Position;
  raw?: string;
}
