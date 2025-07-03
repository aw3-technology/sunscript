import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EditorService, EditorTab } from '../services/EditorService';
import { EventBus } from '../core/event-bus';

@injectable()
export class EditorTabs {
    private container: HTMLElement | null = null;
    private groupId: string = '';
    
    constructor(
        @inject(TYPES.EditorService) private editorService: EditorService,
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        this.eventBus.on('editor.tab.opened', (event) => {
            if (event.data.groupId === this.groupId) {
                this.render();
            }
        });
        
        this.eventBus.on('editor.tab.closed', (event) => {
            if (event.data.groupId === this.groupId) {
                this.render();
            }
        });
        
        this.eventBus.on('editor.tab.changed', (event) => {
            this.updateTab(event.data.tab);
        });
        
        this.eventBus.on('editor.tab.activated', (event) => {
            if (event.data.groupId === this.groupId) {
                this.render();
            }
        });
    }
    
    mount(container: HTMLElement, groupId: string): void {
        this.container = container;
        this.groupId = groupId;
        this.render();
    }
    
    private render(): void {
        if (!this.container) return;
        
        const group = this.editorService.getGroup(this.groupId);
        if (!group) return;
        
        this.container.innerHTML = '';
        
        // Create tabs container
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'editor-tabs-container';
        
        // Render each tab
        group.tabs.forEach(tab => {
            const tabElement = this.createTabElement(tab, tab.id === group.activeTabId);
            tabsContainer.appendChild(tabElement);
        });
        
        // Add new tab button
        const newTabButton = document.createElement('div');
        newTabButton.className = 'editor-tab-new';
        newTabButton.innerHTML = '+';
        newTabButton.addEventListener('click', () => {
            this.eventBus.emit('editor.tab.new', { groupId: this.groupId });
        });
        tabsContainer.appendChild(newTabButton);
        
        this.container.appendChild(tabsContainer);
    }
    
    private createTabElement(tab: EditorTab, isActive: boolean): HTMLElement {
        const tabElement = document.createElement('div');
        tabElement.className = `editor-tab ${isActive ? 'active' : ''} ${tab.isDirty ? 'dirty' : ''} ${tab.isPinned ? 'pinned' : ''}`;
        tabElement.dataset.tabId = tab.id;
        
        // Tab content
        const content = document.createElement('div');
        content.className = 'editor-tab-content';
        
        // Icon (based on file type)
        const icon = document.createElement('span');
        icon.className = 'editor-tab-icon';
        icon.innerHTML = this.getFileIcon(tab.uri);
        content.appendChild(icon);
        
        // Title
        const title = document.createElement('span');
        title.className = 'editor-tab-title';
        title.textContent = tab.title;
        if (tab.isDirty) {
            title.textContent = '● ' + title.textContent;
        }
        content.appendChild(title);
        
        // Close button
        const closeButton = document.createElement('span');
        closeButton.className = 'editor-tab-close';
        closeButton.innerHTML = '×';
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editorService.closeTab(this.groupId, tab.id);
        });
        content.appendChild(closeButton);
        
        tabElement.appendChild(content);
        
        // Click handler
        tabElement.addEventListener('click', () => {
            this.editorService.activateTab(this.groupId, tab.id);
        });
        
        // Context menu
        tabElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showTabContextMenu(tab, e);
        });
        
        // Drag and drop
        tabElement.draggable = true;
        tabElement.addEventListener('dragstart', (e) => {
            e.dataTransfer!.setData('tab-id', tab.id);
            e.dataTransfer!.setData('group-id', this.groupId);
        });
        
        return tabElement;
    }
    
    private updateTab(tab: EditorTab): void {
        const tabElement = this.container?.querySelector(`[data-tab-id="${tab.id}"]`);
        if (!tabElement) return;
        
        // Update dirty state
        if (tab.isDirty) {
            tabElement.classList.add('dirty');
        } else {
            tabElement.classList.remove('dirty');
        }
        
        // Update title
        const titleElement = tabElement.querySelector('.editor-tab-title');
        if (titleElement) {
            titleElement.textContent = (tab.isDirty ? '● ' : '') + tab.title;
        }
    }
    
    private showTabContextMenu(tab: EditorTab, event: MouseEvent): void {
        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        
        const menuItems = [
            { label: 'Close', action: () => this.editorService.closeTab(this.groupId, tab.id) },
            { label: 'Close Others', action: () => this.closeOtherTabs(tab.id) },
            { label: 'Close All', action: () => this.closeAllTabs() },
            { label: 'Save', action: () => this.editorService.saveTab(this.groupId, tab.id) },
            { label: tab.isPinned ? 'Unpin' : 'Pin', action: () => this.togglePin(tab) },
            { label: 'Split Right', action: () => this.splitEditor('horizontal') },
            { label: 'Split Down', action: () => this.splitEditor('vertical') }
        ];
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.label;
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            menu.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
        
        // Remove menu on click outside
        const removeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 0);
    }
    
    private closeOtherTabs(keepTabId: string): void {
        const group = this.editorService.getGroup(this.groupId);
        if (!group) return;
        
        group.tabs.forEach(tab => {
            if (tab.id !== keepTabId) {
                this.editorService.closeTab(this.groupId, tab.id);
            }
        });
    }
    
    private closeAllTabs(): void {
        const group = this.editorService.getGroup(this.groupId);
        if (!group) return;
        
        [...group.tabs].forEach(tab => {
            this.editorService.closeTab(this.groupId, tab.id);
        });
    }
    
    private togglePin(tab: EditorTab): void {
        tab.isPinned = !tab.isPinned;
        this.render();
    }
    
    private splitEditor(direction: 'horizontal' | 'vertical'): void {
        this.editorService.splitEditor(this.groupId, direction);
    }
    
    private getFileIcon(uri: string): string {
        const extension = uri.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'sun': return '☀️';
            case 'js': return '📜';
            case 'ts': return '📘';
            case 'json': return '📋';
            case 'html': return '🌐';
            case 'css': return '🎨';
            case 'md': return '📝';
            default: return '📄';
        }
    }
}