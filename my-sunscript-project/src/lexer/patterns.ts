export const patterns = {
  whitespace: /^[ \t]+/,
  newline: /^\n/,
  comment: /^\/\/.*$/m,
  aiQuestion: /^\?\?/,
  directive: /^@[a-zA-Z]+/,
  number: /^\d+(\.\d+)?/,
  string: /^["']([^"'\\]|\\.)*["']/,
  identifier: /^[a-zA-Z_][a-zA-Z0-9_]*/,
  openBrace: /^\{/,
  closeBrace: /^\}/,
  colon: /^:/,
  markdown: {
    header: /^#{1,6}\s+.*/,
    listItem: /^-\s+.*/
  }
};
