import * as monaco from 'monaco-editor';

export function registerSunScriptLanguage(): void {
    // Register the SunScript language
    monaco.languages.register({ id: 'sunscript' });
    
    // Set language configuration
    monaco.languages.setLanguageConfiguration('sunscript', {
        comments: {
            lineComment: '//',
            blockComment: ['/*', '*/']
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
            { open: '`', close: '`' }
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
            { open: '`', close: '`' }
        ]
    });
    
    // Define tokens for syntax highlighting
    monaco.languages.setMonarchTokensProvider('sunscript', {
        keywords: [
            'task', 'project', 'component', 'service', 'api', 'database',
            'import', 'export', 'from', 'as', 'if', 'else', 'for', 'while',
            'return', 'async', 'await', 'function', 'const', 'let', 'var',
            'class', 'extends', 'implements', 'interface', 'type', 'enum'
        ],
        
        decorators: [
            '@task', '@component', '@service', '@api', '@route', '@middleware',
            '@auth', '@public', '@private', '@protected', '@override',
            '@syntax', '@model', '@schema', '@validation', '@inject'
        ],
        
        operators: [
            '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
            '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^',
            '%', '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=',
            '^=', '%=', '<<=', '>>=', '>>>='
        ],
        
        symbols: /[=><!~?:&|+\-*\/\^%]+/,
        
        tokenizer: {
            root: [
                // Decorators
                [/@\w+/, 'annotation'],
                
                // Identifiers and keywords
                [/[a-zA-Z_]\w*/, {
                    cases: {
                        '@keywords': 'keyword',
                        '@default': 'identifier'
                    }
                }],
                
                // Whitespace
                { include: '@whitespace' },
                
                // Numbers
                [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
                [/0[xX][0-9a-fA-F]+/, 'number.hex'],
                [/\d+/, 'number'],
                
                // Delimiters
                [/[{}()\[\]]/, '@brackets'],
                [/[;,.]/, 'delimiter'],
                
                // Strings
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/'([^'\\]|\\.)*$/, 'string.invalid'],
                [/"/, 'string', '@string_double'],
                [/'/, 'string', '@string_single'],
                [/`/, 'string', '@string_backtick'],
                
                // Operators
                [/@symbols/, {
                    cases: {
                        '@operators': 'operator',
                        '@default': ''
                    }
                }]
            ],
            
            whitespace: [
                [/[ \t\r\n]+/, ''],
                [/\/\*/, 'comment', '@comment'],
                [/\/\/.*$/, 'comment']
            ],
            
            comment: [
                [/[^\/*]+/, 'comment'],
                [/\*\//, 'comment', '@pop'],
                [/[\/*]/, 'comment']
            ],
            
            string_double: [
                [/[^\\"]+/, 'string'],
                [/\\./, 'string.escape'],
                [/"/, 'string', '@pop']
            ],
            
            string_single: [
                [/[^\\']+/, 'string'],
                [/\\./, 'string.escape'],
                [/'/, 'string', '@pop']
            ],
            
            string_backtick: [
                [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
                [/[^\\`$]+/, 'string'],
                [/\\./, 'string.escape'],
                [/`/, 'string', '@pop']
            ],
            
            bracketCounting: [
                [/\{/, 'delimiter.bracket', '@bracketCounting'],
                [/\}/, 'delimiter.bracket', '@pop'],
                { include: 'root' }
            ]
        }
    });
    
    // Define a dark theme for SunScript
    monaco.editor.defineTheme('sunscript-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'annotation', foreground: 'ffd700' },
            { token: 'keyword', foreground: '569cd6' },
            { token: 'identifier', foreground: '9cdcfe' },
            { token: 'string', foreground: 'ce9178' },
            { token: 'number', foreground: 'b5cea8' },
            { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
            { token: 'operator', foreground: 'd4d4d4' }
        ],
        colors: {
            'editor.background': '#1e1e1e'
        }
    });
}