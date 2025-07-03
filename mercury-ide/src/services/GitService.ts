import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { WorkspaceService } from './WorkspaceService';
import { OutputChannelsService } from './OutputChannelsService';

export interface GitRepository {
    id: string;
    path: string;
    workingDirectory: string;
    gitDirectory: string;
    isInitialized: boolean;
    head: GitReference | null;
    remotes: GitRemote[];
    branches: GitBranch[];
    status: GitStatus;
}

export interface GitStatus {
    staged: GitFileStatus[];
    unstaged: GitFileStatus[];
    untracked: GitFileStatus[];
    conflicted: GitFileStatus[];
    ahead: number;
    behind: number;
    clean: boolean;
}

export interface GitFileStatus {
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'ignored' | 'conflicted';
    staged: boolean;
    originalPath?: string; // For renamed files
}

export interface GitCommit {
    hash: string;
    shortHash: string;
    subject: string;
    body: string;
    author: GitAuthor;
    committer: GitAuthor;
    date: Date;
    parents: string[];
    refs: string[];
}

export interface GitAuthor {
    name: string;
    email: string;
    date: Date;
}

export interface GitBranch {
    name: string;
    fullName: string;
    upstream?: string;
    ahead: number;
    behind: number;
    isCurrent: boolean;
    isRemote: boolean;
    commit: string;
}

export interface GitRemote {
    name: string;
    url: string;
    fetchUrl: string;
    pushUrl: string;
}

export interface GitReference {
    name: string;
    commit: string;
    type: 'branch' | 'tag' | 'commit';
}

export interface GitDiff {
    path: string;
    oldPath?: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    hunks: GitDiffHunk[];
    binary: boolean;
}

export interface GitDiffHunk {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    header: string;
    lines: GitDiffLine[];
}

export interface GitDiffLine {
    type: 'context' | 'added' | 'removed';
    oldLineNumber?: number;
    newLineNumber?: number;
    content: string;
}

export interface GitBlame {
    path: string;
    lines: GitBlameLine[];
}

export interface GitBlameLine {
    lineNumber: number;
    commit: string;
    author: GitAuthor;
    content: string;
    summary: string;
}

export interface GitCommitOptions {
    message: string;
    amend?: boolean;
    signOff?: boolean;
    allowEmpty?: boolean;
    author?: GitAuthor;
}

export interface GitPushOptions {
    remote?: string;
    branch?: string;
    force?: boolean;
    setUpstream?: boolean;
    tags?: boolean;
}

export interface GitPullOptions {
    remote?: string;
    branch?: string;
    rebase?: boolean;
    noCommit?: boolean;
}

