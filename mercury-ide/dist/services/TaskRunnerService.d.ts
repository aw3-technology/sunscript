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
export declare class TaskRunnerService {
    private eventBus;
    private outputChannelsService;
    private tasks;
    private executions;
    private nextExecutionId;
    constructor(eventBus: EventBus, outputChannelsService: OutputChannelsService);
    private setupEventListeners;
    private initializeDefaultTasks;
    registerTask(task: Task): void;
    unregisterTask(taskId: string): void;
    runTask(taskId: string): Promise<string>;
    private executeTask;
    private simulateBuildTask;
    private simulateTestTask;
    private simulateWatchTask;
    private simulateGenericTask;
    private delay;
    terminateExecution(executionId: string): void;
    getTasks(): Task[];
    getTask(taskId: string): Task | undefined;
    getTasksByGroup(group: Task['group']): Task[];
    getRunningExecutions(): TaskExecution[];
    getExecution(executionId: string): TaskExecution | undefined;
    buildProject(): Promise<string>;
    runTests(): Promise<string>;
    startWatchMode(): Promise<string>;
    lintCode(): Promise<string>;
    cleanBuild(): Promise<string>;
}
