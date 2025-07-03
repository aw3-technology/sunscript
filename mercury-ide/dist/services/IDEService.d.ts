import { EventBus } from '../core/event-bus';
import { FileSystemService } from './FileSystemService';
import { SunScriptCompilerService } from './SunScriptCompilerService';
import { TerminalService } from './TerminalService';
import { OutputChannelsService } from './OutputChannelsService';
import { DiagnosticsService } from './DiagnosticsService';
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
export declare class IDEService {
    private eventBus;
    private fileSystemService;
    private compilerService;
    private terminalService;
    private outputChannelsService;
    private diagnosticsService;
    private state;
    private commands;
    constructor(eventBus: EventBus, fileSystemService: FileSystemService, compilerService: SunScriptCompilerService, terminalService: TerminalService, outputChannelsService: OutputChannelsService, diagnosticsService: DiagnosticsService);
    private initializeCommands;
    private setupEventListeners;
    registerCommand(command: IDECommand): void;
    getCommand(id: string): IDECommand | undefined;
    getAllCommands(): IDECommand[];
    executeCommand(id: string): Promise<void>;
    runCurrentFile(): Promise<void>;
    buildProject(): Promise<void>;
    debugCurrentFile(): Promise<void>;
    stopExecution(): Promise<void>;
    createNewProject(): Promise<void>;
    openProject(): Promise<void>;
    createNewFile(): Promise<void>;
    saveCurrentFile(): Promise<void>;
    saveAllFiles(): Promise<void>;
    private showOutput;
    private showErrors;
    private clearProblems;
    private showMessage;
    getState(): IDEState;
    updateState(updates: Partial<IDEState>): void;
    validateCurrentFile(): Promise<void>;
    runInTerminal(command: string): Promise<void>;
    getCompilerInfo(): any;
    isReady(): boolean;
}
