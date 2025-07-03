import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { Editor } from './Editor';
import { FileExplorer } from './FileExplorer';
import { OutputPanel } from './OutputPanel';
import { Toolbar } from './Toolbar';
import { FileSystemService } from '../services/FileSystemService';
import { SunScriptCompilerService } from '../services/SunScriptCompilerService';
import { EventBus } from '../core/event-bus';
import { CommandRegistry } from '../core/command-registry';
import { CommandPalette } from './CommandPalette';
import { QuickOpen } from './QuickOpen';
import { AIChatPanel } from './AIChatPanel';
import { AIConfigDialog } from './AIConfigDialog';

@injectable()
export class App {
    private rootElement: HTMLElement | null = null;
    
    constructor(
        @inject(TYPES.Editor) private editor: Editor,
        @inject(TYPES.FileExplorer) private fileExplorer: FileExplorer,
        @inject(TYPES.OutputPanel) private outputPanel: OutputPanel,
        @inject(TYPES.Toolbar) private toolbar: Toolbar,
        @inject(TYPES.FileSystemService) private fileSystemService: FileSystemService,
        @inject(TYPES.CompilerService) private compilerService: SunScriptCompilerService,
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.CommandRegistry) private commandRegistry: CommandRegistry,
        @inject(TYPES.CommandPalette) private commandPalette: CommandPalette,
        @inject(TYPES.QuickOpen) private quickOpen: QuickOpen,
        @inject(TYPES.AIChatPanel) private aiChatPanel: AIChatPanel,
        @inject(TYPES.AIConfigDialog) private aiConfigDialog: AIConfigDialog
    ) {
        this.setupEventListeners();
    }
    
    mount(rootElement: HTMLElement): void {
        this.rootElement = rootElement;
        this.render();
        this.editor.initialize();
        
        // Mount command palette and quick open overlays
        this.commandPalette.mount(document.body);
        this.quickOpen.mount(document.body);
        this.aiConfigDialog.mount(document.body);
        
        // Mount AI chat panel in sidebar (you may want to add this to a tabbed interface)
        const aiChatContainer = document.createElement('div');
        aiChatContainer.id = 'ai-chat-panel';
        aiChatContainer.style.display = 'none'; // Initially hidden
        document.body.appendChild(aiChatContainer);
        this.aiChatPanel.mount(aiChatContainer);
    }
    
    private render(): void {
        if (!this.rootElement) return;
        
        this.rootElement.innerHTML = `
            <div class="sidebar">
                <div class="file-explorer-header">
                    <span>Explorer</span>
                </div>
                <div id="file-explorer" class="file-explorer"></div>
            </div>
            <div class="main-content">
                <div id="toolbar" class="toolbar"></div>
                <div class="editor-container">
                    <div class="editor-tabs">
                        <div class="editor-tab active">
                            <span>untitled.sun</span>
                            <span class="close-btn">×</span>
                        </div>
                    </div>
                    <div id="editor-wrapper" class="editor-wrapper"></div>
                </div>
                <div id="output-panel" class="output-panel"></div>
                <div class="status-bar">
                    <span>Ready</span>
                </div>
            </div>
        `;
        
        const toolbarEl = document.getElementById('toolbar');
        const editorEl = document.getElementById('editor-wrapper');
        const fileExplorerEl = document.getElementById('file-explorer');
        const outputPanelEl = document.getElementById('output-panel');
        
        if (toolbarEl) this.toolbar.mount(toolbarEl);
        if (editorEl) this.editor.mount(editorEl);
        if (fileExplorerEl) this.fileExplorer.mount(fileExplorerEl);
        if (outputPanelEl) this.outputPanel.mount(outputPanelEl);
    }
    
    private setupEventListeners(): void {
        // Listen to command events through the event bus
        this.eventBus.on('file.new', () => this.handleNewFile());
        this.eventBus.on('file.open', () => this.handleOpenFile());
        this.eventBus.on('file.save', () => this.handleSaveFile());
        
        // Legacy toolbar events (will be refactored later)
        this.toolbar.onRun(() => this.handleRun());
        this.toolbar.onBuild(() => this.handleBuild());
        
        this.fileExplorer.onFileSelect((file) => {
            this.editor.openFile(file);
        });
    }
    
    private async handleRun(): Promise<void> {
        const code = this.editor.getValue();
        this.outputPanel.clear();
        this.outputPanel.log('Running SunScript code...');
        
        try {
            const result = await this.compilerService.run(code);
            this.outputPanel.log(result);
        } catch (error) {
            this.outputPanel.error(`Error: ${error}`);
        }
    }
    
    private async handleBuild(): Promise<void> {
        const code = this.editor.getValue();
        this.outputPanel.clear();
        this.outputPanel.log('Building SunScript project...');
        
        try {
            const result = await this.compilerService.build(code);
            this.outputPanel.log('Build successful!');
            this.outputPanel.log(result);
        } catch (error) {
            this.outputPanel.error(`Build failed: ${error}`);
        }
    }
    
    private handleNewFile(): void {
        this.editor.newFile();
    }
    
    private handleOpenFile(): void {
        // Implement file picker dialog
        console.log('Open file');
    }
    
    private handleSaveFile(): void {
        const content = this.editor.getValue();
        const filename = this.editor.getCurrentFileName();
        this.fileSystemService.saveFile(filename, content);
        this.outputPanel.log(`Saved ${filename}`);
    }
}