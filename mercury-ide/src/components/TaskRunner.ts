import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { TaskRunnerService } from '../services/TaskRunnerService';
import { EventBus } from '../core/event-bus';

@injectable()
export class TaskRunner {
    private container: HTMLElement;
    private taskList: HTMLElement;
    private runButton: HTMLButtonElement;
    private selectedTask: string | null = null;

    constructor(
        @inject(TYPES.TaskRunnerService) private taskRunnerService: TaskRunnerService,
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.container = document.createElement('div');
        this.container.className = 'task-runner-panel';
        
        this.taskList = document.createElement('div');
        this.taskList.className = 'task-list';
        
        this.runButton = document.createElement('button') as HTMLButtonElement;
        this.runButton.className = 'run-task-button';
        this.runButton.textContent = 'Run Task';
        this.runButton.disabled = true;
        this.runButton.onclick = () => this.runSelectedTask();
        
        this.setupUI();
        this.loadTasks();
    }

    private setupUI(): void {
        const header = document.createElement('div');
        header.className = 'task-runner-header';
        header.innerHTML = '<h3>Tasks</h3>';
        
        this.container.appendChild(header);
        this.container.appendChild(this.taskList);
        this.container.appendChild(this.runButton);
    }

    private async loadTasks(): Promise<void> {
        const tasks = await this.taskRunnerService.getTasks();
        this.taskList.innerHTML = '';
        
        tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.textContent = task.label;
            taskItem.onclick = () => this.selectTask(task.name);
            this.taskList.appendChild(taskItem);
        });
    }

    private selectTask(taskName: string): void {
        this.selectedTask = taskName;
        this.runButton.disabled = false;
        
        // Update UI to show selected task
        const taskItems = this.taskList.querySelectorAll('.task-item');
        taskItems.forEach(item => {
            if (item.textContent === taskName) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    private async runSelectedTask(): Promise<void> {
        if (!this.selectedTask) return;
        
        try {
            this.runButton.disabled = true;
            this.runButton.textContent = 'Running...';
            
            await this.taskRunnerService.runTask(this.selectedTask);
            
            this.eventBus.emit('task:completed', { task: this.selectedTask });
        } catch (error) {
            this.eventBus.emit('task:error', { task: this.selectedTask, error });
        } finally {
            this.runButton.disabled = false;
            this.runButton.textContent = 'Run Task';
        }
    }

    public getElement(): HTMLElement {
        return this.container;
    }

    public refresh(): void {
        this.loadTasks();
    }
}