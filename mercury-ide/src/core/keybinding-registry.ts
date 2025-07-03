import { injectable, inject } from 'inversify';
import { TYPES } from './types';
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

@injectable()
export class KeybindingRegistry {
    private keybindings = new Map<string, Keybinding[]>();
    private activeContext = new Set<string>();
    
    constructor(
        @inject(TYPES.CommandRegistry) private commandRegistry: CommandRegistry,
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.initializeKeyListener();
    }
    
    private initializeKeyListener(): void {
        document.addEventListener('keydown', (event) => this.handleKeyEvent(event));
    }
    
    registerKeybinding(keybinding: Keybinding): void {
        const key = this.normalizeKeybinding(keybinding.keybinding);
        
        if (!this.keybindings.has(key)) {
            this.keybindings.set(key, []);
        }
        
        const bindings = this.keybindings.get(key)!;
        bindings.push(keybinding);
        
        // Sort by priority (higher priority first)
        bindings.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        
        this.eventBus.emit('keybinding.registered', { keybinding });
    }
    
    unregisterKeybinding(keybinding: string, command?: string): void {
        const key = this.normalizeKeybinding(keybinding);
        
        if (!command) {
            this.keybindings.delete(key);
        } else {
            const bindings = this.keybindings.get(key);
            if (bindings) {
                const filtered = bindings.filter(kb => kb.command !== command);
                if (filtered.length > 0) {
                    this.keybindings.set(key, filtered);
                } else {
                    this.keybindings.delete(key);
                }
            }
        }
        
        this.eventBus.emit('keybinding.unregistered', { keybinding, command });
    }
    
    private normalizeKeybinding(keybinding: string): string {
        // Normalize keybinding string (e.g., "Ctrl+S" -> "ctrl+s")
        return keybinding
            .toLowerCase()
            .replace(/\s+/g, '')
            .split('+')
            .sort((a, b) => {
                // Ensure modifiers come first in consistent order
                const order = ['ctrl', 'alt', 'shift', 'meta'];
                const aIndex = order.indexOf(a);
                const bIndex = order.indexOf(b);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            })
            .join('+');
    }
    
    private handleKeyEvent(event: KeyboardEvent): void {
        // Don't handle if in input/textarea
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }
        
        const keyCode = this.eventToKeyCode(event);
        const key = this.keyCodeToString(keyCode);
        
        const bindings = this.keybindings.get(key);
        if (!bindings) return;
        
        // Find the first matching keybinding that satisfies the when clause
        for (const binding of bindings) {
            if (this.evaluateWhenClause(binding.when)) {
                event.preventDefault();
                event.stopPropagation();
                
                this.commandRegistry.executeCommand(binding.command, ...(binding.args || []));
                break;
            }
        }
    }
    
    private eventToKeyCode(event: KeyboardEvent): KeyCode {
        return {
            key: event.key.toLowerCase(),
            ctrl: event.ctrlKey || event.metaKey, // Treat Cmd as Ctrl on Mac
            shift: event.shiftKey,
            alt: event.altKey,
            meta: event.metaKey
        };
    }
    
    private keyCodeToString(keyCode: KeyCode): string {
        const parts: string[] = [];
        
        if (keyCode.ctrl) parts.push('ctrl');
        if (keyCode.alt) parts.push('alt');
        if (keyCode.shift) parts.push('shift');
        if (keyCode.meta && !keyCode.ctrl) parts.push('meta'); // Only if not already using Ctrl
        
        parts.push(keyCode.key);
        
        return parts.join('+');
    }
    
    setContext(context: string, value: boolean): void {
        if (value) {
            this.activeContext.add(context);
        } else {
            this.activeContext.delete(context);
        }
        
        this.eventBus.emit('context.changed', { context, value });
    }
    
    private evaluateWhenClause(when?: string): boolean {
        if (!when) return true;
        
        // Simple when clause evaluation
        // Supports: contextName, !contextName, contextName && otherContext, contextName || otherContext
        const tokens = when.split(/\s*(&&|\|\|)\s*/);
        let result = this.evaluateSimpleContext(tokens[0]);
        
        for (let i = 1; i < tokens.length; i += 2) {
            const operator = tokens[i];
            const context = tokens[i + 1];
            const contextValue = this.evaluateSimpleContext(context);
            
            if (operator === '&&') {
                result = result && contextValue;
            } else if (operator === '||') {
                result = result || contextValue;
            }
        }
        
        return result;
    }
    
    private evaluateSimpleContext(context: string): boolean {
        const trimmed = context.trim();
        if (trimmed.startsWith('!')) {
            return !this.activeContext.has(trimmed.substring(1));
        }
        return this.activeContext.has(trimmed);
    }
    
    getKeybindingsForCommand(commandId: string): Keybinding[] {
        const result: Keybinding[] = [];
        
        for (const bindings of this.keybindings.values()) {
            result.push(...bindings.filter(kb => kb.command === commandId));
        }
        
        return result;
    }
    
    getAllKeybindings(): Map<string, Keybinding[]> {
        return new Map(this.keybindings);
    }
}