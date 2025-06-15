import { Position } from '../types';

export class LexerError extends Error {
  constructor(message: string, public position: Position) {
    super(`Lexer Error at ${position.line}:${position.column}: ${message}`);
    this.name = 'LexerError';
  }
}
