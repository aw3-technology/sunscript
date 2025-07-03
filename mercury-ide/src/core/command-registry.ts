import { injectable, inject } from 'inversify';
import { TYPES } from './types';
import { EventBus } from './event-bus';

export interface Command {
    id: string;
    label?: string;
    iconClass?: string;
    category?: string;
    description?: string;
    when?: string;
    isEnabled?: () => boolean;
    isVisible?: () => boolean;
    isToggled?: () => boolean;
}

export interface CommandHandler {
    execute(...args: any[]): any;
    isEnabled?(...args: any[]): boolean;
    isVisible?(...args: any[]): boolean;
    isToggled?(...args: any[]): boolean;
}

@injectable()
export class CommandRegistry {
    private commands = new Map<string, Command>();
    private handlers = new Map<string, CommandHandler>();
    
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {}
    
    registerCommand(command: Command, handler: CommandHandler): void {
        if (this.commands.has(command.id)) {
            console.warn(`Command ${command.id} is already registered`);
            return;
        }
        
        this.commands.set(command.id, command);
        this.handlers.set(command.id, handler);
        
        this.eventBus.emit('command.registered', { commandId: command.id });
    }
    
    unregisterCommand(commandId: string): void {
        this.commands.delete(commandId);
        this.handlers.delete(commandId);
        
        this.eventBus.emit('command.unregistered', { commandId });
    }
    
    async executeCommand(commandId: string, ...args: any[]): Promise<any> {
        const handler = this.handlers.get(commandId);
        if (!handler) {
            throw new Error(`Command ${commandId} is not registered`);
        }
        
        if (handler.isEnabled && !handler.isEnabled(...args)) {
            throw new Error(`Command ${commandId} is not enabled`);
        }
        
        this.eventBus.emit('command.willExecute', { commandId, args });
        
        try {
            const result = await handler.execute(...args);
            this.eventBus.emit('command.executed', { commandId, args, result });
            return result;
        } catch (error) {
            this.eventBus.emit('command.failed', { commandId, args, error });
            throw error;
        }
    }
    
    getCommand(commandId: string): Command | undefined {
        return this.commands.get(commandId);
    }
    
    getCommands(): Command[] {
        return Array.from(this.commands.values());
    }
    
    isEnabled(commandId: string, ...args: any[]): boolean {
        const handler = this.handlers.get(commandId);
        if (!handler) {
            return false;
        }
        
        return handler.isEnabled ? handler.isEnabled(...args) : true;
    }
    
    isVisible(commandId: string, ...args: any[]): boolean {
        const handler = this.handlers.get(commandId);
        if (!handler) {
            return false;
        }
        
        return handler.isVisible ? handler.isVisible(...args) : true;
    }
    
    isToggled(commandId: string, ...args: any[]): boolean {
        const handler = this.handlers.get(commandId);
        if (!handler) {
            return false;
        }
        
        return handler.isToggled ? handler.isToggled(...args) : false;
    }
}