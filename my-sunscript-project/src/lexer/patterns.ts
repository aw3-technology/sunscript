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
  openBracket: /^\[/,
  closeBracket: /^\]/,
  openParen: /^\(/,
  closeParen: /^\)/,
  colon: /^:/,
  comma: /^,/,
  dot: /^\./,
  slash: /^\//,
  equals: /^=/,
  arrow: /^->/,
  fatArrow: /^=>/,
  lessThan: /^</,
  greaterThan: /^>/,
  selfClosing: /^\/>/,
  templateDirective: /^{#(if|else|for|\/if|\/for)}/,
  jsxExpressionStart: /^{/,
  jsxExpressionEnd: /^}/,
  attributeName: /^[a-zA-Z][a-zA-Z0-9-:]*/,
  tagName: /^[a-zA-Z][a-zA-Z0-9-]*/,
  markdown: {
    header: /^#{1,6}\s+.*/,
    listItem: /^-\s+.*/
  }
};

export const keywords = new Map<string, string>([
  // Core keywords
  ['function', 'FUNCTION'],
  ['component', 'COMPONENT'],
  ['api', 'API'],
  ['model', 'MODEL'],
  ['pipeline', 'PIPELINE'],
  ['behavior', 'BEHAVIOR'],
  ['test', 'TEST'],
  ['app', 'APP'],
  
  // Import/Export
  ['import', 'IMPORT'],
  ['from', 'FROM'],
  ['export', 'EXPORT'],
  ['default', 'DEFAULT'],
  
  // Component keywords
  ['state', 'STATE'],
  ['routes', 'ROUTES'],
  ['styles', 'STYLES'],
  ['render', 'RENDER'],
  ['html', 'HTML'],
  
  // Control flow
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
