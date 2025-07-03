import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { FileSystemService } from './FileSystemService';
import { SunScriptCompilerService, CompilerResult, BuildOptions, RunOptions } from './SunScriptCompilerService';
import { TerminalService } from './TerminalService';
import { OutputChannelsService } from './OutputChannelsService';
import { DiagnosticsService } from './DiagnosticsService';
import * as path from 'path';

export interface IDECommand {
    id: string;
    name: string;
    description: string;
    icon?: string;
    execute: () => Promise<void>;
}

export interface IDEState {
    currentProject?: string;
    currentFile?: string;
    isBuilding: boolean;
    isRunning: boolean;
    lastBuildTime?: Date;
    lastRunTime?: Date;
}

@injectable()
export class IDEService {
    private state: IDEState = {
        isBuilding: false,
        isRunning: false
    };

    private commands = new Map<string, IDECommand>();

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.FileSystemService) private fileSystemService: FileSystemService,
        @inject(TYPES.CompilerService) private compilerService: SunScriptCompilerService,
        @inject(TYPES.TerminalService) private terminalService: TerminalService,
        @inject(TYPES.OutputChannelsService) private outputChannelsService: OutputChannelsService,
        @inject(TYPES.DiagnosticsService) private diagnosticsService: DiagnosticsService
    ) {
        this.initializeCommands();
        this.setupEventListeners();
    }

    private initializeCommands(): void {
        // Register core IDE commands
        this.registerCommand({
            id: 'ide.run',
            name: 'Run',
            description: 'Compile and run the current file or project',
            icon: 'play',
            execute: () => this.runCurrentFile()
        });

        this.registerCommand({
            id: 'ide.build',
            name: 'Build',
            description: 'Build the current project',
            icon: 'build',
            execute: () => this.buildProject()
        });

        this.registerCommand({
            id: 'ide.debug',
            name: 'Debug',
            description: 'Debug the current file or project',
            icon: 'bug',
            execute: () => this.debugCurrentFile()
        });

        this.registerCommand({
            id: 'ide.stop',
            name: 'Stop',
            description: 'Stop the currently running process',
            icon: 'stop',
            execute: () => this.stopExecution()
        });

        this.registerCommand({
            id: 'ide.newProject',
            name: 'New Project',
            description: 'Create a new SunScript project',
            icon: 'folder-plus',
            execute: () => this.createNewProject()
        });

        this.registerCommand({
            id: 'ide.openProject',
            name: 'Open Project',
            description: 'Open an existing project folder',
            icon: 'folder-open',
            execute: () => this.openProject()
        });

        this.registerCommand({
            id: 'ide.newFile',
            name: 'New File',
            description: 'Create a new file',
            icon: 'file-plus',
            execute: () => this.createNewFile()
        });

        this.registerCommand({
            id: 'ide.saveFile',
            name: 'Save',
            description: 'Save the current file',
            icon: 'save',
            execute: () => this.saveCurrentFile()
        });

        this.registerCommand({
            id: 'ide.saveAllFiles',
            name: 'Save All',
            description: 'Save all open files',
            icon: 'save-all',
            execute: () => this.saveAllFiles()
        });
    }

    private setupEventListeners(): void {
        // Listen for file changes
        this.eventBus.on('file.changed', (event) => {
            this.state.currentFile = event.data.filePath;
            this.eventBus.emit('ide.stateChanged', { state: this.state });
        });

        // Listen for project changes
        this.eventBus.on('workspace.changed', (event) => {
            this.state.currentProject = event.data.workspacePath;
            this.eventBus.emit('ide.stateChanged', { state: this.state });
        });

        // Listen for compiler events
        this.eventBus.on('compiler.buildStarted', () => {
            this.state.isBuilding = true;
            this.eventBus.emit('ide.stateChanged', { state: this.state });
        });

        this.eventBus.on('compiler.buildCompleted', () => {
            this.state.isBuilding = false;
            this.state.lastBuildTime = new Date();
            this.eventBus.emit('ide.stateChanged', { state: this.state });
        });

        this.eventBus.on('compiler.runStarted', () => {
            this.state.isRunning = true;
            this.eventBus.emit('ide.stateChanged', { state: this.state });
        });

        this.eventBus.on('compiler.runCompleted', () => {
            this.state.isRunning = false;
            this.state.lastRunTime = new Date();
            this.eventBus.emit('ide.stateChanged', { state: this.state });
        });
    }

    // Command Registration
    registerCommand(command: IDECommand): void {
        this.commands.set(command.id, command);
        this.eventBus.emit('ide.commandRegistered', { command });
    }

    getCommand(id: string): IDECommand | undefined {
        return this.commands.get(id);
    }

    getAllCommands(): IDECommand[] {
        return Array.from(this.commands.values());
    }

    async executeCommand(id: string): Promise<void> {
        const command = this.commands.get(id);
        if (!command) {
            throw new Error(`Command not found: ${id}`);
        }

        try {
            await command.execute();
            this.eventBus.emit('ide.commandExecuted', { commandId: id });
        } catch (error: any) {
            console.error(`Failed to execute command ${id}:`, error);
            this.eventBus.emit('ide.commandFailed', { commandId: id, error: error.message });
            throw error;
        }
    }

    // Core IDE Operations
    async runCurrentFile(): Promise<void> {
        if (this.state.isRunning) {
            this.showMessage('Already running. Please stop the current execution first.', 'warning');
            return;
        }

        const currentFile = this.state.currentFile;
        if (!currentFile) {
            this.showMessage('No file selected to run', 'error');
            return;
        }

        try {
            this.eventBus.emit('compiler.runStarted');
            this.showOutput('SunScript Runner', `🚀 Running ${currentFile}...`);

            // Set working directory for compiler
            const workspace = this.fileSystemService.getCurrentWorkspace();
            if (workspace) {
                this.compilerService.setWorkingDirectory(workspace);
            }

            // Run the file
            const result = await this.compilerService.run(currentFile);

            if (result.success) {
                this.showOutput('SunScript Runner', '✅ Execution completed successfully!');
                this.showOutput('SunScript Runner', result.output || 'No output');
                this.showMessage(`Successfully ran ${path.basename(currentFile)}`, 'success');
            } else {
                this.showOutput('SunScript Runner', '❌ Execution failed!');
                this.showErrors(result.errors || ['Unknown error']);
                this.showMessage(`Failed to run ${path.basename(currentFile)}`, 'error');
            }
        } catch (error: any) {
            this.showOutput('SunScript Runner', `❌ Error: ${error.message}`);
            this.showMessage(`Error running file: ${error.message}`, 'error');
        } finally {
            this.eventBus.emit('compiler.runCompleted');
        }
    }

    async buildProject(): Promise<void> {
        if (this.state.isBuilding) {
            this.showMessage('Build already in progress', 'warning');
            return;
        }

        const currentProject = this.state.currentProject;
        if (!currentProject) {
            this.showMessage('No project open to build', 'error');
            return;
        }

        try {
            this.eventBus.emit('compiler.buildStarted');
            this.showOutput('SunScript Builder', `🔨 Building project at ${currentProject}...`);

            // Set working directory for compiler
            this.compilerService.setWorkingDirectory(currentProject);

            // Build the project
            const buildOptions: BuildOptions = {
                outputDir: path.join(currentProject, 'dist'),
                optimization: 'basic',
                sourceMap: true
            };

            const result = await this.compilerService.build(currentProject, buildOptions);

            if (result.success) {
                this.showOutput('SunScript Builder', '✅ Build completed successfully!');
                this.showOutput('SunScript Builder', result.output || 'Build output not available');
                this.showMessage('Project built successfully', 'success');
                this.clearProblems();
            } else {
                this.showOutput('SunScript Builder', '❌ Build failed!');
                this.showErrors(result.errors || ['Unknown build error']);
                this.showMessage('Build failed', 'error');
            }
        } catch (error: any) {
            this.showOutput('SunScript Builder', `❌ Build Error: ${error.message}`);
            this.showMessage(`Build error: ${error.message}`, 'error');
        } finally {
            this.eventBus.emit('compiler.buildCompleted');
        }
    }

    async debugCurrentFile(): Promise<void> {
        this.showMessage('Debug functionality coming soon!', 'info');
        // TODO: Implement debugging capabilities
    }

    async stopExecution(): Promise<void> {
        // Stop any running terminals
        const activeTerminal = this.terminalService.getActiveTerminal();
        if (activeTerminal) {
            // Send Ctrl+C to stop running process
            this.terminalService.writeToTerminal(activeTerminal.id, '\x03');
        }

        this.state.isRunning = false;
        this.state.isBuilding = false;
        this.eventBus.emit('ide.stateChanged', { state: this.state });
        this.showMessage('Execution stopped', 'info');
    }

    // Project Management
    async createNewProject(): Promise<void> {
        try {
            // In a real implementation, this would show a dialog
            // For now, we'll create a sample project in the current directory
            const projectName = `sunscript-project-${Date.now()}`;
            const projectPath = path.join(process.cwd(), projectName);

            await this.fileSystemService.createProject({
                name: projectName,
                path: process.cwd(),
                template: 'todo-app'
            });

            // Open the new project
            await this.fileSystemService.openWorkspace(projectPath);
            this.state.currentProject = projectPath;
            
            this.showMessage(`Created new project: ${projectName}`, 'success');
            this.eventBus.emit('workspace.changed', { workspacePath: projectPath });
        } catch (error: any) {
            this.showMessage(`Failed to create project: ${error.message}`, 'error');
        }
    }

    async openProject(): Promise<void> {
        try {
            // In a real implementation, this would show a file dialog
            // For now, we'll try to open a common project path
            const possiblePaths = [
                path.join(process.cwd(), '..', 'my-sunscript-project'),
                process.cwd()
            ];

            for (const projectPath of possiblePaths) {
                try {
                    await this.fileSystemService.openWorkspace(projectPath);
                    this.state.currentProject = projectPath;
                    this.showMessage(`Opened project: ${path.basename(projectPath)}`, 'success');
                    this.eventBus.emit('workspace.changed', { workspacePath: projectPath });
                    return;
                } catch (error: any) {
                    // Try next path
                    continue;
                }
            }

            this.showMessage('No valid project found to open', 'warning');
        } catch (error: any) {
            this.showMessage(`Failed to open project: ${error.message}`, 'error');
        }
    }

    // File Management
    async createNewFile(): Promise<void> {
        if (!this.state.currentProject) {
            this.showMessage('Please open a project first', 'error');
            return;
        }

        try {
            const fileName = `new-file-${Date.now()}.sun`;
            const filePath = path.join(this.state.currentProject, 'src', fileName);
            
            const defaultContent = `@task main {
  console.log("Hello from ${fileName}!")
}`;

            await this.fileSystemService.createFile(filePath, defaultContent);
            this.showMessage(`Created new file: ${fileName}`, 'success');
            this.eventBus.emit('file.created', { filePath });
        } catch (error: any) {
            this.showMessage(`Failed to create file: ${error.message}`, 'error');
        }
    }

    async saveCurrentFile(): Promise<void> {
        if (!this.state.currentFile) {
            this.showMessage('No file to save', 'warning');
            return;
        }

        try {
            // In a real implementation, this would get content from the editor
            // For now, we'll just emit the save event
            this.eventBus.emit('file.saveRequested', { filePath: this.state.currentFile });
            this.showMessage(`Saved ${path.basename(this.state.currentFile)}`, 'success');
        } catch (error: any) {
            this.showMessage(`Failed to save file: ${error.message}`, 'error');
        }
    }

    async saveAllFiles(): Promise<void> {
        try {
            this.eventBus.emit('files.saveAllRequested');
            this.showMessage('All files saved', 'success');
        } catch (error: any) {
            this.showMessage(`Failed to save files: ${error.message}`, 'error');
        }
    }

    // Utility Methods
    private showOutput(channel: string, message: string): void {
        this.outputChannelsService.appendLine(channel, message);
        this.eventBus.emit('output.messageAdded', { channel, message });
    }

    private showErrors(errors: string[]): void {
        errors.forEach(error => {
            this.showOutput('SunScript Problems', `❌ ${error}`);
        });

        // Update diagnostics
        this.diagnosticsService.updateDiagnostics('compiler', errors.map(error => ({
            uri: 'compiler',
            severity: 8, // monaco.MarkerSeverity.Error
            message: error,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
            source: 'SunScript Compiler'
        })));
    }

    private clearProblems(): void {
        this.diagnosticsService.clearDiagnostics('compiler');
    }

    private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
        console.log(`[${type.toUpperCase()}] ${message}`);
        this.eventBus.emit('ide.message', { message, type });
        
        // Also show in output
        const icon = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        }[type];
        
        this.showOutput('IDE', `${icon} ${message}`);
    }

    // State Management
    getState(): IDEState {
        return { ...this.state };
    }

    updateState(updates: Partial<IDEState>): void {
        this.state = { ...this.state, ...updates };
        this.eventBus.emit('ide.stateChanged', { state: this.state });
    }

    // Advanced Features
    async validateCurrentFile(): Promise<void> {
        const currentFile = this.state.currentFile;
        if (!currentFile) return;

        try {
            const content = await this.fileSystemService.loadFile(currentFile);
            const validation = await this.compilerService.validate(content);

            if (validation.valid) {
                this.showMessage('File validation passed', 'success');
                this.clearProblems();
            } else {
                this.showErrors(validation.errors);
                this.showMessage(`File has ${validation.errors.length} errors`, 'error');
            }

            if (validation.warnings && validation.warnings.length > 0) {
                validation.warnings.forEach(warning => {
                    this.showOutput('SunScript Warnings', `⚠️ ${warning}`);
                });
            }
        } catch (error: any) {
            this.showMessage(`Validation failed: ${error.message}`, 'error');
        }
    }

    async runInTerminal(command: string): Promise<void> {
        let terminalId = this.terminalService.getActiveTerminal()?.id;
        
        if (!terminalId) {
            // Create new terminal if none exists
            terminalId = this.terminalService.createTerminal();
        }

        await this.terminalService.runCommand(terminalId, command);
        this.showMessage(`Running command: ${command}`, 'info');
    }

    getCompilerInfo(): any {
        return this.compilerService.getCompilerInfo();
    }

    isReady(): boolean {
        return !!this.state.currentProject;
    }
}