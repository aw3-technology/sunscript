import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { GitService, GitCommit, GitBranch, GitRepository } from '../services/GitService';

@injectable()
export class GitHistoryPanel {
    private container: HTMLElement | null = null;
    private currentRepository: GitRepository | null = null;
    private commits: GitCommit[] = [];
    private branches: GitBranch[] = [];
    private currentBranch: string | null = null;
    private selectedCommit: GitCommit | null = null;
    private isLoading = false;
    private hasMoreCommits = true;
    private readonly COMMITS_PER_PAGE = 25;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.GitService) private gitService: GitService
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('git.repositoryDiscovered', (event) => {
            const { repository } = event.data;
            this.currentRepository = repository;
            this.branches = repository.branches;
            this.currentBranch = repository.head?.name || null;
            this.loadCommitHistory();
        });

        this.eventBus.on('git.branchSwitched', (event) => {
            const { branch } = event.data;
            this.currentBranch = branch;
            this.commits = [];
            this.hasMoreCommits = true;
            this.loadCommitHistory();
        });

        this.eventBus.on('git.committed', () => {
            // Refresh history after new commit
            this.commits = [];
            this.hasMoreCommits = true;
            this.loadCommitHistory();
        });

        this.eventBus.on('git.showBranches', () => {
            this.showBranchSelector();
        });

        this.eventBus.on('commit.show', (event) => {
            const { commitHash } = event.data;
            this.showCommitDetails(commitHash);
        });
    }

    mount(container: HTMLElement): void {
        this.container = container;
        this.render();
    }

    private async render(): Promise<void> {
        if (!this.container) return;

        if (!this.currentRepository) {
            this.container.innerHTML = `
                <div class="git-history-panel">
                    <div class="history-empty">
                        <div class="history-empty-icon">📜</div>
                        <div class="history-empty-title">No Git Repository</div>
                        <div class="history-empty-message">Open a git repository to view commit history</div>
                    </div>
                </div>
            `;
            return;
        }

        this.container.innerHTML = `
            <div class="git-history-panel">
                <div class="history-header">
                    <div class="history-title-container">
                        <h3 class="history-title">Git History</h3>
                        <div class="branch-selector">
                            <button class="branch-selector-btn" id="branch-selector">
                                <span class="branch-icon">🌿</span>
                                <span class="branch-name">${this.currentBranch || 'main'}</span>
                                <span class="dropdown-icon">▼</span>
                            </button>
                        </div>
                    </div>
                    <div class="history-actions">
                        <button class="history-action-btn" id="refresh-history" title="Refresh">
                            🔄
                        </button>
                        <button class="history-action-btn" id="create-branch" title="Create Branch">
                            🌿+
                        </button>
                        <button class="history-action-btn" id="merge" title="Merge">
                            🔀
                        </button>
                        <button class="history-action-btn" id="rebase" title="Rebase">
                            📏
                        </button>
                    </div>
                </div>

                <div class="history-filters">
                    <input type="text" class="history-search" id="commit-search" placeholder="Search commits...">
                    <select class="author-filter" id="author-filter">
                        <option value="">All authors</option>
                        ${this.renderAuthorOptions()}
                    </select>
                </div>

                <div class="history-content">
                    <div class="commit-graph">
                        ${await this.renderCommitGraph()}
                    </div>
                </div>

                ${this.renderCommitDetails()}
            </div>
        `;

        this.attachEventListeners();
    }

    private renderAuthorOptions(): string {
        const authors = new Set<string>();
        this.commits.forEach(commit => authors.add(commit.author.name));
        
        return Array.from(authors).map(author => 
            `<option value="${author}">${author}</option>`
        ).join('');
    }

    private async renderCommitGraph(): Promise<string> {
        if (this.commits.length === 0) {
            if (this.isLoading) {
                return '<div class="loading">Loading commits...</div>';
            }
            return '<div class="no-commits">No commits found</div>';
        }

        return `
            <div class="commit-list">
                ${this.commits.map((commit, index) => this.renderCommitItem(commit, index)).join('')}
                ${this.hasMoreCommits ? `
                    <div class="load-more-container">
                        <button class="load-more-btn" id="load-more" ${this.isLoading ? 'disabled' : ''}>
                            ${this.isLoading ? 'Loading...' : 'Load More'}
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    private renderCommitItem(commit: GitCommit, index: number): string {
        const isSelected = this.selectedCommit?.hash === commit.hash;
        const relativeTime = this.getRelativeTime(commit.date);
        const isHead = commit.refs.includes('HEAD');
        const branches = commit.refs.filter(ref => !ref.includes('/') && ref !== 'HEAD');
        const tags = commit.refs.filter(ref => ref.startsWith('tag:'));

        return `
            <div class="commit-item ${isSelected ? 'selected' : ''}" data-commit="${commit.hash}">
                <div class="commit-graph-line">
                    <div class="commit-dot ${isHead ? 'head' : ''}">
                        ${isHead ? '●' : '○'}
                    </div>
                    ${index < this.commits.length - 1 ? '<div class="commit-line"></div>' : ''}
                </div>
                
                <div class="commit-content">
                    <div class="commit-header">
                        <div class="commit-message" title="${commit.subject}">
                            ${this.truncateText(commit.subject, 60)}
                        </div>
                        <div class="commit-meta">
                            <span class="commit-hash" title="${commit.hash}">
                                ${commit.shortHash}
                            </span>
                            <span class="commit-time" title="${commit.date.toLocaleString()}">
                                ${relativeTime}
                            </span>
                        </div>
                    </div>
                    
                    <div class="commit-info">
                        <div class="commit-author">
                            <span class="author-avatar">👤</span>
                            <span class="author-name">${commit.author.name}</span>
                        </div>
                        
                        ${branches.length > 0 ? `
                            <div class="commit-refs">
                                ${branches.map(branch => 
                                    `<span class="ref-tag branch">${branch}</span>`
                                ).join('')}
                            </div>
                        ` : ''}
                        
                        ${tags.length > 0 ? `
                            <div class="commit-refs">
                                ${tags.map(tag => 
                                    `<span class="ref-tag tag">${tag.replace('tag:', '')}</span>`
                                ).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="commit-actions">
                        <button class="commit-action-btn" data-action="show-diff" title="Show Changes">
                            👁️
                        </button>
                        <button class="commit-action-btn" data-action="checkout" title="Checkout Commit">
                            ↩️
                        </button>
                        <button class="commit-action-btn" data-action="cherry-pick" title="Cherry Pick">
                            🍒
                        </button>
                        <button class="commit-action-btn" data-action="revert" title="Revert">
                            ↶
                        </button>
                        <button class="commit-action-btn" data-action="copy-hash" title="Copy Hash">
                            📋
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    private renderCommitDetails(): string {
        if (!this.selectedCommit) {
            return `
                <div class="commit-details-panel hidden">
                    <div class="details-placeholder">
                        Select a commit to view details
                    </div>
                </div>
            `;
        }

        const commit = this.selectedCommit;
        
        return `
            <div class="commit-details-panel">
                <div class="details-header">
                    <h4 class="details-title">Commit Details</h4>
                    <button class="details-close-btn" id="close-details">✕</button>
                </div>
                
                <div class="details-content">
                    <div class="commit-full-message">
                        <h5>Message</h5>
                        <div class="message-subject">${commit.subject}</div>
                        ${commit.body ? `<div class="message-body">${commit.body}</div>` : ''}
                    </div>
                    
                    <div class="commit-metadata">
                        <div class="metadata-row">
                            <span class="metadata-label">Hash:</span>
                            <span class="metadata-value monospace">${commit.hash}</span>
                        </div>
                        <div class="metadata-row">
                            <span class="metadata-label">Author:</span>
                            <span class="metadata-value">${commit.author.name} &lt;${commit.author.email}&gt;</span>
                        </div>
                        <div class="metadata-row">
                            <span class="metadata-label">Date:</span>
                            <span class="metadata-value">${commit.date.toLocaleString()}</span>
                        </div>
                        ${commit.committer.name !== commit.author.name ? `
                            <div class="metadata-row">
                                <span class="metadata-label">Committer:</span>
                                <span class="metadata-value">${commit.committer.name} &lt;${commit.committer.email}&gt;</span>
                            </div>
                        ` : ''}
                        <div class="metadata-row">
                            <span class="metadata-label">Parents:</span>
                            <span class="metadata-value">
                                ${commit.parents.map(parent => 
                                    `<span class="parent-hash monospace" data-commit="${parent}">${parent.substring(0, 7)}</span>`
                                ).join(', ')}
                            </span>
                        </div>
                    </div>
                    
                    <div class="commit-files">
                        <h5>Changed Files</h5>
                        <div class="files-loading">Loading file changes...</div>
                    </div>
                </div>
            </div>
        `;
    }

    private attachEventListeners(): void {
        if (!this.container) return;

        // Branch selector
        this.container.querySelector('#branch-selector')?.addEventListener('click', () => {
            this.showBranchSelector();
        });

        // Header actions
        this.container.querySelector('#refresh-history')?.addEventListener('click', () => {
            this.refreshHistory();
        });

        this.container.querySelector('#create-branch')?.addEventListener('click', () => {
            this.createBranch();
        });

        this.container.querySelector('#merge')?.addEventListener('click', () => {
            this.showMergeDialog();
        });

        this.container.querySelector('#rebase')?.addEventListener('click', () => {
            this.showRebaseDialog();
        });

        // Search and filters
        const searchInput = this.container.querySelector('#commit-search') as HTMLInputElement;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterCommits((e.target as HTMLInputElement).value);
            });
        }

        const authorFilter = this.container.querySelector('#author-filter') as HTMLSelectElement;
        if (authorFilter) {
            authorFilter.addEventListener('change', (e) => {
                this.filterByAuthor((e.target as HTMLSelectElement).value);
            });
        }

        // Load more button
        this.container.querySelector('#load-more')?.addEventListener('click', () => {
            this.loadMoreCommits();
        });

        // Commit selection
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const commitItem = target.closest('.commit-item') as HTMLElement;
            
            if (commitItem && !target.classList.contains('commit-action-btn')) {
                const commitHash = commitItem.dataset.commit!;
                this.selectCommit(commitHash);
            }
        });

        // Commit actions
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('commit-action-btn')) {
                const action = target.dataset.action!;
                const commitItem = target.closest('.commit-item') as HTMLElement;
                const commitHash = commitItem.dataset.commit!;
                
                this.handleCommitAction(action, commitHash);
            }
        });

        // Parent hash navigation
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('parent-hash')) {
                const parentHash = target.dataset.commit!;
                this.selectCommit(parentHash);
            }
        });

        // Details panel
        this.container.querySelector('#close-details')?.addEventListener('click', () => {
            this.closeDetails();
        });
    }

    private async loadCommitHistory(): Promise<void> {
        if (!this.currentRepository || this.isLoading) return;

        this.isLoading = true;
        
        try {
            const newCommits = await this.gitService.getCommitHistory(
                this.COMMITS_PER_PAGE,
                this.commits.length
            );

            if (newCommits.length < this.COMMITS_PER_PAGE) {
                this.hasMoreCommits = false;
            }

            this.commits.push(...newCommits);
            this.render();
            
        } catch (error) {
            console.error('Failed to load commit history:', error);
        } finally {
            this.isLoading = false;
        }
    }

    private async loadMoreCommits(): Promise<void> {
        await this.loadCommitHistory();
    }

    private refreshHistory(): void {
        this.commits = [];
        this.hasMoreCommits = true;
        this.selectedCommit = null;
        this.loadCommitHistory();
    }

    private selectCommit(commitHash: string): void {
        const commit = this.commits.find(c => c.hash === commitHash);
        if (commit) {
            this.selectedCommit = commit;
            this.render();
            this.loadCommitFiles(commit);
        }
    }

    private async loadCommitFiles(commit: GitCommit): Promise<void> {
        try {
            // Load file changes for the commit
            const diffs = await this.gitService.getDiff(); // Would need commit-specific diff
            
            const filesContainer = this.container?.querySelector('.commit-files .files-loading');
            if (filesContainer) {
                filesContainer.innerHTML = `
                    <div class="changed-files-list">
                        ${diffs.map(diff => `
                            <div class="changed-file">
                                <span class="file-status ${diff.status}">${this.getStatusIcon(diff.status)}</span>
                                <span class="file-path">${diff.path}</span>
                                <button class="view-diff-btn" data-file="${diff.path}">View</button>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load commit files:', error);
        }
    }

    private closeDetails(): void {
        this.selectedCommit = null;
        this.render();
    }

    private filterCommits(query: string): void {
        const commitItems = this.container?.querySelectorAll('.commit-item');
        if (!commitItems) return;

        commitItems.forEach(item => {
            const message = item.querySelector('.commit-message')?.textContent || '';
            const author = item.querySelector('.author-name')?.textContent || '';
            const hash = item.querySelector('.commit-hash')?.textContent || '';

            const matches = message.toLowerCase().includes(query.toLowerCase()) ||
                           author.toLowerCase().includes(query.toLowerCase()) ||
                           hash.toLowerCase().includes(query.toLowerCase());

            (item as HTMLElement).style.display = matches ? 'flex' : 'none';
        });
    }

    private filterByAuthor(author: string): void {
        const commitItems = this.container?.querySelectorAll('.commit-item');
        if (!commitItems) return;

        commitItems.forEach(item => {
            const itemAuthor = item.querySelector('.author-name')?.textContent || '';
            const matches = !author || itemAuthor === author;
            (item as HTMLElement).style.display = matches ? 'flex' : 'none';
        });
    }

    private showBranchSelector(): void {
        if (!this.branches.length) return;

        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'branch-dropdown';
        dropdown.innerHTML = `
            <div class="branch-dropdown-content">
                <div class="dropdown-header">
                    <span>Switch Branch</span>
                    <button class="dropdown-close">✕</button>
                </div>
                <div class="branch-list">
                    ${this.branches.map(branch => `
                        <div class="branch-item ${branch.isCurrent ? 'current' : ''}" data-branch="${branch.name}">
                            <span class="branch-icon">${branch.isCurrent ? '●' : '○'}</span>
                            <span class="branch-name">${branch.name}</span>
                            ${branch.upstream ? `<span class="branch-upstream">${branch.upstream}</span>` : ''}
                            <div class="branch-status">
                                ${branch.ahead > 0 ? `<span class="ahead">+${branch.ahead}</span>` : ''}
                                ${branch.behind > 0 ? `<span class="behind">-${branch.behind}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="dropdown-actions">
                    <button class="new-branch-btn">+ New Branch</button>
                </div>
            </div>
        `;

        // Position dropdown
        const button = this.container?.querySelector('#branch-selector') as HTMLElement;
        if (button) {
            const rect = button.getBoundingClientRect();
            dropdown.style.cssText = `
                position: fixed;
                top: ${rect.bottom + 5}px;
                left: ${rect.left}px;
                z-index: 1000;
            `;
        }

        // Add event listeners
        dropdown.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('dropdown-close')) {
                document.body.removeChild(dropdown);
            } else if (target.closest('.branch-item')) {
                const branchName = target.closest('.branch-item')!.getAttribute('data-branch')!;
                this.switchBranch(branchName);
                document.body.removeChild(dropdown);
            } else if (target.classList.contains('new-branch-btn')) {
                this.createBranch();
                document.body.removeChild(dropdown);
            }
        });

        // Close on outside click
        setTimeout(() => {
            const closeOnOutsideClick = (e: MouseEvent) => {
                if (!dropdown.contains(e.target as Node)) {
                    document.body.removeChild(dropdown);
                    document.removeEventListener('click', closeOnOutsideClick);
                }
            };
            document.addEventListener('click', closeOnOutsideClick);
        }, 0);

        document.body.appendChild(dropdown);
    }

    private async switchBranch(branchName: string): Promise<void> {
        try {
            await this.gitService.switchBranch(branchName);
        } catch (error) {
            console.error('Failed to switch branch:', error);
        }
    }

    private async createBranch(): Promise<void> {
        const branchName = prompt('Enter new branch name:');
        if (!branchName) return;

        try {
            await this.gitService.createBranch(branchName);
            await this.gitService.switchBranch(branchName);
        } catch (error) {
            console.error('Failed to create branch:', error);
            alert(`Failed to create branch: ${error}`);
        }
    }

    private showMergeDialog(): void {
        // Implement merge dialog
        console.log('Merge dialog not implemented yet');
    }

    private showRebaseDialog(): void {
        // Implement rebase dialog
        console.log('Rebase dialog not implemented yet');
    }

    private async handleCommitAction(action: string, commitHash: string): Promise<void> {
        const commit = this.commits.find(c => c.hash === commitHash);
        if (!commit) return;

        switch (action) {
            case 'show-diff':
                this.eventBus.emit('git.showCommitDiff', { commit });
                break;
            case 'checkout':
                if (confirm(`Checkout commit ${commit.shortHash}? This will put you in detached HEAD state.`)) {
                    // Implement checkout
                    console.log('Checkout commit not implemented yet');
                }
                break;
            case 'cherry-pick':
                if (confirm(`Cherry-pick commit ${commit.shortHash}?`)) {
                    // Implement cherry-pick
                    console.log('Cherry-pick not implemented yet');
                }
                break;
            case 'revert':
                if (confirm(`Revert commit ${commit.shortHash}?`)) {
                    // Implement revert
                    console.log('Revert not implemented yet');
                }
                break;
            case 'copy-hash':
                navigator.clipboard.writeText(commit.hash);
                break;
        }
    }

    // Utility methods
    private getRelativeTime(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (years > 0) return `${years}y ago`;
        if (months > 0) return `${months}mo ago`;
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'just now';
    }

    private truncateText(text: string, maxLength: number): string {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    private getStatusIcon(status: string): string {
        const icons = {
            'added': '🆕',
            'modified': '📝',
            'deleted': '🗑️',
            'renamed': '📄'
        };
        return icons[status as keyof typeof icons] || '📄';
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

    refresh(): void {
        this.refreshHistory();
    }

    showCommit(commitHash: string): void {
        this.selectCommit(commitHash);
    }

    private async showCommitDetails(commit: GitCommit): Promise<void> {
        const details = await this.gitService.getCommitDetails(commit.hash);
        // Show details in a modal or detail view
        console.log("Commit details:", details);
    }
}
