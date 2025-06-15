import { Token as IToken, TokenType, Position } from '../types';

export class Token implements IToken {
  constructor(
    public type: TokenType,
    public value: string,
    public position: Position,
    public raw?: string
  ) {}

  toString(): string {
    return `Token(${this.type}, ${this.value}, ${this.position.line}:${this.position.column})`;
  }
}
