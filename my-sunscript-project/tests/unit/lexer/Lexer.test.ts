import { Lexer } from '../../../src/lexer/Lexer';
import { TokenType } from '../../../src/types';

describe('Lexer', () => {
  it('should tokenize a simple function', () => {
    const input = `function greet {
      say hello
    }`;
    
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();
    
    expect(tokens[0].type).toBe(TokenType.FUNCTION);
    expect(tokens[1].type).toBe(TokenType.TEXT);
    expect(tokens[1].value).toBe('greet');
  });
});
