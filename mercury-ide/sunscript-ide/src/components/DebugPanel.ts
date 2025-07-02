import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { DebuggerService } from '../services/DebuggerService';

@injectable()
export class DebugPanel {
    private container: HTMLElement | null = null;
    private variablesView: HTMLElement | null = null;
    private callStackView: HTMLElement | null = null;
    private breakpointsView: HTMLElement | null = null;
    
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.DebuggerService) private debuggerService: DebuggerService
    ) {
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        this.eventBus.on('debugger.paused', () => {
            this.updateDebugState();
        });
        
        this.eventBus.on('debugger.resumed', () => {
            this.updateDebugState();
        });
        
        this.eventBus.on('debugger.variablesUpdated', () => {
            this.updateVariables();
        });
        
        this.eventBus.on('debugger.callStackUpdated', () => {
            this.updateCallStack();
        });
    }
    
    render(container: HTMLElement): void {
        this.container = container;
        container.innerHTML = `
            <div class="debug-panel">
                <div class="debug-controls">
                    <button class="debug-btn continue" title="Continue">▶</button>
                    <button class="debug-btn pause" title="Pause">⏸</button>
                    <button class="debug-btn step-over" title="Step Over">⤵</button>
                    <button class="debug-btn step-into" title="Step Into">⬇</button>
                    <button class="debug-btn step-out" title="Step Out">⬆</button>
                    <button class="debug-btn restart" title="Restart">↻</button>
                    <button class="debug-btn stop" title="Stop">⏹</button>
                </div>
                
                <div class="debug-views">
                    <div class="debug-section">
                        <h4>Variables</h4>
                        <div class="variables-view"></div>
                    </div>
                    
                    <div class="debug-section">
                        <h4>Call Stack</h4>
                        <div class="callstack-view"></div>
                    </div>
                    
                    <div class="debug-section">
                        <h4>Breakpoints</h4>
                        <div class="breakpoints-view"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupControls();
        this.variablesView = container.querySelector('.variables-view');
        this.callStackView = container.querySelector('.callstack-view');
        this.breakpointsView = container.querySelector('.breakpoints-view');
        
        this.updateDebugState();
    }
    
    private setupControls(): void {
        const controls = this.container?.querySelector('.debug-controls');
        if (!controls) return;
        
        controls.querySelector('.continue')?.addEventListener('click', () => {
            this.debuggerService.continue();
        });
        
        controls.querySelector('.pause')?.addEventListener('click', () => {
            this.debuggerService.pause();
        });
        
        controls.querySelector('.step-over')?.addEventListener('click', () => {
            this.debuggerService.stepOver();
        });
        
        controls.querySelector('.step-into')?.addEventListener('click', () => {
            this.debuggerService.stepInto();
        });
        
        controls.querySelector('.step-out')?.addEventListener('click', () => {
            this.debuggerService.stepOut();
        });
        
        controls.querySelector('.restart')?.addEventListener('click', () => {
            this.debuggerService.restart();
        });
        
        controls.querySelector('.stop')?.addEventListener('click', () => {
            this.debuggerService.stop();
        });
    }
    
    private updateDebugState(): void {
        const isPaused = this.debuggerService.isPaused();
        const isActive = this.debuggerService.isActive();
        
        // Update control button states
        const controls = this.container?.querySelector('.debug-controls');
        if (controls) {
            controls.querySelectorAll('.debug-btn').forEach(btn => {
                btn.classList.toggle('disabled', !isActive);
            });
            
            const continueBtn = controls.querySelector('.continue');
            const pauseBtn = controls.querySelector('.pause');
            if (continueBtn && pauseBtn) {
                continueBtn.classList.toggle('disabled', !isPaused);
                pauseBtn.classList.toggle('disabled', isPaused || !isActive);
            }
        }
        
        if (isPaused) {
            this.updateVariables();
            this.updateCallStack();
        }
    }
    
    private async updateVariables(): Promise<void> {
        if (!this.variablesView) return;
        
        const variables = await this.debuggerService.getVariables();
        this.variablesView.innerHTML = this.renderVariables(variables);
    }
    
    private renderVariables(variables: any[]): string {
        return variables.map(v => `
            <div class="variable-item">
                <span class="variable-name">${v.name}</span>
                <span class="variable-value">${v.value}</span>
            </div>
        `).join('');
    }
    
    private async updateCallStack(): Promise<void> {
        if (!this.callStackView) return;
        
        const frames = await this.debuggerService.getCallStack();
        this.callStackView.innerHTML = frames.map((frame, index) => `
            <div class="callstack-frame" data-frame-id="${frame.id}">
                <span class="frame-name">${frame.name}</span>
                <span class="frame-location">${frame.source}:${frame.line}</span>
            </div>
        `).join('');
    }
    
    dispose(): void {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}