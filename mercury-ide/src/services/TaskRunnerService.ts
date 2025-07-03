import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { OutputChannelsService } from './OutputChannelsService';

export interface Task {
    id: string;
    name: string;
    label: string;
    description?: string;
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    group?: 'build' | 'test' | 'watch' | 'custom';
    isBackground?: boolean;
    dependsOn?: string[];
    problemMatcher?: string;
    presentation?: TaskPresentation;
}

export interface TaskPresentation {
    echo?: boolean;
    reveal?: 'always' | 'silent' | 'never';
    focus?: boolean;
    panel?: 'shared' | 'dedicated' | 'new';
    showReuseMessage?: boolean;
    clear?: boolean;
}

export interface TaskExecution {
    id: string;
    taskId: string;
    status: 'running' | 'completed' | 'failed' | 'terminated';
    startTime: Date;
    endTime?: Date;
    exitCode?: number;
    outputChannelId?: string;
}

@injectable()
export class TaskRunnerService {
    private tasks = new Map<string, Task>();
    private executions = new Map<string, TaskExecution>();
    private nextExecutionId = 1;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.OutputChannelsService) private outputChannelsService: OutputChannelsService
    ) {
        this.initializeDefaultTasks();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('task.run', (event) => {
            const { taskId } = event.data;
            this.runTask(taskId);
        });

        this.eventBus.on('task.terminate', (event) => {
            const { executionId } = event.data;
            this.terminateExecution(executionId);
        });
    }

    private initializeDefaultTasks(): void {
        // Define default SunScript tasks
        const defaultTasks: Task[] = [
            {
                id: 'sunscript.build',
                name: 'Build SunScript Project',
                label: 'Build',
                description: 'Compile SunScript code to JavaScript',
                command: 'npm',
                args: ['run', 'build'],
                group: 'build',
                presentation: {
                    echo: true,
                    reveal: 'always',
                    focus: false,
                    panel: 'shared',
                    clear: true
                }
            },
            {
                id: 'sunscript.test',
                name: 'Run Tests',
                label: 'Test',
                description: 'Execute SunScript test suite',
                command: 'npm',
                args: ['test'],
                group: 'test',
                presentation: {
                    echo: true,
                    reveal: 'always',
                    focus: false,
                    panel: 'shared',
                    clear: true
                }
            },
            {
                id: 'sunscript.watch',
                name: 'Watch Build',
                label: 'Watch',
                description: 'Watch for changes and rebuild',
                command: 'npm',
                args: ['run', 'watch'],
                group: 'watch',
                isBackground: true,
                presentation: {
                    echo: true,
                    reveal: 'always',
                    focus: false,
                    panel: 'dedicated',
                    clear: false
                }
            },
            {
                id: 'sunscript.lint',
                name: 'Lint Code',
                label: 'Lint',
                description: 'Check code quality and style',
                command: 'npm',
                args: ['run', 'lint'],
                group: 'build',
                presentation: {
                    echo: true,
                    reveal: 'silent',
                    focus: false,
                    panel: 'shared',
                    clear: true
                }
            },
            {
                id: 'sunscript.clean',
                name: 'Clean Build',
                label: 'Clean',
                description: 'Remove build artifacts',
                command: 'rm',
                args: ['-rf', 'dist'],
                group: 'build',
                presentation: {
                    echo: true,
                    reveal: 'silent',
                    focus: false,
                    panel: 'shared',
                    clear: false
                }
            }
        ];

        defaultTasks.forEach(task => this.registerTask(task));
    }

    registerTask(task: Task): void {
        this.tasks.set(task.id, task);
        this.eventBus.emit('task.registered', { task });
    }

    unregisterTask(taskId: string): void {
        if (this.tasks.delete(taskId)) {
            this.eventBus.emit('task.unregistered', { taskId });
        }
    }

    async runTask(taskId: string): Promise<string> {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        // Check dependencies
        if (task.dependsOn) {
            for (const depTaskId of task.dependsOn) {
                await this.runTask(depTaskId);
            }
        }

        const executionId = `execution-${this.nextExecutionId++}`;
        const execution: TaskExecution = {
            id: executionId,
            taskId,
            status: 'running',
            startTime: new Date()
        };

        // Create dedicated output channel if needed
        let outputChannelId = 'build'; // default
        if (task.presentation?.panel === 'dedicated') {
            outputChannelId = `task-${taskId}`;
            this.outputChannelsService.createChannel(task.name, outputChannelId);
        } else if (task.group) {
            outputChannelId = task.group;
        }

        execution.outputChannelId = outputChannelId;
        this.executions.set(executionId, execution);

        this.eventBus.emit('task.started', { executionId, task });

        // Clear output if requested
        if (task.presentation?.clear) {
            this.outputChannelsService.clear(outputChannelId);
        }

        // Show command if echo is enabled
        if (task.presentation?.echo) {
            const commandLine = [task.command, ...(task.args || [])].join(' ');
            this.outputChannelsService.appendLine(
                outputChannelId,
                `> Executing task: ${task.name}`,
                'info'
            );
            this.outputChannelsService.appendLine(
                outputChannelId,
                `> ${commandLine}`,
                'info'
            );
            this.outputChannelsService.appendLine(outputChannelId, '', 'info');
        }

        // Activate output channel if requested
        if (task.presentation?.reveal === 'always' || 
            (task.presentation?.reveal !== 'never' && task.presentation?.reveal !== 'silent')) {
            this.outputChannelsService.setActiveChannel(outputChannelId);
        }

        try {
            // Simulate task execution
            await this.executeTask(task, execution, outputChannelId);
            
            execution.status = 'completed';
            execution.endTime = new Date();
            execution.exitCode = 0;

            this.eventBus.emit('task.completed', { executionId, task, execution });

        } catch (error) {
            execution.status = 'failed';
            execution.endTime = new Date();
            execution.exitCode = 1;

            this.outputChannelsService.appendLine(
                outputChannelId,
                `Task failed: ${error}`,
                'error'
            );

            this.eventBus.emit('task.failed', { executionId, task, execution, error });
            throw error;
        }

        return executionId;
    }

    private async executeTask(task: Task, execution: TaskExecution, outputChannelId: string): Promise<void> {
        // Simulate different task types
        const commandLine = [task.command, ...(task.args || [])].join(' ');

        switch (task.group) {
            case 'build':
                await this.simulateBuildTask(task, outputChannelId);
                break;
            case 'test':
                await this.simulateTestTask(task, outputChannelId);
                break;
            case 'watch':
                await this.simulateWatchTask(task, outputChannelId);
                break;
            default:
                await this.simulateGenericTask(task, outputChannelId);
        }
    }

    private async simulateBuildTask(task: Task, outputChannelId: string): Promise<void> {
        const steps = [
            'Cleaning previous build...',
            'Compiling SunScript files...',
            'Generating type definitions...',
            'Bundling assets...',
            'Optimizing output...',
            'Build completed successfully!'
        ];

        for (let i = 0; i < steps.length; i++) {
            await this.delay(500 + Math.random() * 1000);
            this.outputChannelsService.appendLine(outputChannelId, steps[i], 'info');
            
            if (i === 2) {
                // Simulate a warning
                this.outputChannelsService.appendLine(
                    outputChannelId, 
                    'Warning: Unused variable "temp" in main.sun:42',
                    'warn'
                );
            }
        }
    }

    private async simulateTestTask(task: Task, outputChannelId: string): Promise<void> {
        const testFiles = ['auth.test.sun', 'api.test.sun', 'utils.test.sun'];
        
        this.outputChannelsService.appendLine(outputChannelId, 'Starting test suite...', 'info');
        
        for (const file of testFiles) {
            await this.delay(800);
            this.outputChannelsService.appendLine(outputChannelId, `Running tests in ${file}`, 'info');
            
            await this.delay(500);
            const testCount = Math.floor(Math.random() * 5) + 3;
            this.outputChannelsService.appendLine(
                outputChannelId, 
                `  ✓ ${testCount} tests passed`,
                'info'
            );
        }

        await this.delay(300);
        this.outputChannelsService.appendLine(
            outputChannelId,
            'Test suite completed: 12 tests passed, 0 failed',
            'info'
        );
    }

    private async simulateWatchTask(task: Task, outputChannelId: string): Promise<void> {
        this.outputChannelsService.appendLine(outputChannelId, 'Starting watch mode...', 'info');
        this.outputChannelsService.appendLine(outputChannelId, 'Watching for file changes...', 'info');
        
        // Simulate periodic file change detection
        const watchLoop = async () => {
            await this.delay(5000 + Math.random() * 10000);
            this.outputChannelsService.appendLine(
                outputChannelId,
                `File changed: src/main.sun - recompiling...`,
                'info'
            );
            await this.delay(1000);
            this.outputChannelsService.appendLine(outputChannelId, 'Compilation successful', 'info');
            
            if (task.isBackground) {
                watchLoop(); // Continue watching
            }
        };

        if (task.isBackground) {
            watchLoop();
        }
    }

    private async simulateGenericTask(task: Task, outputChannelId: string): Promise<void> {
        const command = [task.command, ...(task.args || [])].join(' ');
        
        this.outputChannelsService.appendLine(outputChannelId, `Executing: ${command}`, 'info');
        await this.delay(1000 + Math.random() * 2000);
        this.outputChannelsService.appendLine(outputChannelId, 'Command completed successfully', 'info');
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    terminateExecution(executionId: string): void {
        const execution = this.executions.get(executionId);
        if (execution && execution.status === 'running') {
            execution.status = 'terminated';
            execution.endTime = new Date();
            execution.exitCode = -1;

            if (execution.outputChannelId) {
                this.outputChannelsService.appendLine(
                    execution.outputChannelId,
                    'Task terminated by user',
                    'warn'
                );
            }

            this.eventBus.emit('task.terminated', { executionId, execution });
        }
    }

    getTasks(): Task[] {
        return Array.from(this.tasks.values());
    }

    getTask(taskId: string): Task | undefined {
        return this.tasks.get(taskId);
    }

    getTasksByGroup(group: Task['group']): Task[] {
        return this.getTasks().filter(task => task.group === group);
    }

    getRunningExecutions(): TaskExecution[] {
        return Array.from(this.executions.values()).filter(
            execution => execution.status === 'running'
        );
    }

    getExecution(executionId: string): TaskExecution | undefined {
        return this.executions.get(executionId);
    }

    // Quick run methods for common tasks
    async buildProject(): Promise<string> {
        return this.runTask('sunscript.build');
    }

    async runTests(): Promise<string> {
        return this.runTask('sunscript.test');
    }

    async startWatchMode(): Promise<string> {
        return this.runTask('sunscript.watch');
    }

    async lintCode(): Promise<string> {
        return this.runTask('sunscript.lint');
    }

    async cleanBuild(): Promise<string> {
        return this.runTask('sunscript.clean');
    }
}