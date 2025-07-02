import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

export interface TerminalInstance {
    id: string;
    name: string;
    terminal: Terminal;
    fitAddon: FitAddon;
    element: HTMLElement;
    isActive: boolean;
    cwd: string;
    process?: any;
}

@injectable()
export class TerminalService {
    private terminals = new Map<string, TerminalInstance>();
    private activeTerminalId: string | null = null;
    private nextTerminalId = 1;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('terminal.create', () => {
            this.createTerminal();
        });

        this.eventBus.on('terminal.close', (event) => {
            const { terminalId } = event.data;
            this.closeTerminal(terminalId);
        });
    }

    createTerminal(name?: string, cwd?: string): string {
        const terminalId = `terminal-${this.nextTerminalId++}`;
        const terminalName = name || `Terminal ${this.nextTerminalId - 1}`;

        // Create xterm terminal
        const terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#d4d4d4',
                selection: '#264f78',
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
            scrollback: 1000
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

        const terminalInstance: TerminalInstance = {
            id: terminalId,
            name: terminalName,
            terminal,
            fitAddon,
            element,
            isActive: false,
            cwd: cwd || '/'
        };

        // Setup terminal event handlers
        this.setupTerminalHandlers(terminalInstance);

        this.terminals.set(terminalId, terminalInstance);

        // Make this terminal active if it's the first one
        if (this.terminals.size === 1) {
            this.setActiveTerminal(terminalId);
        }

        this.eventBus.emit('terminal.created', { terminalId, name: terminalName });

        return terminalId;
    }

    private setupTerminalHandlers(terminalInstance: TerminalInstance): void {
        const { terminal, id } = terminalInstance;

        // Handle terminal input
        terminal.onData((data: string) => {
            this.handleTerminalInput(id, data);
        });

        // Handle terminal resize
        terminal.onResize((size: any) => {
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
    }

    private handleTerminalInput(terminalId: string, data: string): void {
        const instance = this.terminals.get(terminalId);
        if (!instance) return;

        // For demo purposes, we'll simulate a basic shell
        // In a real implementation, this would send data to a backend process
        this.simulateShellCommand(instance, data);
    }

    private simulateShellCommand(instance: TerminalInstance, input: string): void {
        const { terminal } = instance;

        // Handle special keys
        if (input === '\r') { // Enter key
            terminal.write('\r\n');
            const currentLine = this.getCurrentLine(terminal);
            this.executeCommand(instance, currentLine.trim());
            this.showPrompt(terminal);
            return;
        }

        if (input === '\u007f') { // Backspace
            terminal.write('\b \b');
            return;
        }

        if (input === '\u0003') { // Ctrl+C
            terminal.write('^C\r\n');
            this.showPrompt(terminal);
            return;
        }

        // Regular character input
        terminal.write(input);
    }

    private getCurrentLine(terminal: Terminal): string {
        // This is a simplified implementation
        // In a real terminal, you'd track the current command line
        return '';
    }

    private executeCommand(instance: TerminalInstance, command: string): void {
        const { terminal } = instance;

        if (!command) return;

        // Simulate command execution
        switch (command.split(' ')[0]) {
            case 'help':
                terminal.write('Available commands:\r\n');
                terminal.write('  help     - Show this help\r\n');
                terminal.write('  clear    - Clear terminal\r\n');
                terminal.write('  echo     - Echo text\r\n');
                terminal.write('  pwd      - Print working directory\r\n');
                terminal.write('  ls       - List directory contents\r\n');
                terminal.write('  npm      - NPM commands\r\n');
                break;

            case 'clear':
                terminal.clear();
                break;

            case 'echo':
                const text = command.substring(5);
                terminal.write(text + '\r\n');
                break;

            case 'pwd':
                terminal.write(instance.cwd + '\r\n');
                break;

            case 'ls':
                terminal.write('genesis.sun\r\n');
                terminal.write('src/\r\n');
                terminal.write('package.json\r\n');
                terminal.write('README.md\r\n');
                break;

            case 'npm':
                this.handleNpmCommand(terminal, command);
                break;

            default:
                terminal.write(`sunscript: command not found: ${command}\r\n`);
        }
    }

    private handleNpmCommand(terminal: Terminal, command: string): void {
        const args = command.split(' ');
        
        if (args[1] === 'run' && args[2] === 'build') {
            terminal.write('Building SunScript project...\r\n');
            setTimeout(() => {
                terminal.write('✓ Build completed successfully\r\n');
                this.showPrompt(terminal);
            }, 2000);
            return;
        }

        if (args[1] === 'test') {
            terminal.write('Running tests...\r\n');
            setTimeout(() => {
                terminal.write('✓ All tests passed\r\n');
                this.showPrompt(terminal);
            }, 1500);
            return;
        }

        terminal.write(`npm: unknown command: ${args.slice(1).join(' ')}\r\n`);
    }

    private showPrompt(terminal: Terminal): void {
        terminal.write('$ ');
    }

    mountTerminal(terminalId: string, container: HTMLElement): boolean {
        const instance = this.terminals.get(terminalId);
        if (!instance) return false;

        // Open terminal in container
        instance.terminal.open(container);
        
        // Initial setup
        this.showPrompt(instance.terminal);
        instance.fitAddon.fit();

        // Setup resize observer
        const resizeObserver = new ResizeObserver(() => {
            instance.fitAddon.fit();
        });
        resizeObserver.observe(container);

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
        }
    }

    clearTerminal(terminalId: string): void {
        const instance = this.terminals.get(terminalId);
        if (instance) {
            instance.terminal.clear();
            this.showPrompt(instance.terminal);
        }
    }
}