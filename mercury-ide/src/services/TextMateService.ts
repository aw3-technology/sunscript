import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import * as monaco from 'monaco-editor';
import { loadWASM } from 'onigasm';
import { Registry as TextMateRegistry } from 'vscode-textmate';

export interface IGrammar {
    name: string;
    scopeName: string;
    path: string;
    language: string;
    patterns: any[];
    repository: any;
}

@injectable()
export class TextMateService {
    private registry: TextMateRegistry | null = null;
    private grammars = new Map<string, IGrammar>();
    private isInitialized = false;
    
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {}
    
    async initialize(): Promise<void> {
        try {
            // Load the onigasm WebAssembly for regex support
            await loadWASM(require('../assets/onigasm.wasm'));
            
            // Create TextMate registry
            this.registry = new TextMateRegistry({
                onigLib: Promise.resolve({
                    createOnigScanner: (patterns: string[]) => new (window as any).OnigScanner(patterns),
                    createOnigString: (s: string) => new (window as any).OnigString(s)
                }),
                loadGrammar: async (scopeName: string) => {
                    const grammar = this.grammars.get(scopeName);
                    if (!grammar) return null;
                    
                    return grammar;
                }
            });
            
            // Register built-in SunScript grammar
            await this.registerSunScriptGrammar();
            
            this.isInitialized = true;
            this.eventBus.emit('textmate.initialized');
            
        } catch (error) {
            console.error('Failed to initialize TextMate service:', error);
            throw error;
        }
    }
    
