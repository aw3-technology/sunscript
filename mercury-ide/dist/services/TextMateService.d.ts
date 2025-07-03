import { EventBus } from '../core/event-bus';
export interface IGrammar {
    name: string;
    scopeName: string;
    path: string;
    language: string;
    patterns: any[];
    repository: any;
}
export declare class TextMateService {
    private eventBus;
    private registry;
    private grammars;
    private isInitialized;
    constructor(eventBus: EventBus);
    initialize(): Promise<void>;
    private registerSunScriptGrammar;
    registerLanguage(languageId: string, grammar: IGrammar): Promise<void>;
    getGrammar(scopeName: string): Promise<any>;
    tokenizeLine(text: string, grammarScopeName: string): Promise<any[]>;
    getRegisteredGrammars(): string[];
    hasGrammar(scopeName: string): boolean;
}
