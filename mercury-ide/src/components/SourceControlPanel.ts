import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { GitService, GitRepository, GitFileStatus } from '../services/GitService';
import { SCMProviderFramework, SCMProvider } from '../services/SCMProviderFramework';
import { FileIconService } from '../services/FileIconService';

@injectable()
export class SourceControlPanel {
    private container: HTMLElement | null = null;
    private currentRepository: GitRepository | null = null;
    private selectedFiles = new Set<string>();
    private commitMessage = '';

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.GitService) private gitService: GitService,
        @inject(TYPES.SCMProviderFramework) private scmFramework: SCMProviderFramework,
        @inject(TYPES.FileIconService) private fileIconService: FileIconService
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('git.repositoryDiscovered', (event) => {
            const { repository } = event.data;
            this.currentRepository = repository;
            this.setupSCMProvider(repository);
            this.refresh();
        });

        this.eventBus.on('git.statusChanged', (event) => {
            const { repository, status } = event.data;
            if (this.currentRepository && repository.id === this.currentRepository.id) {
                this.currentRepository.status = status;
                this.refresh();
            }
        });

        this.eventBus.on('git.fileStaged', () => {
            this.refresh();
        });

        this.eventBus.on('git.fileUnstaged', () => {
            this.refresh();
        });

        this.eventBus.on('git.committed', () => {
            this.commitMessage = '';
            this.selectedFiles.clear();
            this.refresh();
        });

        this.eventBus.on('git.branchSwitched', () => {
            this.refresh();
        });
    }

    private setupSCMProvider(repository: GitRepository): void {
        const provider = this.scmFramework.createSourceControl(
            'git',
            'Git',
            repository.path
        );

        // Create resource groups
        this.scmFramework.createResourceGroup('git', 'staged', 'Staged Changes');
        this.scmFramework.createResourceGroup('git', 'changes', 'Changes');
        this.scmFramework.createResourceGroup('git', 'untracked', 'Untracked Files');
        this.scmFramework.createResourceGroup('git', 'conflicted', 'Merge Conflicts');

        this.updateSCMProvider(provider, repository);
    }

    private updateSCMProvider(provider: SCMProvider, repository: GitRepository): void {
        const status = repository.status;

        // Update staged files
        const stagedResources = status.staged.map(file => ({
            resourceUri: `file://${file.path}`,
            command: {
                command: 'git.openFile',
                title: 'Open File',
                arguments: [file.path]
            },
            decorations: {
                tooltip: `Staged • ${this.getStatusText(file.status)}`,
                light: { iconPath: this.getStatusIcon(file.status) },
                dark: { iconPath: this.getStatusIcon(file.status) }
            },
            contextValue: 'git.staged'
        }));

        this.scmFramework.updateResourceGroup('git', 'staged', stagedResources);

        // Update unstaged files
        const unstagedResources = status.unstaged.map(file => ({
            resourceUri: `file://${file.path}`,
            command: {
                command: 'git.openFile',
                title: 'Open File',
                arguments: [file.path]
            },
            decorations: {
                tooltip: `Modified • ${this.getStatusText(file.status)}`,
                light: { iconPath: this.getStatusIcon(file.status) },
                dark: { iconPath: this.getStatusIcon(file.status) }
            },
            contextValue: 'git.unstaged'
        }));

        this.scmFramework.updateResourceGroup('git', 'changes', unstagedResources);

        // Update untracked files
        const untrackedResources = status.untracked.map(file => ({
            resourceUri: `file://${file.path}`,
            command: {
                command: 'git.openFile',
                title: 'Open File',
                arguments: [file.path]
            },
            decorations: {
                tooltip: 'Untracked',
                light: { iconPath: '📄' },
                dark: { iconPath: '📄' }
            },
            contextValue: 'git.untracked'
        }));

        this.scmFramework.updateResourceGroup('git', 'untracked', untrackedResources);

        // Update conflicted files
        const conflictedResources = status.conflicted.map(file => ({
            resourceUri: `file://${file.path}`,
            command: {
                command: 'git.openFile',
                title: 'Open File',
                arguments: [file.path]
            },
            decorations: {
                tooltip: 'Merge Conflict',
                light: { iconPath: '⚠️' },
                dark: { iconPath: '⚠️' }
            },
            contextValue: 'git.conflicted'
        }));

        this.scmFramework.updateResourceGroup('git', 'conflicted', conflictedResources);

        // Update provider count
        provider.count = status.staged.length + status.unstaged.length + status.untracked.length + status.conflicted.length;
    }

    mount(container: HTMLElement): void {
        this.container = container;
        this.render();
    }

    private async render(): Promise<void> {
        if (!this.container) return;

        if (!this.currentRepository) {
            this.container.innerHTML = `
                <div class="source-control-panel">
                    <div class="scm-empty">
                        <div class="scm-empty-icon">📁</div>
                        <div class="scm-empty-title">No Source Control</div>
                        <div class="scm-empty-message">No git repository detected in workspace</div>
                        <button class="scm-empty-action" id="init-repo">Initialize Repository</button>
                    </div>
                </div>
            `;
            this.attachEmptyStateListeners();
            return;
        }

        const status = this.currentRepository.status;
        const hasChanges = status.staged.length > 0 || status.unstaged.length > 0 || status.untracked.length > 0;

        this.container.innerHTML = `
            <div class="source-control-panel">
                <div class="scm-header">
                    <div class="scm-title-container">
                        <h3 class="scm-title">Source Control</h3>
                        <div class="scm-repository-info">
                            <span class="repo-icon">📂</span>
                            <span class="repo-name">${this.getRepositoryName()}</span>
                            <span class="branch-info">
                                <span class="branch-icon">🌿</span>
                                <span class="branch-name">${this.currentRepository.head?.name || 'main'}</span>
                            </span>
                        </div>
                    </div>
                    <div class="scm-actions">
                        <button class="scm-action-btn" id="refresh" title="Refresh">
                            🔄
                        </button>
                        <button class="scm-action-btn" id="fetch" title="Fetch">
                            ⬇️
                        </button>
                        <button class="scm-action-btn" id="pull" title="Pull">
                            ⤵️
                        </button>
                        <button class="scm-action-btn" id="push" title="Push">
                            ⤴️
                        </button>
                        <button class="scm-action-btn" id="branch" title="Branch">
                            🌿
                        </button>
                    </div>
                </div>

                <div class="sync-status">
                    ${this.renderSyncStatus()}
                </div>

                <div class="commit-section">
                    <div class="commit-input-container">
                        <textarea 
                            class="commit-message-input" 
                            id="commit-message"
                            placeholder="Message (press Ctrl+Enter to commit)"
                            rows="3"
                        >${this.commitMessage}</textarea>
                        <div class="commit-actions">
                            <button class="commit-btn" id="commit" ${!hasChanges || !this.commitMessage.trim() ? 'disabled' : ''}>
                                ✓ Commit
                            </button>
                            <button class="commit-menu-btn" id="commit-menu">
                                ▼
                            </button>
                        </div>
                    </div>
                </div>

                <div class="changes-container">
                    ${await this.renderChangesSection()}
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    private renderSyncStatus(): string {
        if (!this.currentRepository) return '';

        const status = this.currentRepository.status;
        const ahead = status.ahead;
        const behind = status.behind;

        if (ahead === 0 && behind === 0) {
            return '<div class="sync-status-item up-to-date">✓ Up to date</div>';
        }

        let statusItems = '';
        if (ahead > 0) {
            statusItems += `<div class="sync-status-item ahead">↑ ${ahead} ahead</div>`;
        }
        if (behind > 0) {
            statusItems += `<div class="sync-status-item behind">↓ ${behind} behind</div>`;
        }

        return statusItems;
    }

    private async renderChangesSection(): Promise<string> {
        if (!this.currentRepository) return '';

        const status = this.currentRepository.status;
        let html = '';

        // Staged changes
        if (status.staged.length > 0) {
            html += `
                <div class="changes-group">
                    <div class="changes-group-header" data-group="staged">
                        <span class="group-icon expanded">▼</span>
                        <span class="group-title">Staged Changes</span>
                        <span class="group-count">${status.staged.length}</span>
                        <div class="group-actions">
                            <button class="group-action-btn" data-action="unstage-all" title="Unstage All">
                                ➖
                            </button>
                        </div>
                    </div>
                    <div class="changes-group-content">
                        ${this.renderFileList(status.staged, 'staged')}
                    </div>
                </div>
            `;
        }

        // Unstaged changes
        if (status.unstaged.length > 0) {
            html += `
                <div class="changes-group">
                    <div class="changes-group-header" data-group="unstaged">
                        <span class="group-icon expanded">▼</span>
                        <span class="group-title">Changes</span>
                        <span class="group-count">${status.unstaged.length}</span>
                        <div class="group-actions">
                            <button class="group-action-btn" data-action="stage-all" title="Stage All">
                                ➕
                            </button>
                            <button class="group-action-btn" data-action="discard-all" title="Discard All">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="changes-group-content">
                        ${this.renderFileList(status.unstaged, 'unstaged')}
                    </div>
                </div>
            `;
        }

        // Untracked files
        if (status.untracked.length > 0) {
            html += `
                <div class="changes-group">
                    <div class="changes-group-header" data-group="untracked">
                        <span class="group-icon expanded">▼</span>
                        <span class="group-title">Untracked Files</span>
                        <span class="group-count">${status.untracked.length}</span>
                        <div class="group-actions">
                            <button class="group-action-btn" data-action="stage-all-untracked" title="Stage All">
                                ➕
                            </button>
                        </div>
                    </div>
                    <div class="changes-group-content">
                        ${this.renderFileList(status.untracked, 'untracked')}
                    </div>
                </div>
            `;
        }

        // Conflicted files
        if (status.conflicted.length > 0) {
            html += `
                <div class="changes-group conflict">
                    <div class="changes-group-header" data-group="conflicted">
                        <span class="group-icon expanded">▼</span>
                        <span class="group-title">Merge Conflicts</span>
                        <span class="group-count">${status.conflicted.length}</span>
                        <div class="group-actions">
                            <button class="group-action-btn" data-action="resolve-all" title="Resolve All">
                                🔧
                            </button>
                        </div>
                    </div>
                    <div class="changes-group-content">
                        ${this.renderFileList(status.conflicted, 'conflicted')}
                    </div>
                </div>
            `;
        }

        if (html === '') {
            html = `
                <div class="no-changes">
                    <div class="no-changes-icon">✨</div>
                    <div class="no-changes-message">No changes</div>
                    <div class="no-changes-sub">Working directory clean</div>
                </div>
            `;
        }

        return html;
    }

    private renderFileList(files: GitFileStatus[], type: string): string {
        return files.map(file => {
            const fileName = this.getFileName(file.path);
            const fileIcon = this.fileIconService.getFileIcon(fileName);
            const statusIcon = this.getStatusIcon(file.status);
            const statusText = this.getStatusText(file.status);
            const isSelected = this.selectedFiles.has(file.path);

            return `
                <div class="file-item ${isSelected ? 'selected' : ''}" data-path="${file.path}" data-type="${type}">
                    <div class="file-item-content">
                        <span class="file-icon">${fileIcon}</span>
                        <span class="file-name" title="${file.path}">${fileName}</span>
                        <span class="file-status" title="${statusText}">
                            ${statusIcon}
                        </span>
                    </div>
                    <div class="file-actions">
                        ${this.renderFileActions(file, type)}
                    </div>
                </div>
            `;
        }).join('');
    }

    private renderFileActions(file: GitFileStatus, type: string): string {
        const actions = [];

        switch (type) {
            case 'unstaged':
                actions.push('<button class="file-action-btn" data-action="stage" title="Stage File">➕</button>');
                actions.push('<button class="file-action-btn" data-action="discard" title="Discard Changes">🗑️</button>');
                actions.push('<button class="file-action-btn" data-action="diff" title="View Changes">👁️</button>');
                break;
            case 'staged':
                actions.push('<button class="file-action-btn" data-action="unstage" title="Unstage File">➖</button>');
                actions.push('<button class="file-action-btn" data-action="diff" title="View Changes">👁️</button>');
                break;
            case 'untracked':
                actions.push('<button class="file-action-btn" data-action="stage" title="Stage File">➕</button>');
                actions.push('<button class="file-action-btn" data-action="ignore" title="Add to .gitignore">🚫</button>');
                break;
            case 'conflicted':
                actions.push('<button class="file-action-btn" data-action="resolve" title="Resolve Conflict">🔧</button>');
                actions.push('<button class="file-action-btn" data-action="diff" title="View Conflict">👁️</button>');
                break;
        }

        return actions.join('');
    }

    private attachEventListeners(): void {
        if (!this.container) return;

        // Commit message input
        const commitInput = this.container.querySelector('#commit-message') as HTMLTextAreaElement;
        if (commitInput) {
            commitInput.addEventListener('input', (e) => {
                this.commitMessage = (e.target as HTMLTextAreaElement).value;
                this.updateCommitButton();
            });

            commitInput.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    this.handleCommit();
                }
            });
        }

        // Header actions
        this.container.querySelector('#refresh')?.addEventListener('click', () => {
            this.gitService.refreshStatus();
        });

        this.container.querySelector('#fetch')?.addEventListener('click', () => {
            this.handleFetch();
        });

        this.container.querySelector('#pull')?.addEventListener('click', () => {
            this.handlePull();
        });

        this.container.querySelector('#push')?.addEventListener('click', () => {
            this.handlePush();
        });

        this.container.querySelector('#branch')?.addEventListener('click', () => {
            this.showBranchMenu();
        });

        // Commit actions
        this.container.querySelector('#commit')?.addEventListener('click', () => {
            this.handleCommit();
        });

        this.container.querySelector('#commit-menu')?.addEventListener('click', () => {
            this.showCommitMenu();
        });

        // Group actions
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('group-action-btn')) {
                const action = target.dataset.action!;
                this.handleGroupAction(action);
            }
        });

        // File actions
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('file-action-btn')) {
                const action = target.dataset.action!;
                const fileItem = target.closest('.file-item') as HTMLElement;
                const filePath = fileItem.dataset.path!;
                const fileType = fileItem.dataset.type!;
                
                this.handleFileAction(action, filePath, fileType);
            }
        });

        // File selection
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const fileItem = target.closest('.file-item') as HTMLElement;
            
            if (fileItem && !target.classList.contains('file-action-btn')) {
                this.handleFileSelection(fileItem);
            }
        });

        // Group toggle
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('changes-group-header')) {
                this.toggleGroup(target);
            }
        });
    }

    private attachEmptyStateListeners(): void {
        if (!this.container) return;

        this.container.querySelector('#init-repo')?.addEventListener('click', async () => {
            // Initialize git repository
            this.eventBus.emit('git.init', {});
        });
    }

    private async handleCommit(): Promise<void> {
        if (!this.commitMessage.trim() || !this.currentRepository) return;

        try {
            await this.gitService.commit({
                message: this.commitMessage.trim()
            });
        } catch (error) {
            console.error('Failed to commit:', error);
        }
    }

    private async handlePull(): Promise<void> {
        try {
            await this.gitService.pull();
        } catch (error) {
            console.error('Failed to pull:', error);
        }
    }

    private async handlePush(): Promise<void> {
        try {
            await this.gitService.push();
        } catch (error) {
            console.error('Failed to push:', error);
        }
    }

    private async handleFetch(): Promise<void> {
        // Implement fetch logic
        console.log('Fetch not implemented yet');
    }

    private async handleGroupAction(action: string): Promise<void> {
        switch (action) {
            case 'stage-all':
                await this.gitService.stageAllFiles();
                break;
            case 'unstage-all':
                // Implement unstage all
                break;
            case 'discard-all':
                if (confirm('Are you sure you want to discard all changes?')) {
                    // Implement discard all
                }
                break;
            case 'stage-all-untracked':
                await this.gitService.stageAllFiles();
                break;
        }
    }

    private async handleFileAction(action: string, filePath: string, fileType: string): Promise<void> {
        switch (action) {
            case 'stage':
                await this.gitService.stageFile(filePath);
                break;
            case 'unstage':
                await this.gitService.unstageFile(filePath);
                break;
            case 'discard':
                if (confirm(`Are you sure you want to discard changes in ${this.getFileName(filePath)}?`)) {
                    await this.gitService.discardChanges(filePath);
                }
                break;
            case 'diff':
                this.eventBus.emit('git.showDiff', { filePath });
                break;
            case 'resolve':
                this.eventBus.emit('conflict.open', { filePath });
                break;
            case 'ignore':
                // Implement add to gitignore
                break;
        }
    }

    private handleFileSelection(fileItem: HTMLElement): void {
        const filePath = fileItem.dataset.path!;
        
        if (this.selectedFiles.has(filePath)) {
            this.selectedFiles.delete(filePath);
            fileItem.classList.remove('selected');
        } else {
            this.selectedFiles.add(filePath);
            fileItem.classList.add('selected');
        }
    }

    private toggleGroup(header: HTMLElement): void {
        const icon = header.querySelector('.group-icon');
        const content = header.nextElementSibling as HTMLElement;
        
        if (icon?.classList.contains('expanded')) {
            icon.classList.remove('expanded');
            icon.textContent = '▶';
            content.style.display = 'none';
        } else {
            icon?.classList.add('expanded');
            if (icon) icon.textContent = '▼';
            content.style.display = 'block';
        }
    }

    private updateCommitButton(): void {
        const commitBtn = this.container?.querySelector('#commit') as HTMLButtonElement;
        if (commitBtn) {
            const hasChanges = this.currentRepository?.status.staged.length || 0 > 0;
            const hasMessage = this.commitMessage.trim().length > 0;
            commitBtn.disabled = !hasChanges || !hasMessage;
        }
    }

    private showCommitMenu(): void {
        // Implement commit menu (amend, signoff, etc.)
        console.log('Commit menu not implemented yet');
    }

    private showBranchMenu(): void {
        // Implement branch menu
        this.eventBus.emit('git.showBranches', {});
    }

    // Utility methods
    private getRepositoryName(): string {
        if (!this.currentRepository) return '';
        return this.currentRepository.path.split('/').pop() || 'Repository';
    }

    private getFileName(path: string): string {
        return path.split('/').pop() || path;
    }

    private getStatusIcon(status: string): string {
        const icons = {
            'added': '🆕',
            'modified': '📝',
            'deleted': '🗑️',
            'renamed': '📄',
            'copied': '📋',
            'untracked': '❓',
            'ignored': '🚫',
            'conflicted': '⚠️'
        };
        return icons[status as keyof typeof icons] || '📄';
    }

    private getStatusText(status: string): string {
        const texts = {
            'added': 'Added',
            'modified': 'Modified',
            'deleted': 'Deleted',
            'renamed': 'Renamed',
            'copied': 'Copied',
            'untracked': 'Untracked',
            'ignored': 'Ignored',
            'conflicted': 'Conflicted'
        };
        return texts[status as keyof typeof texts] || 'Unknown';
    }

    private refresh(): void {
        this.render();
    }

    // Public API
    show(): void {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    focusCommitMessage(): void {
        const input = this.container?.querySelector('#commit-message') as HTMLTextAreaElement;
        input?.focus();
    }

    setCommitMessage(message: string): void {
        this.commitMessage = message;
        const input = this.container?.querySelector('#commit-message') as HTMLTextAreaElement;
        if (input) {
            input.value = message;
        }
        this.updateCommitButton();
    }
}