    private async registerSunScriptGrammar(): Promise<void> {
        const sunscriptGrammar: IGrammar = {
            name: 'SunScript',
            scopeName: 'source.sunscript',
            path: '',
            language: 'sunscript',
            patterns: [
                {
                    include: '#comments'
                },
                {
                    include: '#decorators'
                },
                {
                    include: '#keywords'
                },
                {
                    include: '#strings'
                },
                {
                    include: '#numbers'
                },
                {
                    include: '#functions'
                },
                {
                    include: '#variables'
                },
                {
                    include: '#operators'
                }
            ],
            repository: {
                comments: {
                    patterns: [
                        {
                            name: 'comment.line.double-slash.sunscript',
                            match: '//.*$'
                        },
                        {
                            name: 'comment.block.sunscript',
                            begin: '/\\*',
                            end: '\\*/',
                            patterns: [
                                {
                                    name: 'comment.block.documentation.sunscript',
                                    match: '\\*.*'
                                }
                            ]
                        }
                    ]
                },
                decorators: {
                    patterns: [
                        {
                            name: 'storage.type.annotation.sunscript',
                            match: '@(task|component|service|api|route|middleware|auth|public|private|protected|override|syntax|model|schema|validation|inject)\\b'
                        },
                        {
                            name: 'storage.type.annotation.sunscript',
                            match: '@\\w+'
                        }
                    ]
                },
                keywords: {
                    patterns: [
                        {
                            name: 'keyword.control.sunscript',
                            match: '\\b(if|else|for|while|do|break|continue|return|try|catch|finally|throw)\\b'
                        },
                        {
                            name: 'keyword.other.sunscript',
                            match: '\\b(import|export|from|as|default|async|await|yield)\\b'
                        },
                        {
                            name: 'storage.type.sunscript',
                            match: '\\b(const|let|var|function|class|interface|type|enum|namespace)\\b'
                        },
                        {
                            name: 'storage.modifier.sunscript',
                            match: '\\b(public|private|protected|static|readonly|abstract)\\b'
                        },
                        {
                            name: 'constant.language.sunscript',
                            match: '\\b(true|false|null|undefined|this|super)\\b'
                        }
                    ]
                },
                strings: {
                    patterns: [
                        {
                            name: 'string.quoted.double.sunscript',
                            begin: '"',
                            end: '"',
                            patterns: [
                                {
                                    name: 'constant.character.escape.sunscript',
                                    match: '\\\\.'
                                }
                            ]
                        },
                        {
                            name: 'string.quoted.single.sunscript',
                            begin: "'",
                            end: "'",
                            patterns: [
                                {
                                    name: 'constant.character.escape.sunscript',
                                    match: '\\\\.'
                                }
                            ]
                        },
                        {
                            name: 'string.template.sunscript',
                            begin: '`',
                            end: '`',
                            patterns: [
                                {
                                    name: 'meta.embedded.expression.sunscript',
                                    begin: '\\$\\{',
                                    end: '\\}',
                                    patterns: [
                                        {
                                            include: '$self'
                                        }
                                    ]
                                },
                                {
                                    name: 'constant.character.escape.sunscript',
                                    match: '\\\\.'
                                }
                            ]
                        }
                    ]
                },
                numbers: {
                    patterns: [
                        {
                            name: 'constant.numeric.hex.sunscript',
                            match: '\\b0[xX][0-9a-fA-F]+\\b'
                        },
                        {
                            name: 'constant.numeric.binary.sunscript',
                            match: '\\b0[bB][01]+\\b'
                        },
                        {
                            name: 'constant.numeric.octal.sunscript',
                            match: '\\b0[oO][0-7]+\\b'
                        },
                        {
                            name: 'constant.numeric.decimal.sunscript',
                            match: '\\b\\d+(\\.\\d+)?([eE][+-]?\\d+)?\\b'
                        }
                    ]
                },
                functions: {
                    patterns: [
                        {
                            name: 'meta.function.sunscript',
                            begin: '\\b(function)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\(',
                            beginCaptures: {
                                1: { name: 'storage.type.function.sunscript' },
                                2: { name: 'entity.name.function.sunscript' }
                            },
                            end: '\\)',
                            patterns: [
                                {
                                    include: '#function-parameters'
                                }
                            ]
                        },
                        {
                            name: 'meta.method.sunscript',
                            begin: '\\b([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\(',
                            beginCaptures: {
                                1: { name: 'entity.name.function.sunscript' }
                            },
                            end: '\\)',
                            patterns: [
                                {
                                    include: '#function-parameters'
                                }
                            ]
                        }
                    ]
                },
                'function-parameters': {
                    patterns: [
                        {
                            name: 'variable.parameter.sunscript',
                            match: '\\b[a-zA-Z_$][a-zA-Z0-9_$]*\\b'
                        },
                        {
                            include: '#strings'
                        },
                        {
                            include: '#numbers'
                        }
                    ]
                },
                variables: {
                    patterns: [
                        {
                            name: 'variable.other.constant.sunscript',
                            match: '\\b[A-Z][A-Z0-9_]*\\b'
                        },
                        {
                            name: 'variable.other.sunscript',
                            match: '\\b[a-zA-Z_$][a-zA-Z0-9_$]*\\b'
                        }
                    ]
                },
                operators: {
                    patterns: [
                        {
                            name: 'keyword.operator.assignment.sunscript',
                            match: '(=|\\+=|\\-=|\\*=|\\/=|%=|\\|=|&=|\\^=|<<=|>>=|>>>=)'
                        },
                        {
                            name: 'keyword.operator.comparison.sunscript',
                            match: '(==|!=|===|!==|<=|>=|<|>)'
                        },
                        {
                            name: 'keyword.operator.logical.sunscript',
                            match: '(&&|\\|\\||!)'
                        },
                        {
                            name: 'keyword.operator.arithmetic.sunscript',
                            match: '(\\+|\\-|\\*|\\/|%|\\+\\+|\\-\\-)'
                        },
                        {
                            name: 'keyword.operator.bitwise.sunscript',
                            match: '(&|\\||\\^|~|<<|>>|>>>)'
                        }
                    ]
                }
            }
        };
        
        this.grammars.set('source.sunscript', sunscriptGrammar);
    }
    
    async registerLanguage(languageId: string, grammar: IGrammar): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        this.grammars.set(grammar.scopeName, grammar);
        
        // Register with Monaco
        if (!monaco.languages.getLanguages().find(lang => lang.id === languageId)) {
            monaco.languages.register({
                id: languageId,
                extensions: ['.sun'],
                aliases: ['SunScript', 'sunscript'],
                mimetypes: ['text/sunscript']
            });
        }
        
        this.eventBus.emit('textmate.grammarRegistered', { languageId, grammar });
    }
    
    async getGrammar(scopeName: string): Promise<any> {
        if (!this.registry) return null;
        
        try {
            return await this.registry.loadGrammar(scopeName);
        } catch (error) {
            console.error('Failed to load grammar:', error);
            return null;
        }
    }
    
    async tokenizeLine(text: string, grammarScopeName: string): Promise<any[]> {
        const grammar = await this.getGrammar(grammarScopeName);
        if (!grammar) return [];
        
        try {
            const result = grammar.tokenizeLine(text);
            return result.tokens;
        } catch (error) {
            console.error('Failed to tokenize line:', error);
            return [];
        }
    }
    
    getRegisteredGrammars(): string[] {
        return Array.from(this.grammars.keys());
    }
    
    hasGrammar(scopeName: string): boolean {
        return this.grammars.has(scopeName);
    }
}