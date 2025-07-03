import { EventBus } from '../core/event-bus';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { ChildProcess } from 'child_process';
export interface TerminalInstance {
    id: string;
    name: string;
    terminal: Terminal;
    fitAddon: FitAddon;
    element: HTMLElement;
    isActive: boolean;
    cwd: string;
    process?: ChildProcess;
    isConnected: boolean;
    commandBuffer: string;
    commandHistory: string[];
    historyIndex: number;
}
export interface ProcessOptions {
    cwd?: string;
    env?: Record<string, string>;
    shell?: string;
}
export declare class TerminalService {
    private eventBus;
    private terminals;
    private activeTerminalId;
    private nextTerminalId;
    private defaultShell;
    private defaultCwd;
    constructor(eventBus: EventBus);
    private getDefaultShell;
    private setupEventListeners;
    createTerminal(options?: ProcessOptions): string;
    private startShellProcess;
    private setupTerminalHandlers;
    private handleTerminalInput;
    private navigateHistory;
    private sendSignal;
    private resizeProcess;
    runCommand(terminalId: string, command: string, options?: ProcessOptions): Promise<void>;
    runScript(terminalId: string, scriptPath: string, args?: string[]): Promise<void>;
    changeDirectory(terminalId: string, newCwd: string): void;
    restartTerminal(terminalId: string): void;
    mountTerminal(terminalId: string, container: HTMLElement): boolean;
    setActiveTerminal(terminalId: string): void;
    closeTerminal(terminalId: string): void;
    getTerminals(): TerminalInstance[];
    getActiveTerminal(): TerminalInstance | null;
    writeToTerminal(terminalId: string, data: string): void;
    resizeTerminal(terminalId: string): void;
    clearTerminal(terminalId: string): void;
    splitTerminal(terminalId: string): string;
    getTerminalInfo(terminalId: string): any;
    closeAllTerminals(): void;
    restartAllTerminals(): void;
}
