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
  comma: /^,/,
  dot: /^\./,
  slash: /^\//,
  markdown: {
    header: /^#{1,6}\s+.*/,
    listItem: /^-\s+.*/
  }
};

export const keywords = new Map<string, string>([
  // Existing keywords
  ['function', 'FUNCTION'],
  ['component', 'COMPONENT'],
  ['api', 'API'],
  ['model', 'MODEL'],
  ['pipeline', 'PIPELINE'],
  ['behavior', 'BEHAVIOR'],
  ['test', 'TEST'],
  ['if', 'IF'],
  ['else', 'ELSE'],
  ['when', 'WHEN'],
  ['for', 'FOR'],
  ['return', 'RETURN'],
  
  // Genesis keywords
  ['project', 'PROJECT'],
  ['version', 'VERSION'],
  ['author', 'AUTHOR'],
  ['source', 'SOURCE'],
  ['output', 'OUTPUT'],
  ['imports', 'IMPORTS'],
  ['config', 'CONFIG'],
  ['entrypoints', 'ENTRYPOINTS'],
  ['build', 'BUILD'],
  ['dependencies', 'DEPENDENCIES'],
  ['deployment', 'DEPLOYMENT'],
  ['as', 'AS']
]);
