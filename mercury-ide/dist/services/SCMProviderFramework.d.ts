import { EventBus } from '../core/event-bus';
export interface SCMProvider {
    id: string;
    label: string;
    contextValue?: string;
    rootUri?: string;
    inputBox: SCMInputBox;
    resourceGroups: SCMResourceGroup[];
    count?: number;
    quickDiffProvider?: QuickDiffProvider;
    statusBarCommands?: Command[];
    acceptInputCommand?: Command;
    commitTemplate?: string;
    dispose(): void;
}
export interface SCMInputBox {
    value: string;
    placeholder: string;
    enabled: boolean;
    visible: boolean;
    validateInput?(value: string): string | null | Promise<string | null>;
}
export interface SCMResourceGroup {
    id: string;
    label: string;
    hideWhenEmpty?: boolean;
    resourceStates: SCMResourceState[];
}
export interface SCMResourceState {
    resourceUri: string;
    command?: Command;
    decorations?: SCMResourceDecorations;
    contextValue?: string;
    tooltip?: string;
}
export interface SCMResourceDecorations {
    strikeThrough?: boolean;
    faded?: boolean;
    tooltip?: string;
    light?: SCMResourceThemeIcon;
    dark?: SCMResourceThemeIcon;
}
export interface SCMResourceThemeIcon {
    iconPath: string;
    color?: string;
}
export interface Command {
    command: string;
    title: string;
    tooltip?: string;
    arguments?: any[];
}
export interface QuickDiffProvider {
    label: string;
    rootUri?: string;
    selector?: DocumentSelector;
    provideOriginalResource(uri: string): Promise<string | null>;
}
export interface DocumentSelector {
    language?: string;
    scheme?: string;
    pattern?: string;
}
export interface SCMHistoryProvider {
    currentHistoryItemGroup?: SCMHistoryItemGroup;
    provideHistoryItems(options: SCMHistoryOptions): Promise<SCMHistoryItem[]>;
    provideHistoryItemChanges(historyItemId: string): Promise<SCMHistoryItemChange[]>;
    resolveHistoryItemGroupCommonAncestor?(historyItemGroupIds: string[]): Promise<string | undefined>;
}
export interface SCMHistoryOptions {
    cursor?: string;
    limit?: number;
    historyItemGroupIds?: string[];
}
export interface SCMHistoryItem {
    id: string;
    parentIds: string[];
    message: string;
    author?: string;
    timestamp?: Date;
    statistics?: SCMHistoryItemStatistics;
    labels?: string[];
}
export interface SCMHistoryItemChange {
    uri: string;
    originalUri?: string;
    modifiedUri?: string;
    renameUri?: string;
}
export interface SCMHistoryItemGroup {
    id: string;
    label: string;
    upstream?: SCMHistoryItemGroup;
    base?: SCMHistoryItemGroup;
}
export interface SCMHistoryItemStatistics {
    files: number;
    insertions: number;
    deletions: number;
}
export interface SourceControlManager {
    inputBox: SCMInputBox;
    count: number;
    onDidChangeCount: EventEmitter<number>;
    createSourceControl(id: string, label: string, rootUri?: string): SCMProvider;
    getSourceControl(id: string): SCMProvider | undefined;
    getSourceControls(): SCMProvider[];
}
export interface EventEmitter<T> {
    event: (listener: (e: T) => any) => Disposable;
    fire(data: T): void;
    dispose(): void;
}
export interface Disposable {
    dispose(): void;
}
export declare class SCMProviderFramework implements SourceControlManager {
    private eventBus;
    private providers;
    private _inputBox;
    private _count;
    private _onDidChangeCount;
    constructor(eventBus: EventBus);
    private setupEventListeners;
    get inputBox(): SCMInputBox;
    get count(): number;
    get onDidChangeCount(): EventEmitter<number>;
    createSourceControl(id: string, label: string, rootUri?: string): SCMProvider;
    getSourceControl(id: string): SCMProvider | undefined;
    getSourceControls(): SCMProvider[];
    createResourceGroup(providerId: string, id: string, label: string): SCMResourceGroup;
    getResourceGroup(providerId: string, groupId: string): SCMResourceGroup | undefined;
    updateResourceGroup(providerId: string, groupId: string, resourceStates: SCMResourceState[]): void;
    addResource(providerId: string, groupId: string, resource: SCMResourceState): void;
    removeResource(providerId: string, groupId: string, resourceUri: string): void;
    updateResource(providerId: string, groupId: string, resource: SCMResourceState): void;
    private commitChanges;
    private refreshProvider;
    private stageResource;
    private unstageResource;
    private updateCount;
    registerQuickDiffProvider(providerId: string, provider: QuickDiffProvider): Disposable;
    private historyProviders;
    registerHistoryProvider(providerId: string, provider: SCMHistoryProvider): Disposable;
    getHistoryProvider(providerId: string): SCMHistoryProvider | undefined;
    private createEventEmitter;
    setInputBoxValue(value: string): void;
    setInputBoxPlaceholder(placeholder: string): void;
    validateInput(value: string): string | null;
    executeCommand(command: string, ...args: any[]): void;
    setContext(key: string, value: any): void;
    createExtensionAPI(): {
        createSourceControl: (id: string, label: string, rootUri?: string) => SCMProvider;
        registerQuickDiffProvider: (providerId: string, provider: QuickDiffProvider) => Disposable;
        registerHistoryProvider: (providerId: string, provider: SCMHistoryProvider) => Disposable;
        onDidChangeSourceControls: EventEmitter<SCMProvider[]>;
    };
    dispose(): void;
}
