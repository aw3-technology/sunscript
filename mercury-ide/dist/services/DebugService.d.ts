import { EventBus } from '../core/event-bus';
import { OutputChannelsService } from './OutputChannelsService';
export interface Breakpoint {
    id: string;
    uri: string;
    lineNumber: number;
    enabled: boolean;
    condition?: string;
    hitCount?: number;
    logMessage?: string;
}
export interface DebugVariable {
    name: string;
    value: any;
    type: string;
    variablesReference?: number;
    evaluateName?: string;
}
export interface StackFrame {
    id: number;
    name: string;
    uri: string;
    lineNumber: number;
    column?: number;
}
export interface DebugSession {
    id: string;
    name: string;
    type: string;
    status: 'starting' | 'running' | 'paused' | 'stopped';
    currentStackFrames: StackFrame[];
    variables: Map<string, DebugVariable[]>;
    breakpoints: Map<string, Breakpoint[]>;
    configuration: DebugConfiguration;
}
export interface DebugConfiguration {
    name: string;
    type: string;
    request: 'launch' | 'attach';
    program?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    port?: number;
    host?: string;
}
export declare class DebugService {
    private eventBus;
    private outputChannelsService;
    private sessions;
    private activeSessionId;
    private breakpoints;
    private nextBreakpointId;
    private nextSessionId;
    private debugConfigurations;
    constructor(eventBus: EventBus, outputChannelsService: OutputChannelsService);
    private setupEventListeners;
    private initializeDefaultConfigurations;
    startDebugging(configuration?: DebugConfiguration): Promise<string>;
    private initializeDebugSession;
    private simulateBreakpointHit;
    stopDebugging(): void;
    continue(): void;
    stepOver(): void;
    stepInto(): void;
    stepOut(): void;
    private updateVariables;
    addBreakpoint(uri: string, lineNumber: number, condition?: string): string;
    removeBreakpoint(breakpointId: string): void;
    toggleBreakpoint(breakpointId: string): void;
    evaluateExpression(expression: string, frameId?: number): Promise<DebugVariable>;
    getActiveSession(): DebugSession | null;
    getAllBreakpoints(): Map<string, Breakpoint[]>;
    getDebugConfigurations(): DebugConfiguration[];
    private delay;
    pause(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    getState(): DebugState;
    getVariables(): DebugVariable[];
    getCallStack(): CallStackFrame[];
    getBreakpoints(): DebugBreakpoint[];
}
interface DebugState {
    isRunning: boolean;
    isPaused: boolean;
    currentLine: number | null;
    currentFile: string | null;
}
interface CallStackFrame {
    name: string;
    file: string;
    line: number;
}
interface DebugBreakpoint {
    id: string;
    file: string;
    line: number;
    enabled: boolean;
    verified?: boolean;
}
export {};
