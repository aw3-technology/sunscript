import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { spawn, exec, ChildProcess } from 'child_process';
import * as os from 'os';
import * as path from 'path';

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

@injectable()
export class TerminalService {
    private terminals = new Map<string, TerminalInstance>();
    private activeTerminalId: string | null = null;
    private nextTerminalId = 1;
    private defaultShell: string;
    private defaultCwd: string;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.defaultShell = this.getDefaultShell();
        this.defaultCwd = process.cwd();
        this.setupEventListeners();
    }

    private getDefaultShell(): string {
        // Determine default shell based on platform
        const platform = os.platform();
        
        if (platform === 'win32') {
            return process.env.COMSPEC || 'cmd.exe';
        } else {
            return process.env.SHELL || '/bin/bash';
        }
    }

    private setupEventListeners(): void {
        this.eventBus.on('terminal.create', () => {
            this.createTerminal();
        });

        this.eventBus.on('terminal.close', (event) => {
            const { terminalId } = event.data;
            this.closeTerminal(terminalId);
        });

        this.eventBus.on('terminal.runCommand', (event) => {
            const { terminalId, command } = event.data;
            this.runCommand(terminalId, command);
        });
    }

    createTerminal(options: ProcessOptions = {}): string {
        const terminalId = `terminal-${this.nextTerminalId++}`;
        const terminalName = `Terminal ${this.nextTerminalId - 1}`;

        // Create xterm terminal with enhanced configuration
        const terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "Courier New", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#d4d4d4',
                cursorAccent: '#1e1e1e',
                selectionBackground: '#264f78',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#e5e5e5'
            },
            allowTransparency: true,
            convertEol: true,
            scrollback: 10000,
            rows: 30,
            cols: 80
        });

        // Add addons
        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);

        // Create container element
        const element = document.createElement('div');
        element.className = 'terminal-container';
        element.style.display = 'none';
        element.style.height = '100%';
        element.style.width = '100%';

        const terminalInstance: TerminalInstance = {
            id: terminalId,
            name: terminalName,
            terminal,
            fitAddon,
            element,
            isActive: false,
            cwd: options.cwd || this.defaultCwd,
            isConnected: false,
            commandBuffer: '',
            commandHistory: [],
            historyIndex: -1
        };

        // Setup terminal event handlers
        this.setupTerminalHandlers(terminalInstance);

        // Start the shell process
        this.startShellProcess(terminalInstance, options);

        this.terminals.set(terminalId, terminalInstance);

        // Make this terminal active if it's the first one
        if (this.terminals.size === 1) {
            this.setActiveTerminal(terminalId);
        }

        this.eventBus.emit('terminal.created', { terminalId, name: terminalName });

        return terminalId;
    }

    private startShellProcess(instance: TerminalInstance, options: ProcessOptions): void {
        try {
            const shell = options.shell || this.defaultShell;
            const cwd = options.cwd || instance.cwd;
            const env = { ...process.env, ...options.env };

            // Spawn shell process
            const shellProcess = spawn(shell, [], {
                cwd,
                env,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            instance.process = shellProcess;
            instance.isConnected = true;

            // Handle process output
            shellProcess.stdout?.on('data', (data: Buffer) => {
                const output = data.toString();
                instance.terminal.write(output);
            });

            shellProcess.stderr?.on('data', (data: Buffer) => {
                const output = data.toString();
                instance.terminal.write(`\x1b[31m${output}\x1b[0m`); // Red color for errors
            });

            // Handle process exit
            shellProcess.on('exit', (code: number | null, signal: string | null) => {
                instance.isConnected = false;
                const exitMessage = signal 
                    ? `\r\n[Process exited with signal ${signal}]\r\n`
                    : `\r\n[Process exited with code ${code}]\r\n`;
                
                instance.terminal.write(exitMessage);
                
                // Offer to restart
                instance.terminal.write('\x1b[33mPress Enter to restart terminal...\x1b[0m\r\n');
            });

            // Handle process errors
            shellProcess.on('error', (error: Error) => {
                console.error('Terminal process error:', error);
                instance.terminal.write(`\r\n\x1b[31mTerminal Error: ${error.message}\x1b[0m\r\n`);
            });

            // Send initial resize
            this.resizeProcess(instance);

        } catch (error: any) {
            console.error('Failed to start shell process:', error);
            instance.terminal.write(`\x1b[31mFailed to start terminal: ${error.message}\x1b[0m\r\n`);
        }
    }

    private setupTerminalHandlers(terminalInstance: TerminalInstance): void {
        const { terminal, id } = terminalInstance;

        // Handle terminal input
        terminal.onData((data: string) => {
            this.handleTerminalInput(id, data);
        });

        // Handle terminal resize
        terminal.onResize((size: any) => {
            this.resizeProcess(terminalInstance);
            this.eventBus.emit('terminal.resized', { 
                terminalId: id, 
                cols: size.cols, 
                rows: size.rows 
            });
        });

        // Handle terminal title change
        terminal.onTitleChange((title: string) => {
            const instance = this.terminals.get(id);
            if (instance) {
                instance.name = title;
                this.eventBus.emit('terminal.titleChanged', { terminalId: id, title });
            }
        });

        // Handle selection change
        terminal.onSelectionChange(() => {
            const selection = terminal.getSelection();
            if (selection) {
                this.eventBus.emit('terminal.selectionChanged', { terminalId: id, selection });
            }
        });
    }

    private handleTerminalInput(terminalId: string, data: string): void {
        const instance = this.terminals.get(terminalId);
        if (!instance) return;

        // Handle special key combinations
        const charCode = data.charCodeAt(0);

        // Handle common control sequences
        switch (charCode) {
            case 3: // Ctrl+C
                this.sendSignal(instance, 'SIGINT');
                return;
                
            case 4: // Ctrl+D (EOF)
                if (instance.process && instance.isConnected) {
                    instance.process.stdin?.end();
                }
                return;
                
            case 26: // Ctrl+Z
                this.sendSignal(instance, 'SIGTSTP');
                return;
        }

        // Handle arrow keys for command history
        if (data === '\x1b[A') { // Up arrow
            this.navigateHistory(instance, 'up');
            return;
        }
        
        if (data === '\x1b[B') { // Down arrow
            this.navigateHistory(instance, 'down');
            return;
        }

        // Handle Enter key
        if (data === '\r') {
            if (!instance.isConnected) {
                // Restart terminal if not connected
                this.restartTerminal(terminalId);
                return;
            }
            
            // Add command to history
            if (instance.commandBuffer.trim()) {
                instance.commandHistory.push(instance.commandBuffer);
                instance.historyIndex = instance.commandHistory.length;
            }
            instance.commandBuffer = '';
        }

        // Handle backspace
        if (data === '\x7f') {
            instance.commandBuffer = instance.commandBuffer.slice(0, -1);
        } else if (data.length === 1 && charCode >= 32) {
            // Regular character
            instance.commandBuffer += data;
        }

        // Send data to shell process
        if (instance.process && instance.isConnected) {
            instance.process.stdin?.write(data);
        }
    }

    private navigateHistory(instance: TerminalInstance, direction: 'up' | 'down'): void {
        if (instance.commandHistory.length === 0) return;

        if (direction === 'up') {
            if (instance.historyIndex > 0) {
                instance.historyIndex--;
            }
        } else {
            if (instance.historyIndex < instance.commandHistory.length - 1) {
                instance.historyIndex++;
            } else {
                instance.historyIndex = instance.commandHistory.length;
                instance.commandBuffer = '';
                return;
            }
        }

        const command = instance.commandHistory[instance.historyIndex] || '';
        
        // Clear current line and write command
        instance.terminal.write('\r\x1b[K$ ' + command);
        instance.commandBuffer = command;
    }

    private sendSignal(instance: TerminalInstance, signal: string): void {
        if (instance.process && instance.isConnected) {
            try {
                instance.process.kill(signal as NodeJS.Signals);
            } catch (error) {
                console.error('Failed to send signal:', error);
            }
        }
    }

    private resizeProcess(instance: TerminalInstance): void {
        if (instance.process && instance.isConnected) {
            const { cols, rows } = instance.terminal;
            
            try {
                // Send resize signal to process
                if (instance.process.stdin && typeof (instance.process as any).resize === 'function') {
                    (instance.process as any).resize(cols, rows);
                }
            } catch (error) {
                console.error('Failed to resize process:', error);
            }
        }
    }

    async runCommand(terminalId: string, command: string, options: ProcessOptions = {}): Promise<void> {
        const instance = this.terminals.get(terminalId);
        if (!instance) return;

        try {
            // Create a new process for the command
            const cwd = options.cwd || instance.cwd;
            const env = { ...process.env, ...options.env };

            const commandProcess = spawn(command, [], {
                shell: true,
                cwd,
                env,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Write command to terminal
            instance.terminal.write(`\r\n\x1b[32m$ ${command}\x1b[0m\r\n`);

            // Handle command output
            commandProcess.stdout?.on('data', (data: Buffer) => {
                instance.terminal.write(data.toString());
            });

            commandProcess.stderr?.on('data', (data: Buffer) => {
                instance.terminal.write(`\x1b[31m${data.toString()}\x1b[0m`);
            });

            // Handle command completion
            commandProcess.on('exit', (code: number | null) => {
                const exitCode = code || 0;
                const color = exitCode === 0 ? '\x1b[32m' : '\x1b[31m';
                instance.terminal.write(`\r\n${color}[Command exited with code ${exitCode}]\x1b[0m\r\n`);
                
                // Add to command history
                instance.commandHistory.push(command);
                instance.historyIndex = instance.commandHistory.length;
            });

        } catch (error: any) {
            console.error('Failed to run command:', error);
            instance.terminal.write(`\x1b[31mFailed to run command: ${error.message}\x1b[0m\r\n`);
        }
    }

    async runScript(terminalId: string, scriptPath: string, args: string[] = []): Promise<void> {
        const instance = this.terminals.get(terminalId);
        if (!instance) return;

        const command = `"${scriptPath}" ${args.join(' ')}`;
        await this.runCommand(terminalId, command, { cwd: instance.cwd });
    }

    changeDirectory(terminalId: string, newCwd: string): void {
        const instance = this.terminals.get(terminalId);
        if (!instance) return;

        try {
            const resolvedPath = path.resolve(instance.cwd, newCwd);
            instance.cwd = resolvedPath;
            
            // Send cd command to shell
            if (instance.process && instance.isConnected) {
                const cdCommand = os.platform() === 'win32' ? `cd /d "${resolvedPath}"\r` : `cd "${resolvedPath}"\r`;
                instance.process.stdin?.write(cdCommand);
            }
            
            this.eventBus.emit('terminal.directoryChanged', { terminalId, cwd: resolvedPath });
        } catch (error: any) {
            console.error('Failed to change directory:', error);
            instance.terminal.write(`\x1b[31mFailed to change directory: ${error.message}\x1b[0m\r\n`);
        }
    }

    restartTerminal(terminalId: string): void {
        const instance = this.terminals.get(terminalId);
        if (!instance) return;

        // Kill existing process
        if (instance.process) {
            try {
                instance.process.kill('SIGTERM');
            } catch (error) {
                console.error('Error killing process:', error);
            }
        }

        // Clear terminal
        instance.terminal.clear();
        instance.terminal.write('\x1b[32mRestarting terminal...\x1b[0m\r\n');

        // Start new shell process
        setTimeout(() => {
            this.startShellProcess(instance, { cwd: instance.cwd });
        }, 1000);
    }

    mountTerminal(terminalId: string, container: HTMLElement): boolean {
        const instance = this.terminals.get(terminalId);
        if (!instance) return false;

        // Clear container
        container.innerHTML = '';

        // Open terminal in container
        instance.terminal.open(container);
        
        // Fit terminal to container
        instance.fitAddon.fit();

        // Setup resize observer
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                instance.fitAddon.fit();
            });
        });
        resizeObserver.observe(container);

        // Store resize observer for cleanup
        (instance as any).resizeObserver = resizeObserver;

        return true;
    }

    setActiveTerminal(terminalId: string): void {
        // Deactivate current terminal
        if (this.activeTerminalId) {
            const currentTerminal = this.terminals.get(this.activeTerminalId);
            if (currentTerminal) {
                currentTerminal.isActive = false;
                currentTerminal.element.style.display = 'none';
            }
        }

        // Activate new terminal
        const newTerminal = this.terminals.get(terminalId);
        if (newTerminal) {
            newTerminal.isActive = true;
            newTerminal.element.style.display = 'block';
            this.activeTerminalId = terminalId;
            
            // Focus the terminal
            newTerminal.terminal.focus();
            newTerminal.fitAddon.fit();

            this.eventBus.emit('terminal.activated', { terminalId });
        }
    }

    closeTerminal(terminalId: string): void {
        const instance = this.terminals.get(terminalId);
        if (!instance) return;

        // Kill process
        if (instance.process && instance.isConnected) {
            try {
                instance.process.kill('SIGTERM');
            } catch (error) {
                console.error('Error killing process:', error);
            }
        }

        // Clean up resize observer
        if ((instance as any).resizeObserver) {
            (instance as any).resizeObserver.disconnect();
        }

        // Dispose terminal
        instance.terminal.dispose();

        // Remove from map
        this.terminals.delete(terminalId);

        // If this was the active terminal, activate another one
        if (this.activeTerminalId === terminalId) {
            this.activeTerminalId = null;
            
            // Activate the first available terminal
            const remainingTerminals = Array.from(this.terminals.keys());
            if (remainingTerminals.length > 0) {
                this.setActiveTerminal(remainingTerminals[0]);
            }
        }

        this.eventBus.emit('terminal.closed', { terminalId });
    }

    getTerminals(): TerminalInstance[] {
        return Array.from(this.terminals.values());
    }

    getActiveTerminal(): TerminalInstance | null {
        return this.activeTerminalId ? this.terminals.get(this.activeTerminalId) || null : null;
    }

    writeToTerminal(terminalId: string, data: string): void {
        const instance = this.terminals.get(terminalId);
        if (instance) {
            instance.terminal.write(data);
        }
    }

    resizeTerminal(terminalId: string): void {
        const instance = this.terminals.get(terminalId);
        if (instance) {
            instance.fitAddon.fit();
            this.resizeProcess(instance);
        }
    }

    clearTerminal(terminalId: string): void {
        const instance = this.terminals.get(terminalId);
        if (instance) {
            instance.terminal.clear();
        }
    }

    // Advanced terminal features
    splitTerminal(terminalId: string): string {
        const instance = this.terminals.get(terminalId);
        if (!instance) return '';

        // Create new terminal with same working directory
        return this.createTerminal({ cwd: instance.cwd });
    }

    getTerminalInfo(terminalId: string): any {
        const instance = this.terminals.get(terminalId);
        if (!instance) return null;

        return {
            id: instance.id,
            name: instance.name,
            cwd: instance.cwd,
            isActive: instance.isActive,
            isConnected: instance.isConnected,
            processId: instance.process?.pid,
            commandHistory: instance.commandHistory.slice(-10) // Last 10 commands
        };
    }

    // Bulk operations
    closeAllTerminals(): void {
        const terminalIds = Array.from(this.terminals.keys());
        terminalIds.forEach(id => this.closeTerminal(id));
    }

    restartAllTerminals(): void {
        const terminalIds = Array.from(this.terminals.keys());
        terminalIds.forEach(id => this.restartTerminal(id));
    }
}