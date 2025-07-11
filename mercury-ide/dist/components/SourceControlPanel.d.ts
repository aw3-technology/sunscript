import { EventBus } from '../core/event-bus';
import { GitService } from '../services/GitService';
import { SCMProviderFramework } from '../services/SCMProviderFramework';
import { FileIconService } from '../services/FileIconService';
export declare class SourceControlPanel {
    private eventBus;
    private gitService;
    private scmFramework;
    private fileIconService;
    private container;
    private currentRepository;
    private selectedFiles;
    private commitMessage;
    constructor(eventBus: EventBus, gitService: GitService, scmFramework: SCMProviderFramework, fileIconService: FileIconService);
    private setupEventListeners;
    private setupSCMProvider;
    private updateSCMProvider;
    mount(container: HTMLElement): void;
    private render;
    private renderSyncStatus;
    private renderChangesSection;
    private renderFileList;
    private renderFileActions;
    private attachEventListeners;
    private attachEmptyStateListeners;
    private handleCommit;
    private handlePull;
    private handlePush;
    private handleFetch;
    private handleGroupAction;
    private handleFileAction;
    private handleFileSelection;
    private toggleGroup;
    private updateCommitButton;
    private showCommitMenu;
    private showBranchMenu;
    private getRepositoryName;
    private getFileName;
    private getStatusIcon;
    private getStatusText;
    private refresh;
    show(): void;
    hide(): void;
    focusCommitMessage(): void;
    setCommitMessage(message: string): void;
}
