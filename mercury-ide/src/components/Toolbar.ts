import { injectable } from 'inversify';

@injectable()
export class Toolbar {
    private container: HTMLElement | null = null;
    private runCallback: (() => void) | null = null;
    private buildCallback: (() => void) | null = null;
    private newFileCallback: (() => void) | null = null;
    private openFileCallback: (() => void) | null = null;
    private saveFileCallback: (() => void) | null = null;
    
    mount(container: HTMLElement): void {
        this.container = container;
        this.render();
    }
    
    private render(): void {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <button id="new-file-btn" title="New File">New</button>
            <button id="open-file-btn" title="Open File">Open</button>
            <button id="save-file-btn" title="Save File">Save</button>
            <div style="width: 1px; height: 20px; background-color: #3e3e42; margin: 0 5px;"></div>
            <button id="run-btn" title="Run SunScript">Run</button>
            <button id="build-btn" title="Build Project">Build</button>
        `;
        
        this.attachEventListeners();
    }
    
    private attachEventListeners(): void {
        if (!this.container) return;
        
        const runBtn = this.container.querySelector('#run-btn');
        const buildBtn = this.container.querySelector('#build-btn');
        const newFileBtn = this.container.querySelector('#new-file-btn');
        const openFileBtn = this.container.querySelector('#open-file-btn');
        const saveFileBtn = this.container.querySelector('#save-file-btn');
        
        runBtn?.addEventListener('click', () => this.runCallback?.());
        buildBtn?.addEventListener('click', () => this.buildCallback?.());
        newFileBtn?.addEventListener('click', () => this.newFileCallback?.());
        openFileBtn?.addEventListener('click', () => this.openFileCallback?.());
        saveFileBtn?.addEventListener('click', () => this.saveFileCallback?.());
    }
    
    onRun(callback: () => void): void {
        this.runCallback = callback;
    }
    
    onBuild(callback: () => void): void {
        this.buildCallback = callback;
    }
    
    onNewFile(callback: () => void): void {
        this.newFileCallback = callback;
    }
    
    onOpenFile(callback: () => void): void {
        this.openFileCallback = callback;
    }
    
    onSaveFile(callback: () => void): void {
        this.saveFileCallback = callback;
    }
}