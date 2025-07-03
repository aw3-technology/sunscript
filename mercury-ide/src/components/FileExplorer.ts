import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { FileSystemService, FileItem } from '../services/FileSystemService';

@injectable()
export class FileExplorer {
    private container: HTMLElement | null = null;
    private fileSelectCallback: ((file: { name: string; content: string }) => void) | null = null;
    
    constructor(
        @inject(TYPES.FileSystemService) private fileSystemService: FileSystemService
    ) {}
    
    async mount(container: HTMLElement): Promise<void> {
        this.container = container;
        await this.render();
    }
    
    private async render(): Promise<void> {
        if (!this.container) return;
        
        const files = await this.fileSystemService.getFiles();
        this.container.innerHTML = this.renderFileTree(files);
        this.attachEventListeners();
    }
    
    private renderFileTree(files: FileItem[]): string {
        return `
            <div class="file-tree">
                ${files.map(file => this.renderFileItem(file)).join('')}
            </div>
        `;
    }
    
    private renderFileItem(file: FileItem, level: number = 0): string {
        const padding = level * 20;
        const icon = file.type === 'folder' ? '📁' : '📄';
        
        let html = `
            <div class="file-item" data-path="${file.path}" data-type="${file.type}" style="padding-left: ${padding}px">
                <span class="file-icon">${icon}</span>
                <span>${file.name}</span>
            </div>
        `;
        
        if (file.type === 'folder' && file.children) {
            html += file.children.map(child => this.renderFileItem(child, level + 1)).join('');
        }
        
        return html;
    }
    
    private attachEventListeners(): void {
        if (!this.container) return;
        
        this.container.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                const target = e.currentTarget as HTMLElement;
                const path = target.dataset.path;
                const type = target.dataset.type;
                
                if (type === 'file' && path) {
                    // Remove previous selection
                    this.container?.querySelectorAll('.file-item').forEach(el => {
                        el.classList.remove('selected');
                    });
                    
                    // Add selection to current item
                    target.classList.add('selected');
                    
                    // Load file content
                    const content = await this.fileSystemService.loadFile(path);
                    if (this.fileSelectCallback) {
                        this.fileSelectCallback({ name: path, content });
                    }
                }
            });
        });
    }
    
    onFileSelect(callback: (file: { name: string; content: string }) => void): void {
        this.fileSelectCallback = callback;
    }
    
    refresh(): void {
        this.render();
    }
}