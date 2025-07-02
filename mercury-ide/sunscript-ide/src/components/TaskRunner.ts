import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { TaskRunnerService } from '../services/TaskRunnerService';

@injectable()
export class TaskRunner {
    private container: HTMLElement | null = null;
    private taskList: HTMLElement | null = null;
    
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.TaskRunnerService) private taskRunnerService: TaskRunnerService
    ) {
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        this.eventBus.on('task.started', (event) => {
            this.updateTaskStatus(event.data.taskId, 'running');
        });
        
        this.eventBus.on('task.completed', (event) => {
            this.updateTaskStatus(event.data.taskId, 'completed');
        });
        
        this.eventBus.on('task.failed', (event) => {
            this.updateTaskStatus(event.data.taskId, 'failed');
        });
    }
    
    render(container: HTMLElement): void {
        this.container = container;
        container.innerHTML = `
            <div class="task-runner">
                <div class="task-runner-header">
                    <h3>Tasks</h3>
                    <button class="refresh-btn" title="Refresh">↻</button>
                </div>
                <div class="task-list"></div>
            </div>
        `;
        
        this.taskList = container.querySelector('.task-list');
        
        // Setup refresh button
        const refreshBtn = container.querySelector('.refresh-btn') as HTMLButtonElement;
        refreshBtn?.addEventListener('click', () => this.refresh());
        
        this.refresh();
    }
    
    private async refresh(): Promise<void> {
        const tasks = await this.taskRunnerService.getTasks();
        this.renderTasks(tasks);
    }
    
    private renderTasks(tasks: any[]): void {
        if (!this.taskList) return;
        
        this.taskList.innerHTML = tasks.map(task => `
            <div class="task-item" data-task-id="${task.id}">
                <span class="task-name">${task.name}</span>
                <span class="task-status status-${task.status}">${task.status}</span>
                <button class="run-task-btn" data-task-id="${task.id}">Run</button>
            </div>
        `).join('');
        
        // Setup task run buttons
        this.taskList.querySelectorAll('.run-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = (e.target as HTMLElement).getAttribute('data-task-id');
                if (taskId) {
                    this.taskRunnerService.runTask(taskId);
                }
            });
        });
    }
    
    private updateTaskStatus(taskId: string, status: string): void {
        const taskElement = this.taskList?.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            const statusElement = taskElement.querySelector('.task-status');
            if (statusElement) {
                statusElement.className = `task-status status-${status}`;
                statusElement.textContent = status;
            }
        }
    }
    
    dispose(): void {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}