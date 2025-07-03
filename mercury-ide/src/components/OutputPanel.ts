import { injectable } from 'inversify';

@injectable()
export class OutputPanel {
    private container: HTMLElement | null = null;
    private outputContent: HTMLElement | null = null;
    
    mount(container: HTMLElement): void {
        this.container = container;
        this.render();
    }
    
    private render(): void {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="output-header">
                <span>Output</span>
                <button id="clear-output" style="padding: 2px 8px; font-size: 12px;">Clear</button>
            </div>
            <div id="output-content" class="output-content"></div>
        `;
        
        this.outputContent = this.container.querySelector('#output-content');
        
        const clearBtn = this.container.querySelector('#clear-output');
        clearBtn?.addEventListener('click', () => this.clear());
    }
    
    log(message: string): void {
        if (!this.outputContent) return;
        
        const entry = document.createElement('div');
        entry.style.marginBottom = '4px';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.outputContent.appendChild(entry);
        this.scrollToBottom();
    }
    
    error(message: string): void {
        if (!this.outputContent) return;
        
        const entry = document.createElement('div');
        entry.style.marginBottom = '4px';
        entry.style.color = '#f48771';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ERROR: ${message}`;
        this.outputContent.appendChild(entry);
        this.scrollToBottom();
    }
    
    clear(): void {
        if (this.outputContent) {
            this.outputContent.innerHTML = '';
        }
    }
    
    private scrollToBottom(): void {
        if (this.outputContent) {
            this.outputContent.scrollTop = this.outputContent.scrollHeight;
        }
    }
}