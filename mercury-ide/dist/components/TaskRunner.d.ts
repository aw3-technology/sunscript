import { TaskRunnerService } from '../services/TaskRunnerService';
import { EventBus } from '../core/event-bus';
export declare class TaskRunner {
    private taskRunnerService;
    private eventBus;
    private container;
    private taskList;
    private runButton;
    private selectedTask;
    constructor(taskRunnerService: TaskRunnerService, eventBus: EventBus);
    private setupUI;
    private loadTasks;
    private selectTask;
    private runSelectedTask;
    getElement(): HTMLElement;
    refresh(): void;
}
