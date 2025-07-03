import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { OutputChannelsService } from './OutputChannelsService';
import * as monaco from 'monaco-editor';

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

@injectable()
export class DebugService {
    private sessions = new Map<string, DebugSession>();
    private activeSessionId: string | null = null;
    private breakpoints = new Map<string, Breakpoint[]>();
    private nextBreakpointId = 1;
    private nextSessionId = 1;
    private debugConfigurations: DebugConfiguration[] = [];

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.OutputChannelsService) private outputChannelsService: OutputChannelsService
    ) {
        this.initializeDefaultConfigurations();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('debug.start', (event) => {
            const { configuration } = event.data;
            this.startDebugging(configuration);
        });

        this.eventBus.on('debug.stop', () => {
            this.stopDebugging();
        });

        this.eventBus.on('debug.continue', () => {
            this.continue();
        });

        this.eventBus.on('debug.stepOver', () => {
            this.stepOver();
        });

        this.eventBus.on('debug.stepInto', () => {
            this.stepInto();
        });

        this.eventBus.on('debug.stepOut', () => {
            this.stepOut();
        });
    }

    private initializeDefaultConfigurations(): void {
        this.debugConfigurations = [
            {
                name: 'Launch SunScript',
                type: 'sunscript',
                request: 'launch',
                program: '${workspaceFolder}/src/main.sun',
                cwd: '${workspaceFolder}'
            },
            {
                name: 'Debug Tests',
                type: 'sunscript',
                request: 'launch',
                program: '${workspaceFolder}/test/index.sun',
                cwd: '${workspaceFolder}',
                env: {
                    'NODE_ENV': 'test'
                }
            },
            {
                name: 'Attach to Process',
                type: 'sunscript',
                request: 'attach',
                port: 9229,
                host: 'localhost'
            }
        ];
    }

    async startDebugging(configuration?: DebugConfiguration): Promise<string> {
        const config = configuration || this.debugConfigurations[0];
        const sessionId = `debug-session-${this.nextSessionId++}`;

        const session: DebugSession = {
            id: sessionId,
            name: config.name,
            type: config.type,
            status: 'starting',
            currentStackFrames: [],
            variables: new Map(),
            breakpoints: new Map(this.breakpoints),
            configuration: config
        };

        this.sessions.set(sessionId, session);
        this.activeSessionId = sessionId;

        // Create debug output channel
        this.outputChannelsService.createChannel('Debug Console', 'debug');
        this.outputChannelsService.setActiveChannel('debug');

        this.outputChannelsService.appendLine(
            'debug',
            `Starting debug session: ${config.name}`,
            'info'
        );

        this.eventBus.emit('debug.sessionStarted', { sessionId, session });

        try {
            // Simulate debug session initialization
            await this.initializeDebugSession(session, config);
            
            session.status = 'running';
            this.outputChannelsService.appendLine('debug', 'Debug session started', 'info');
            
            // Simulate hitting initial breakpoint or entry point
            setTimeout(() => {
                this.simulateBreakpointHit(session);
            }, 1000);

        } catch (error) {
            session.status = 'stopped';
            this.outputChannelsService.appendLine(
                'debug',
                `Failed to start debug session: ${error}`,
                'error'
            );
            throw error;
        }

        return sessionId;
    }

    private async initializeDebugSession(session: DebugSession, config: DebugConfiguration): Promise<void> {
        // Simulate connecting to debugger
        await this.delay(500);
        
        this.outputChannelsService.appendLine(
            'debug',
            `Connecting to ${config.type} debugger...`,
            'info'
        );

        await this.delay(800);

        if (config.request === 'launch') {
            this.outputChannelsService.appendLine(
                'debug',
                `Launching program: ${config.program}`,
                'info'
            );
        } else {
            this.outputChannelsService.appendLine(
                'debug',
                `Attaching to process on ${config.host}:${config.port}`,
                'info'
            );
        }

        // Set up breakpoints
        for (const [uri, breakpoints] of session.breakpoints) {
            this.outputChannelsService.appendLine(
                'debug',
                `Setting ${breakpoints.length} breakpoint(s) in ${uri}`,
                'debug'
            );
        }
    }

    private simulateBreakpointHit(session: DebugSession): void {
        session.status = 'paused';

        // Create mock stack frames
        session.currentStackFrames = [
            {
                id: 1,
                name: 'main',
                uri: 'file:///workspace/src/main.sun',
                lineNumber: 15,
                column: 5
            },
            {
                id: 2,
                name: 'processData',
                uri: 'file:///workspace/src/data.sun',
                lineNumber: 8,
                column: 12
            }
        ];

        // Create mock variables
        session.variables.set('local', [
            { name: 'x', value: 42, type: 'number' },
            { name: 'message', value: 'Hello World', type: 'string' },
            { name: 'isActive', value: true, type: 'boolean' },
            { name: 'data', value: { length: 3 }, type: 'object', variablesReference: 1 }
        ]);

        session.variables.set('global', [
            { name: 'process', value: { pid: 1234 }, type: 'object', variablesReference: 2 },
            { name: 'console', value: {}, type: 'object', variablesReference: 3 }
        ]);

        this.outputChannelsService.appendLine(
            'debug',
            `Paused at line ${session.currentStackFrames[0].lineNumber} in ${session.currentStackFrames[0].name}`,
            'info'
        );

        this.eventBus.emit('debug.paused', { sessionId: session.id, session });
    }

    stopDebugging(): void {
        if (!this.activeSessionId) return;

        const session = this.sessions.get(this.activeSessionId);
        if (session) {
            session.status = 'stopped';
            session.currentStackFrames = [];
            session.variables.clear();

            this.outputChannelsService.appendLine(
                'debug',
                'Debug session stopped',
                'info'
            );

            this.eventBus.emit('debug.stopped', { sessionId: session.id });
        }

        this.sessions.delete(this.activeSessionId);
        this.activeSessionId = null;
    }

    continue(): void {
        const session = this.getActiveSession();
        if (session && session.status === 'paused') {
            session.status = 'running';
            session.currentStackFrames = [];
            session.variables.clear();

            this.outputChannelsService.appendLine('debug', 'Continuing execution...', 'debug');
            this.eventBus.emit('debug.continued', { sessionId: session.id });

            // Simulate continued execution
            setTimeout(() => {
                if (Math.random() > 0.7) {
                    this.simulateBreakpointHit(session);
                }
            }, 2000);
        }
    }

    stepOver(): void {
        const session = this.getActiveSession();
        if (session && session.status === 'paused') {
            this.outputChannelsService.appendLine('debug', 'Stepping over...', 'debug');
            
            // Update current line
            if (session.currentStackFrames.length > 0) {
                session.currentStackFrames[0].lineNumber++;
                this.updateVariables(session);
            }

            this.eventBus.emit('debug.stepped', { sessionId: session.id, type: 'over' });
        }
    }

    stepInto(): void {
        const session = this.getActiveSession();
        if (session && session.status === 'paused') {
            this.outputChannelsService.appendLine('debug', 'Stepping into...', 'debug');
            
            // Simulate stepping into a function
            const newFrame: StackFrame = {
                id: session.currentStackFrames.length + 1,
                name: 'helper',
                uri: 'file:///workspace/src/utils.sun',
                lineNumber: 3,
                column: 1
            };
            
            session.currentStackFrames.unshift(newFrame);
            this.updateVariables(session);

            this.eventBus.emit('debug.stepped', { sessionId: session.id, type: 'into' });
        }
    }

    stepOut(): void {
        const session = this.getActiveSession();
        if (session && session.status === 'paused') {
            this.outputChannelsService.appendLine('debug', 'Stepping out...', 'debug');
            
            // Remove current frame
            if (session.currentStackFrames.length > 1) {
                session.currentStackFrames.shift();
                this.updateVariables(session);
            }

            this.eventBus.emit('debug.stepped', { sessionId: session.id, type: 'out' });
        }
    }

    private updateVariables(session: DebugSession): void {
        // Simulate variable changes
        const localVars = session.variables.get('local');
        if (localVars) {
            const xVar = localVars.find(v => v.name === 'x');
            if (xVar) {
                xVar.value = Math.floor(Math.random() * 100);
            }
        }
    }

    // Breakpoint management
    addBreakpoint(uri: string, lineNumber: number, condition?: string): string {
        const breakpointId = `bp-${this.nextBreakpointId++}`;
        
        const breakpoint: Breakpoint = {
            id: breakpointId,
            uri,
            lineNumber,
            enabled: true,
            condition,
            hitCount: 0
        };

        if (!this.breakpoints.has(uri)) {
            this.breakpoints.set(uri, []);
        }

        this.breakpoints.get(uri)!.push(breakpoint);

        // Update active session if any
        const activeSession = this.getActiveSession();
        if (activeSession) {
            if (!activeSession.breakpoints.has(uri)) {
                activeSession.breakpoints.set(uri, []);
            }
            activeSession.breakpoints.get(uri)!.push(breakpoint);
        }

        this.eventBus.emit('breakpoint.added', { breakpoint });
        return breakpointId;
    }

    removeBreakpoint(breakpointId: string): void {
        for (const [uri, breakpoints] of this.breakpoints) {
            const index = breakpoints.findIndex(bp => bp.id === breakpointId);
            if (index !== -1) {
                breakpoints.splice(index, 1);
                if (breakpoints.length === 0) {
                    this.breakpoints.delete(uri);
                }

                // Update active session
                const activeSession = this.getActiveSession();
                if (activeSession) {
                    const sessionBreakpoints = activeSession.breakpoints.get(uri);
                    if (sessionBreakpoints) {
                        const sessionIndex = sessionBreakpoints.findIndex(bp => bp.id === breakpointId);
                        if (sessionIndex !== -1) {
                            sessionBreakpoints.splice(sessionIndex, 1);
                        }
                    }
                }

                this.eventBus.emit('breakpoint.removed', { breakpointId, uri });
                break;
            }
        }
    }

    toggleBreakpoint(breakpointId: string): void {
        for (const breakpoints of this.breakpoints.values()) {
            const breakpoint = breakpoints.find(bp => bp.id === breakpointId);
            if (breakpoint) {
                breakpoint.enabled = !breakpoint.enabled;
                this.eventBus.emit('breakpoint.toggled', { breakpoint });
                break;
            }
        }
    }

    // Evaluation
    async evaluateExpression(expression: string, frameId?: number): Promise<DebugVariable> {
        const session = this.getActiveSession();
        if (!session || session.status !== 'paused') {
            throw new Error('No active debug session or session not paused');
        }

        // Simulate expression evaluation
        await this.delay(200);

        // Simple expression evaluation simulation
        if (expression === 'x + 1') {
            return { name: expression, value: 43, type: 'number' };
        } else if (expression === 'message.length') {
            return { name: expression, value: 11, type: 'number' };
        } else {
            return { name: expression, value: 'undefined', type: 'undefined' };
        }
    }

    // Getters
    getActiveSession(): DebugSession | null {
        return this.activeSessionId ? this.sessions.get(this.activeSessionId) || null : null;
    }

    getAllBreakpoints(): Map<string, Breakpoint[]> {
        return new Map(this.breakpoints);
    }


    getDebugConfigurations(): DebugConfiguration[] {
        return [...this.debugConfigurations];
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Additional methods for DebugPanel
    async pause(): Promise<void> {
        const session = this.getActiveSession();
        if (session && session.status === 'running') {
            session.status = 'paused';
            this.simulateBreakpointHit(session);
        }
    }

    async stop(): Promise<void> {
        this.stopDebugging();
    }

    async restart(): Promise<void> {
        const session = this.getActiveSession();
        if (session) {
            const config = session.configuration;
            this.stopDebugging();
            await this.startDebugging(config);
        }
    }

    getState(): DebugState {
        const session = this.getActiveSession();
        return {
            isRunning: !!session,
            isPaused: session?.status === 'paused',
            currentLine: session?.currentStackFrames[0]?.lineNumber || null,
            currentFile: session?.currentStackFrames[0]?.uri || null
        };
    }

    getVariables(): DebugVariable[] {
        const session = this.getActiveSession();
        if (!session) return [];
        
        const variables: DebugVariable[] = [];
        for (const [scope, vars] of session.variables) {
            variables.push(...vars);
        }
        return variables;
    }

    getCallStack(): CallStackFrame[] {
        const session = this.getActiveSession();
        if (!session) return [];
        
        return session.currentStackFrames.map(frame => ({
            name: frame.name,
            file: frame.uri,
            line: frame.lineNumber
        }));
    }

    getBreakpoints(): DebugBreakpoint[] {
        const allBreakpoints: DebugBreakpoint[] = [];
        for (const [uri, breakpoints] of this.breakpoints) {
            allBreakpoints.push(...breakpoints.map(bp => ({
                id: bp.id,
                file: uri,
                line: bp.lineNumber,
                enabled: bp.enabled,
                verified: true
            })));
        }
        return allBreakpoints;
    }
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