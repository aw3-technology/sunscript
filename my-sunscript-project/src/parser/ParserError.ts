import { Position } from '../types';

export class ParserError extends Error {
  constructor(message: string, public position?: Position) {
    super(`Parser Error${position ? ` at ${position.line}:${position.column}` : ''}: ${message}`);
    this.name = 'ParserError';
  }
}