@injectable()
export class GitService {
    private repositories = new Map<string, GitRepository>();
    private activeRepository: GitRepository | null = null;
    private statusCheckInterval: ReturnType<typeof setInterval> | null = null;
    private readonly STATUS_CHECK_INTERVAL = 5000; // 5 seconds

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.WorkspaceService) private workspaceService: WorkspaceService,
        @inject(TYPES.OutputChannelsService) private outputChannelsService: OutputChannelsService
    ) {
        this.setupEventListeners();
        this.startStatusChecking();
    }

    private setupEventListeners(): void {
        this.eventBus.on('workspace.opened', (event) => {
            const { workspacePath } = event.data;
            this.discoverRepositories(workspacePath);
        });

        this.eventBus.on('file.saved', () => {
            this.refreshStatus();
        });

        this.eventBus.on('fileWatcher.fileModified', () => {
            this.refreshStatus();
        });

        this.eventBus.on('git.refresh', () => {
            this.refreshStatus();
        });
    }

    private startStatusChecking(): void {
        this.statusCheckInterval = setInterval(() => {
            this.refreshStatus();
        }, this.STATUS_CHECK_INTERVAL);
    }

    private async discoverRepositories(workspacePath: string): Promise<void> {
        try {
            // Check if workspace is a git repository
            const gitDir = `${workspacePath}/.git`;
            
            // Simulate git repository detection
            const repository: GitRepository = {
                id: `repo-${Date.now()}`,
                path: workspacePath,
                workingDirectory: workspacePath,
                gitDirectory: gitDir,
                isInitialized: true,
                head: {
                    name: 'main',
                    commit: 'abc123def456',
                    type: 'branch'
                },
                remotes: [
                    {
                        name: 'origin',
                        url: 'https://github.com/user/sunscript-project.git',
                        fetchUrl: 'https://github.com/user/sunscript-project.git',
                        pushUrl: 'https://github.com/user/sunscript-project.git'
                    }
                ],
                branches: [
                    {
                        name: 'main',
                        fullName: 'refs/heads/main',
                        upstream: 'origin/main',
                        ahead: 2,
                        behind: 1,
                        isCurrent: true,
                        isRemote: false,
                        commit: 'abc123def456'
                    },
                    {
                        name: 'feature/new-parser',
                        fullName: 'refs/heads/feature/new-parser',
                        ahead: 5,
                        behind: 0,
                        isCurrent: false,
                        isRemote: false,
                        commit: 'def456ghi789'
                    }
                ],
                status: await this.getRepositoryStatus(workspacePath)
            };

            this.repositories.set(workspacePath, repository);
            this.activeRepository = repository;

            this.outputChannelsService.createChannel('Git', 'git');
            this.outputChannelsService.appendLine('git', `Git repository discovered: ${workspacePath}`, 'info');

            this.eventBus.emit('git.repositoryDiscovered', { repository });
            
        } catch (error) {
            console.warn('No git repository found in workspace:', error);
        }
    }

    private async getRepositoryStatus(repoPath: string): Promise<GitStatus> {
        // Simulate git status command
        await this.delay(200);

        return {
            staged: [
                { path: 'src/main.sun', status: 'modified', staged: true },
                { path: 'README.md', status: 'added', staged: true }
            ],
            unstaged: [
                { path: 'src/utils.sun', status: 'modified', staged: false },
                { path: 'package.json', status: 'modified', staged: false }
            ],
            untracked: [
                { path: 'temp.sun', status: 'untracked', staged: false },
                { path: 'notes.txt', status: 'untracked', staged: false }
            ],
            conflicted: [],
            ahead: 2,
            behind: 1,
            clean: false
        };
    }

    async refreshStatus(): Promise<void> {
        if (!this.activeRepository) return;

        try {
            const status = await this.getRepositoryStatus(this.activeRepository.path);
            this.activeRepository.status = status;
            
            this.eventBus.emit('git.statusChanged', { 
                repository: this.activeRepository,
                status 
            });
        } catch (error) {
            console.warn('Failed to refresh git status:', error);
        }
    }

    async stageFile(filePath: string): Promise<void> {
        if (!this.activeRepository) throw new Error('No active repository');

        try {
            this.outputChannelsService.appendLine('git', `Staging file: ${filePath}`, 'info');
            
            // Simulate git add command
            await this.delay(300);
            
            // Update status
            const status = this.activeRepository.status;
            const unstagedIndex = status.unstaged.findIndex(f => f.path === filePath);
            const untrackedIndex = status.untracked.findIndex(f => f.path === filePath);
            
            if (unstagedIndex !== -1) {
                const file = status.unstaged[unstagedIndex];
                status.unstaged.splice(unstagedIndex, 1);
                status.staged.push({ ...file, staged: true });
            } else if (untrackedIndex !== -1) {
                const file = status.untracked[untrackedIndex];
                status.untracked.splice(untrackedIndex, 1);
                status.staged.push({ path: file.path, status: 'added', staged: true });
            }

            this.eventBus.emit('git.fileStaged', { filePath, repository: this.activeRepository });
            this.eventBus.emit('git.statusChanged', { repository: this.activeRepository, status });
            
        } catch (error) {
            this.outputChannelsService.appendLine('git', `Failed to stage file: ${error}`, 'error');
            throw error;
        }
    }

    async unstageFile(filePath: string): Promise<void> {
        if (!this.activeRepository) throw new Error('No active repository');

        try {
            this.outputChannelsService.appendLine('git', `Unstaging file: ${filePath}`, 'info');
            
            // Simulate git reset command
            await this.delay(300);
            
            // Update status
            const status = this.activeRepository.status;
            const stagedIndex = status.staged.findIndex(f => f.path === filePath);
            
            if (stagedIndex !== -1) {
                const file = status.staged[stagedIndex];
                status.staged.splice(stagedIndex, 1);
                
                if (file.status === 'added') {
                    status.untracked.push({ path: file.path, status: 'untracked', staged: false });
                } else {
                    status.unstaged.push({ ...file, staged: false });
                }
            }

            this.eventBus.emit('git.fileUnstaged', { filePath, repository: this.activeRepository });
            this.eventBus.emit('git.statusChanged', { repository: this.activeRepository, status });
            
        } catch (error) {
            this.outputChannelsService.appendLine('git', `Failed to unstage file: ${error}`, 'error');
            throw error;
        }
    }

    async stageAllFiles(): Promise<void> {
        if (!this.activeRepository) throw new Error('No active repository');

        try {
            this.outputChannelsService.appendLine('git', 'Staging all files...', 'info');
            
            // Simulate git add . command
            await this.delay(500);
            
            const status = this.activeRepository.status;
            
            // Move all unstaged and untracked files to staged
            const allFiles = [...status.unstaged, ...status.untracked];
            status.staged.push(...allFiles.map(f => ({ 
                ...f, 
                status: f.status === 'untracked' ? 'added' as const : f.status,
                staged: true 
            })));
            status.unstaged = [];
            status.untracked = [];

            this.eventBus.emit('git.allFilesStaged', { repository: this.activeRepository });
            this.eventBus.emit('git.statusChanged', { repository: this.activeRepository, status });
            
        } catch (error) {
            this.outputChannelsService.appendLine('git', `Failed to stage all files: ${error}`, 'error');
            throw error;
        }
    }

    async commit(options: GitCommitOptions): Promise<string> {
        if (!this.activeRepository) throw new Error('No active repository');

        try {
            this.outputChannelsService.appendLine('git', `Committing changes: "${options.message}"`, 'info');
            
            // Simulate git commit command
            await this.delay(800);
            
            const commitHash = this.generateCommitHash();
            
            // Clear staged files
            this.activeRepository.status.staged = [];
            this.activeRepository.status.clean = this.isRepositoryClean();
            
            // Update ahead count
            this.activeRepository.status.ahead++;

            this.outputChannelsService.appendLine('git', `Commit created: ${commitHash}`, 'info');
            
            this.eventBus.emit('git.committed', { 
                repository: this.activeRepository,
                commit: commitHash,
                message: options.message
            });
            this.eventBus.emit('git.statusChanged', { 
                repository: this.activeRepository, 
                status: this.activeRepository.status 
            });

            return commitHash;
            
        } catch (error) {
            this.outputChannelsService.appendLine('git', `Failed to commit: ${error}`, 'error');
            throw error;
        }
    }

    async push(options: GitPushOptions = {}): Promise<void> {
        if (!this.activeRepository) throw new Error('No active repository');

        try {
            const remote = options.remote || 'origin';
            const branch = options.branch || this.activeRepository.head?.name || 'main';
            
            this.outputChannelsService.appendLine('git', `Pushing to ${remote}/${branch}...`, 'info');
            
            // Simulate git push command
            await this.delay(2000);
            
            // Reset ahead count
            this.activeRepository.status.ahead = 0;

            this.outputChannelsService.appendLine('git', 'Push completed successfully', 'info');
            
            this.eventBus.emit('git.pushed', { 
                repository: this.activeRepository,
                remote,
                branch
            });
            this.eventBus.emit('git.statusChanged', { 
                repository: this.activeRepository, 
                status: this.activeRepository.status 
            });
            
        } catch (error) {
            this.outputChannelsService.appendLine('git', `Failed to push: ${error}`, 'error');
            throw error;
        }
    }

    async pull(options: GitPullOptions = {}): Promise<void> {
        if (!this.activeRepository) throw new Error('No active repository');

        try {
            const remote = options.remote || 'origin';
            const branch = options.branch || this.activeRepository.head?.name || 'main';
            
            this.outputChannelsService.appendLine('git', `Pulling from ${remote}/${branch}...`, 'info');
            
            // Simulate git pull command
            await this.delay(1500);
            
            // Reset behind count and potentially update ahead
            const newCommits = this.activeRepository.status.behind;
            this.activeRepository.status.behind = 0;

            if (newCommits > 0) {
                this.outputChannelsService.appendLine('git', `Pulled ${newCommits} new commit(s)`, 'info');
                
                // Simulate some files being updated
                await this.refreshStatus();
            } else {
                this.outputChannelsService.appendLine('git', 'Already up to date', 'info');
            }
            
            this.eventBus.emit('git.pulled', { 
                repository: this.activeRepository,
                remote,
                branch,
                newCommits
            });
            
        } catch (error) {
            this.outputChannelsService.appendLine('git', `Failed to pull: ${error}`, 'error');
            throw error;
        }
    }

    async getDiff(filePath?: string, staged?: boolean): Promise<GitDiff[]> {
        if (!this.activeRepository) throw new Error('No active repository');

        // Simulate git diff command
        await this.delay(400);

        if (filePath) {
            return [this.generateMockDiff(filePath)];
        }

        // Return diffs for all changed files
        const status = this.activeRepository.status;
        const files = staged ? status.staged : [...status.staged, ...status.unstaged];
        
        return files
            .filter(f => f.status !== 'untracked')
            .map(f => this.generateMockDiff(f.path));
    }

    private generateMockDiff(filePath: string): GitDiff {
        return {
            path: filePath,
            status: 'modified',
            binary: false,
            hunks: [
                {
                    oldStart: 10,
                    oldLines: 5,
                    newStart: 10,
                    newLines: 7,
                    header: '@@ -10,5 +10,7 @@ function processData() {',
                    lines: [
                        { type: 'context', oldLineNumber: 10, newLineNumber: 10, content: '  const items = [1, 2, 3];' },
                        { type: 'removed', oldLineNumber: 11, content: '  return items;' },
                        { type: 'added', newLineNumber: 11, content: '  const processed = items.map(x => x * 2);' },
                        { type: 'added', newLineNumber: 12, content: '  return processed;' },
                        { type: 'context', oldLineNumber: 12, newLineNumber: 13, content: '}' }
                    ]
                }
            ]
        };
    }

    async getBlame(filePath: string): Promise<GitBlame> {
        if (!this.activeRepository) throw new Error('No active repository');

        // Simulate git blame command
        await this.delay(600);

        // Generate mock blame data
        const lines: GitBlameLine[] = [];
        for (let i = 1; i <= 50; i++) {
            lines.push({
                lineNumber: i,
                commit: this.generateCommitHash(),
                author: {
                    name: i % 3 === 0 ? 'Alice Dev' : i % 2 === 0 ? 'Bob Code' : 'Charlie Script',
                    email: i % 3 === 0 ? 'alice@dev.com' : i % 2 === 0 ? 'bob@code.com' : 'charlie@script.com',
                    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
                },
                content: `// Line ${i} of code`,
                summary: i % 5 === 0 ? 'Fix critical bug in parser' : i % 3 === 0 ? 'Add new feature' : 'Update documentation'
            });
        }

        return {
            path: filePath,
            lines
        };
    }

    async getCommitHistory(limit: number = 50, offset: number = 0): Promise<GitCommit[]> {
        if (!this.activeRepository) throw new Error('No active repository');

        // Simulate git log command
        await this.delay(500);

        const commits: GitCommit[] = [];
        for (let i = 0; i < limit; i++) {
            const date = new Date(Date.now() - (i + offset) * 24 * 60 * 60 * 1000);
            const hash = this.generateCommitHash();
            
            commits.push({
                hash,
                shortHash: hash.substring(0, 7),
                subject: this.generateCommitMessage(),
                body: i % 3 === 0 ? 'Detailed explanation of the changes made in this commit.' : '',
                author: {
                    name: i % 2 === 0 ? 'Alice Developer' : 'Bob Coder',
                    email: i % 2 === 0 ? 'alice@example.com' : 'bob@example.com',
                    date
                },
                committer: {
                    name: i % 2 === 0 ? 'Alice Developer' : 'Bob Coder',
                    email: i % 2 === 0 ? 'alice@example.com' : 'bob@example.com',
                    date
                },
                date,
                parents: i === 0 ? [] : [commits[i - 1]?.hash || this.generateCommitHash()],
                refs: i === 0 ? ['HEAD', 'origin/main', 'main'] : []
            });
        }

        return commits;
    }

    async createBranch(name: string, startPoint?: string): Promise<void> {
        if (!this.activeRepository) throw new Error('No active repository');

        try {
            this.outputChannelsService.appendLine('git', `Creating branch: ${name}`, 'info');
            
            // Simulate git branch command
            await this.delay(300);
            
            const newBranch: GitBranch = {
                name,
                fullName: `refs/heads/${name}`,
                ahead: 0,
                behind: 0,
                isCurrent: false,
                isRemote: false,
                commit: startPoint || this.activeRepository.head?.commit || this.generateCommitHash()
            };

            this.activeRepository.branches.push(newBranch);
            
            this.outputChannelsService.appendLine('git', `Branch created: ${name}`, 'info');
            this.eventBus.emit('git.branchCreated', { repository: this.activeRepository, branch: newBranch });
            
        } catch (error) {
            this.outputChannelsService.appendLine('git', `Failed to create branch: ${error}`, 'error');
            throw error;
        }
    }

    async switchBranch(branchName: string): Promise<void> {
        if (!this.activeRepository) throw new Error('No active repository');

        try {
            this.outputChannelsService.appendLine('git', `Switching to branch: ${branchName}`, 'info');
            
            // Simulate git checkout command
            await this.delay(500);
            
            // Update current branch
            this.activeRepository.branches.forEach(branch => {
                branch.isCurrent = branch.name === branchName;
            });

            const newHead = this.activeRepository.branches.find(b => b.name === branchName);
            if (newHead) {
                this.activeRepository.head = {
                    name: newHead.name,
                    commit: newHead.commit,
                    type: 'branch'
                };
            }
            
            // Refresh status after branch switch
            await this.refreshStatus();
            
            this.outputChannelsService.appendLine('git', `Switched to branch: ${branchName}`, 'info');
            this.eventBus.emit('git.branchSwitched', { repository: this.activeRepository, branch: branchName });
            
        } catch (error) {
            this.outputChannelsService.appendLine('git', `Failed to switch branch: ${error}`, 'error');
            throw error;
        }
    }

    // Utility methods
    private generateCommitHash(): string {
        return Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }

    private generateCommitMessage(): string {
        const messages = [
            'Fix parser error handling',
            'Add new syntax highlighting rules',
            'Update build configuration',
            'Refactor code generation logic',
            'Add unit tests for compiler',
            'Fix memory leak in runtime',
            'Improve error messages',
            'Update documentation',
            'Add support for new operators',
            'Optimize performance'
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    private isRepositoryClean(): boolean {
        if (!this.activeRepository) return true;
        
        const status = this.activeRepository.status;
        return status.staged.length === 0 && 
               status.unstaged.length === 0 && 
               status.untracked.length === 0 &&
               status.conflicted.length === 0;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API methods
    getActiveRepository(): GitRepository | null {
        return this.activeRepository;
    }

    getRepositories(): GitRepository[] {
        return Array.from(this.repositories.values());
    }

    getRepository(path: string): GitRepository | undefined {
        return this.repositories.get(path);
    }

    isRepositoryCleanPublic(): boolean {
        return this.isRepositoryClean();
    }

    async discardChanges(filePath: string): Promise<void> {
        if (!this.activeRepository) throw new Error('No active repository');

        try {
            this.outputChannelsService.appendLine('git', `Discarding changes: ${filePath}`, 'info');
            
            // Simulate git checkout -- command
            await this.delay(300);
            
            // Remove from unstaged files
            const status = this.activeRepository.status;
            status.unstaged = status.unstaged.filter(f => f.path !== filePath);
            
            this.eventBus.emit('git.changesDiscarded', { filePath, repository: this.activeRepository });
            this.eventBus.emit('git.statusChanged', { repository: this.activeRepository, status });
            
        } catch (error) {
            this.outputChannelsService.appendLine('git', `Failed to discard changes: ${error}`, 'error');
            throw error;
        }
    }

    dispose(): void {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    async getCommitDetails(hash: string): Promise<GitCommit> {
        const commit = await this.getCommitInfo(hash);
        return commit;
    }

    async getCommitInfo(hash: string): Promise<GitCommit> {
        // Simulate getting commit info
        const commits = await this.getCommitHistory(100, 0);
        const commit = commits.find(c => c.hash === hash);
        
        if (!commit) {
            throw new Error(`Commit ${hash} not found`);
        }
        
        return commit;
    }
}
