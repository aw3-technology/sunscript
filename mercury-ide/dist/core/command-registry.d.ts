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
export declare class CommandRegistry {
    private eventBus;
    private commands;
    private handlers;
    constructor(eventBus: EventBus);
    registerCommand(command: Command, handler: CommandHandler): void;
    unregisterCommand(commandId: string): void;
    executeCommand(commandId: string, ...args: any[]): Promise<any>;
    getCommand(commandId: string): Command | undefined;
    getCommands(): Command[];
    isEnabled(commandId: string, ...args: any[]): boolean;
    isVisible(commandId: string, ...args: any[]): boolean;
    isToggled(commandId: string, ...args: any[]): boolean;
}
