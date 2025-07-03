import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { DebugService } from '../services/DebugService';
import { EventBus } from '../core/event-bus';

@injectable()
export class DebugPanel {
    private container: HTMLElement;
    private controlsContainer: HTMLElement;
    private variablesContainer: HTMLElement;
    private callStackContainer: HTMLElement;
    private breakpointsContainer: HTMLElement;

    constructor(
        @inject(TYPES.DebugService) private debugService: DebugService,
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.container = document.createElement('div');
        this.container.className = 'debug-panel';
        
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.className = 'debug-controls';
        
        this.variablesContainer = document.createElement('div');
        this.variablesContainer.className = 'debug-variables';
        
        this.callStackContainer = document.createElement('div');
        this.callStackContainer.className = 'debug-callstack';
        
        this.breakpointsContainer = document.createElement('div');
        this.breakpointsContainer.className = 'debug-breakpoints';
        
        this.setupUI();
        this.bindEvents();
    }

    private setupUI(): void {
        // Debug controls
        const controls = [
            { icon: '▶️', action: 'continue', title: 'Continue' },
            { icon: '⏸️', action: 'pause', title: 'Pause' },
            { icon: '⏹️', action: 'stop', title: 'Stop' },
            { icon: '⏭️', action: 'stepOver', title: 'Step Over' },
            { icon: '⬇️', action: 'stepInto', title: 'Step Into' },
            { icon: '⬆️', action: 'stepOut', title: 'Step Out' },
            { icon: '🔄', action: 'restart', title: 'Restart' }
        ];

        controls.forEach(control => {
            const button = document.createElement('button');
            button.className = 'debug-control-button';
            button.textContent = control.icon;
            button.title = control.title;
            button.onclick = () => this.handleDebugAction(control.action);
            this.controlsContainer.appendChild(button);
        });

        // Variables section
        const variablesHeader = document.createElement('div');
        variablesHeader.className = 'debug-section-header';
        variablesHeader.textContent = 'Variables';
        this.variablesContainer.appendChild(variablesHeader);

        const variablesList = document.createElement('div');
        variablesList.className = 'variables-list';
        this.variablesContainer.appendChild(variablesList);

        // Call stack section
        const callStackHeader = document.createElement('div');
        callStackHeader.className = 'debug-section-header';
        callStackHeader.textContent = 'Call Stack';
        this.callStackContainer.appendChild(callStackHeader);

        const callStackList = document.createElement('div');
        callStackList.className = 'callstack-list';
        this.callStackContainer.appendChild(callStackList);

        // Breakpoints section
        const breakpointsHeader = document.createElement('div');
        breakpointsHeader.className = 'debug-section-header';
        breakpointsHeader.textContent = 'Breakpoints';
        this.breakpointsContainer.appendChild(breakpointsHeader);

        const breakpointsList = document.createElement('div');
        breakpointsList.className = 'breakpoints-list';
        this.breakpointsContainer.appendChild(breakpointsList);

        // Add all sections to container
        this.container.appendChild(this.controlsContainer);
        this.container.appendChild(this.variablesContainer);
        this.container.appendChild(this.callStackContainer);
        this.container.appendChild(this.breakpointsContainer);
    }

    private bindEvents(): void {
        this.eventBus.on('debug:stateChanged', () => this.updateDebugState());
        this.eventBus.on('debug:variablesChanged', () => this.updateVariables());
        this.eventBus.on('debug:callStackChanged', () => this.updateCallStack());
        this.eventBus.on('debug:breakpointsChanged', () => this.updateBreakpoints());
    }

    private async handleDebugAction(action: string): Promise<void> {
        switch (action) {
            case 'continue':
                await this.debugService.continue();
                break;
            case 'pause':
                await this.debugService.pause();
                break;
            case 'stop':
                await this.debugService.stop();
                break;
            case 'stepOver':
                await this.debugService.stepOver();
                break;
            case 'stepInto':
                await this.debugService.stepInto();
                break;
            case 'stepOut':
                await this.debugService.stepOut();
                break;
            case 'restart':
                await this.debugService.restart();
                break;
        }
    }

    private updateDebugState(): void {
        const state = this.debugService.getState();
        const buttons = this.controlsContainer.querySelectorAll('button');
        
        buttons.forEach(button => {
            button.disabled = !state.isRunning && button.title !== 'Continue';
        });
    }

    private updateVariables(): void {
        const variables = this.debugService.getVariables();
        const variablesList = this.variablesContainer.querySelector('.variables-list');
        if (!variablesList) return;

        variablesList.innerHTML = '';
        variables.forEach(variable => {
            const item = document.createElement('div');
            item.className = 'variable-item';
            item.innerHTML = `<span class="variable-name">${variable.name}</span>: <span class="variable-value">${variable.value}</span>`;
            variablesList.appendChild(item);
        });
    }

    private updateCallStack(): void {
        const callStack = this.debugService.getCallStack();
        const callStackList = this.callStackContainer.querySelector('.callstack-list');
        if (!callStackList) return;

        callStackList.innerHTML = '';
        callStack.forEach((frame, index) => {
            const item = document.createElement('div');
            item.className = 'callstack-item';
            item.innerHTML = `<span class="frame-index">${index}</span> ${frame.name} (${frame.file}:${frame.line})`;
            callStackList.appendChild(item);
        });
    }

    private updateBreakpoints(): void {
        const breakpoints = this.debugService.getBreakpoints();
        const breakpointsList = this.breakpointsContainer.querySelector('.breakpoints-list');
        if (!breakpointsList) return;

        breakpointsList.innerHTML = '';
        breakpoints.forEach(breakpoint => {
            const item = document.createElement('div');
            item.className = 'breakpoint-item';
            item.innerHTML = `
                <input type="checkbox" ${breakpoint.enabled ? 'checked' : ''} 
                       onchange="debugService.toggleBreakpoint('${breakpoint.id}')">
                <span>${breakpoint.file}:${breakpoint.line}</span>
            `;
            breakpointsList.appendChild(item);
        });
    }

    public getElement(): HTMLElement {
        return this.container;
    }

    public show(): void {
        this.container.style.display = 'block';
    }

    public hide(): void {
        this.container.style.display = 'none';
    }
}