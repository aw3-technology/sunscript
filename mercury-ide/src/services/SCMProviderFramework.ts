import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
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
    resolveHistoryItemGroupCommonAncestor?(
        historyItemGroupIds: string[]
    ): Promise<string | undefined>;
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

@injectable()
export class SCMProviderFramework implements SourceControlManager {
    private providers = new Map<string, SCMProvider>();
    private _inputBox: SCMInputBox;
    private _count: number = 0;
    private _onDidChangeCount: EventEmitter<number>;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this._inputBox = {
            value: '',
            placeholder: 'Message (press Ctrl+Enter to commit)',
            enabled: true,
            visible: true
        };

        this._onDidChangeCount = this.createEventEmitter<number>();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('scm.commit', (event) => {
            const { providerId, message } = event.data;
            this.commitChanges(providerId, message);
        });

        this.eventBus.on('scm.refresh', (event) => {
            const { providerId } = event.data;
            this.refreshProvider(providerId);
        });

        this.eventBus.on('scm.stage', (event) => {
            const { providerId, resourceUri } = event.data;
            this.stageResource(providerId, resourceUri);
        });

        this.eventBus.on('scm.unstage', (event) => {
            const { providerId, resourceUri } = event.data;
            this.unstageResource(providerId, resourceUri);
        });
    }

    get inputBox(): SCMInputBox {
        return this._inputBox;
    }

    get count(): number {
        return this._count;
    }

    get onDidChangeCount(): EventEmitter<number> {
        return this._onDidChangeCount;
    }

    createSourceControl(id: string, label: string, rootUri?: string): SCMProvider {
        const provider: SCMProvider = {
            id,
            label,
            rootUri,
            inputBox: {
                value: '',
                placeholder: `${label} commit message`,
                enabled: true,
                visible: true
            },
            resourceGroups: [],
            statusBarCommands: [
                {
                    command: `${id}.sync`,
                    title: '$(sync)',
                    tooltip: 'Synchronize Changes'
                },
                {
                    command: `${id}.checkout`,
                    title: '$(git-branch)',
                    tooltip: 'Checkout Branch'
                }
            ],
            acceptInputCommand: {
                command: `${id}.commit`,
                title: 'Commit',
                arguments: []
            },
            dispose: () => {
                this.providers.delete(id);
                this.updateCount();
                this.eventBus.emit('scm.providerDisposed', { providerId: id });
            }
        };

        this.providers.set(id, provider);
        this.updateCount();

        this.eventBus.emit('scm.providerCreated', { provider });
        return provider;
    }

    getSourceControl(id: string): SCMProvider | undefined {
        return this.providers.get(id);
    }

    getSourceControls(): SCMProvider[] {
        return Array.from(this.providers.values());
    }

    // Resource group management
    createResourceGroup(providerId: string, id: string, label: string): SCMResourceGroup {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`SCM provider ${providerId} not found`);
        }

        const group: SCMResourceGroup = {
            id,
            label,
            resourceStates: []
        };

        provider.resourceGroups.push(group);
        this.eventBus.emit('scm.resourceGroupCreated', { providerId, group });

        return group;
    }

    getResourceGroup(providerId: string, groupId: string): SCMResourceGroup | undefined {
        const provider = this.providers.get(providerId);
        return provider?.resourceGroups.find(g => g.id === groupId);
    }

    updateResourceGroup(providerId: string, groupId: string, resourceStates: SCMResourceState[]): void {
        const group = this.getResourceGroup(providerId, groupId);
        if (group) {
            group.resourceStates = resourceStates;
            this.updateCount();
            this.eventBus.emit('scm.resourceGroupUpdated', { providerId, groupId, resourceStates });
        }
    }

    // Resource management
    addResource(providerId: string, groupId: string, resource: SCMResourceState): void {
        const group = this.getResourceGroup(providerId, groupId);
        if (group) {
            group.resourceStates.push(resource);
            this.updateCount();
            this.eventBus.emit('scm.resourceAdded', { providerId, groupId, resource });
        }
    }

    removeResource(providerId: string, groupId: string, resourceUri: string): void {
        const group = this.getResourceGroup(providerId, groupId);
        if (group) {
            group.resourceStates = group.resourceStates.filter(r => r.resourceUri !== resourceUri);
            this.updateCount();
            this.eventBus.emit('scm.resourceRemoved', { providerId, groupId, resourceUri });
        }
    }

    updateResource(providerId: string, groupId: string, resource: SCMResourceState): void {
        const group = this.getResourceGroup(providerId, groupId);
        if (group) {
            const index = group.resourceStates.findIndex(r => r.resourceUri === resource.resourceUri);
            if (index !== -1) {
                group.resourceStates[index] = resource;
                this.eventBus.emit('scm.resourceUpdated', { providerId, groupId, resource });
            } else {
                this.addResource(providerId, groupId, resource);
            }
        }
    }

    // Provider operations
    private async commitChanges(providerId: string, message: string): Promise<void> {
        const provider = this.providers.get(providerId);
        if (!provider) return;

        try {
            this.eventBus.emit('scm.commitStarted', { providerId, message });
            
            // Find staged resources
            const stagedGroup = provider.resourceGroups.find(g => g.id === 'staged');
            if (!stagedGroup || stagedGroup.resourceStates.length === 0) {
                throw new Error('No staged changes to commit');
            }

            // Clear staged resources after commit
            stagedGroup.resourceStates = [];
            provider.inputBox.value = '';
            
            this.updateCount();
            this.eventBus.emit('scm.committed', { providerId, message });
            
        } catch (error) {
            this.eventBus.emit('scm.commitFailed', { providerId, message, error });
        }
    }

    private async refreshProvider(providerId: string): Promise<void> {
        const provider = this.providers.get(providerId);
        if (!provider) return;

        this.eventBus.emit('scm.refreshStarted', { providerId });
        
        // Refresh logic would be implemented by the specific SCM provider
        // This is just a framework method
        
        this.eventBus.emit('scm.refreshCompleted', { providerId });
    }

    private async stageResource(providerId: string, resourceUri: string): Promise<void> {
        const provider = this.providers.get(providerId);
        if (!provider) return;

        const changesGroup = provider.resourceGroups.find(g => g.id === 'changes');
        const stagedGroup = provider.resourceGroups.find(g => g.id === 'staged');

        if (changesGroup && stagedGroup) {
            const resourceIndex = changesGroup.resourceStates.findIndex(r => r.resourceUri === resourceUri);
            if (resourceIndex !== -1) {
                const resource = changesGroup.resourceStates[resourceIndex];
                changesGroup.resourceStates.splice(resourceIndex, 1);
                stagedGroup.resourceStates.push(resource);
                
                this.eventBus.emit('scm.resourceStaged', { providerId, resourceUri });
            }
        }
    }

    private async unstageResource(providerId: string, resourceUri: string): Promise<void> {
        const provider = this.providers.get(providerId);
        if (!provider) return;

        const changesGroup = provider.resourceGroups.find(g => g.id === 'changes');
        const stagedGroup = provider.resourceGroups.find(g => g.id === 'staged');

        if (changesGroup && stagedGroup) {
            const resourceIndex = stagedGroup.resourceStates.findIndex(r => r.resourceUri === resourceUri);
            if (resourceIndex !== -1) {
                const resource = stagedGroup.resourceStates[resourceIndex];
                stagedGroup.resourceStates.splice(resourceIndex, 1);
                changesGroup.resourceStates.push(resource);
                
                this.eventBus.emit('scm.resourceUnstaged', { providerId, resourceUri });
            }
        }
    }

    private updateCount(): void {
        let totalChanges = 0;
        
        for (const provider of this.providers.values()) {
            for (const group of provider.resourceGroups) {
                totalChanges += group.resourceStates.length;
            }
        }

        if (this._count !== totalChanges) {
            this._count = totalChanges;
            this._onDidChangeCount.fire(totalChanges);
        }
    }

    // Quick diff provider management
    registerQuickDiffProvider(providerId: string, provider: QuickDiffProvider): Disposable {
        const scmProvider = this.providers.get(providerId);
        if (scmProvider) {
            scmProvider.quickDiffProvider = provider;
            this.eventBus.emit('scm.quickDiffProviderRegistered', { providerId, provider });
        }

        return {
            dispose: () => {
                if (scmProvider) {
                    scmProvider.quickDiffProvider = undefined;
                    this.eventBus.emit('scm.quickDiffProviderUnregistered', { providerId });
                }
            }
        };
    }

    // History provider management
    private historyProviders = new Map<string, SCMHistoryProvider>();

    registerHistoryProvider(providerId: string, provider: SCMHistoryProvider): Disposable {
        this.historyProviders.set(providerId, provider);
        this.eventBus.emit('scm.historyProviderRegistered', { providerId, provider });

        return {
            dispose: () => {
                this.historyProviders.delete(providerId);
                this.eventBus.emit('scm.historyProviderUnregistered', { providerId });
            }
        };
    }

    getHistoryProvider(providerId: string): SCMHistoryProvider | undefined {
        return this.historyProviders.get(providerId);
    }

    // Utility methods
    private createEventEmitter<T>(): EventEmitter<T> {
        const listeners: Array<(e: T) => any> = [];

        return {
            event: (listener: (e: T) => any) => {
                listeners.push(listener);
                return {
                    dispose: () => {
                        const index = listeners.indexOf(listener);
                        if (index !== -1) {
                            listeners.splice(index, 1);
                        }
                    }
                };
            },
            fire: (data: T) => {
                listeners.forEach(listener => {
                    try {
                        listener(data);
                    } catch (error) {
                        console.error('Error in SCM event listener:', error);
                    }
                });
            },
            dispose: () => {
                listeners.length = 0;
            }
        };
    }

    // Input box management
    setInputBoxValue(value: string): void {
        this._inputBox.value = value;
        this.eventBus.emit('scm.inputBoxChanged', { value });
    }

    setInputBoxPlaceholder(placeholder: string): void {
        this._inputBox.placeholder = placeholder;
        this.eventBus.emit('scm.inputBoxPlaceholderChanged', { placeholder });
    }

    validateInput(value: string): string | null {
        if (!value.trim()) {
            return 'Commit message cannot be empty';
        }
        
        if (value.length > 100) {
            return 'Commit message should be 100 characters or less';
        }

        return null;
    }

    // Command execution
    executeCommand(command: string, ...args: any[]): void {
        this.eventBus.emit('command.execute', { command, arguments: args });
    }

    // Context value management
    setContext(key: string, value: any): void {
        this.eventBus.emit('scm.contextChanged', { key, value });
    }

    // API for extensions
    createExtensionAPI() {
        return {
            createSourceControl: this.createSourceControl.bind(this),
            registerQuickDiffProvider: this.registerQuickDiffProvider.bind(this),
            registerHistoryProvider: this.registerHistoryProvider.bind(this),
            onDidChangeSourceControls: this.createEventEmitter<SCMProvider[]>()
        };
    }

    dispose(): void {
        // Dispose all providers
        for (const provider of this.providers.values()) {
            provider.dispose();
        }
        
        this.providers.clear();
        this.historyProviders.clear();
        this._onDidChangeCount.dispose();
    }
}