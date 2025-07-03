import { CommandRegistry } from './command-registry';
import { EventBus } from './event-bus';
export interface Keybinding {
    keybinding: string;
    command: string;
    args?: any[];
    when?: string;
    priority?: number;
}
export interface KeyCode {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
}
export declare class KeybindingRegistry {
    private commandRegistry;
    private eventBus;
    private keybindings;
    private activeContext;
    constructor(commandRegistry: CommandRegistry, eventBus: EventBus);
    private initializeKeyListener;
    registerKeybinding(keybinding: Keybinding): void;
    unregisterKeybinding(keybinding: string, command?: string): void;
    private normalizeKeybinding;
    private handleKeyEvent;
    private eventToKeyCode;
    private keyCodeToString;
    setContext(context: string, value: boolean): void;
    private evaluateWhenClause;
    private evaluateSimpleContext;
    getKeybindingsForCommand(commandId: string): Keybinding[];
    getAllKeybindings(): Map<string, Keybinding[]>;
}
