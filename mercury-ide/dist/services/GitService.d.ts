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
    originalPath?: string;
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
export declare class GitService {
    private eventBus;
    private workspaceService;
    private outputChannelsService;
    private repositories;
    private activeRepository;
    private statusCheckInterval;
    private readonly STATUS_CHECK_INTERVAL;
    constructor(eventBus: EventBus, workspaceService: WorkspaceService, outputChannelsService: OutputChannelsService);
    private setupEventListeners;
    private startStatusChecking;
    private discoverRepositories;
    private getRepositoryStatus;
    refreshStatus(): Promise<void>;
    stageFile(filePath: string): Promise<void>;
    unstageFile(filePath: string): Promise<void>;
    stageAllFiles(): Promise<void>;
    commit(options: GitCommitOptions): Promise<string>;
    push(options?: GitPushOptions): Promise<void>;
    pull(options?: GitPullOptions): Promise<void>;
    getDiff(filePath?: string, staged?: boolean): Promise<GitDiff[]>;
    private generateMockDiff;
    getBlame(filePath: string): Promise<GitBlame>;
    getCommitHistory(limit?: number, offset?: number): Promise<GitCommit[]>;
    createBranch(name: string, startPoint?: string): Promise<void>;
    switchBranch(branchName: string): Promise<void>;
    private generateCommitHash;
    private generateCommitMessage;
    private isRepositoryClean;
    private delay;
    getActiveRepository(): GitRepository | null;
    getRepositories(): GitRepository[];
    getRepository(path: string): GitRepository | undefined;
    isRepositoryCleanPublic(): boolean;
    discardChanges(filePath: string): Promise<void>;
    dispose(): void;
    getCommitDetails(hash: string): Promise<GitCommit>;
    getCommitInfo(hash: string): Promise<GitCommit>;
}
