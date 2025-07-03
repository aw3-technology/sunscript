import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EditorService } from '../services/EditorService';
import { EventBus } from '../core/event-bus';
import * as monaco from 'monaco-editor';

interface BreadcrumbItem {
    label: string;
    uri?: string;
    position?: monaco.Position;
    kind?: monaco.languages.SymbolKind;
}

@injectable()
export class Breadcrumbs {
    private container: HTMLElement | null = null;
    private groupId: string = '';
    private currentSymbols: monaco.languages.DocumentSymbol[] = [];
    
    constructor(
        @inject(TYPES.EditorService) private editorService: EditorService,
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        this.eventBus.on('editor.tab.activated', () => {
            this.updateBreadcrumbs();
        });
        
        this.eventBus.on('editor.cursor.changed', () => {
            this.updateBreadcrumbs();
        });
    }
    
    mount(container: HTMLElement, groupId: string): void {
        this.container = container;
        this.groupId = groupId;
        this.render();
    }
    
    private async updateBreadcrumbs(): Promise<void> {
        const editor = this.editorService.getActiveEditor();
        if (!editor) return;
        
        const model = editor.getModel();
        if (!model) return;
        
        // Get document symbols
        try {
            // For now, we'll skip symbol provider functionality
            // as it requires proper language server integration
            this.currentSymbols = [];
            this.render();
        } catch (error) {
            console.error('Failed to get document symbols:', error);
        }
    }
    
    private render(): void {
        if (!this.container) return;
        
        const items = this.getBreadcrumbItems();
        
        this.container.innerHTML = '';
        this.container.className = 'breadcrumbs';
        
        items.forEach((item, index) => {
            if (index > 0) {
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator';
                separator.textContent = '›';
                this.container!.appendChild(separator);
            }
            
            const breadcrumb = document.createElement('span');
            breadcrumb.className = 'breadcrumb-item';
            breadcrumb.textContent = item.label;
            
            // Add icon based on symbol kind
            if (item.kind !== undefined) {
                const icon = document.createElement('span');
                icon.className = 'breadcrumb-icon';
                icon.textContent = this.getSymbolIcon(item.kind);
                breadcrumb.insertBefore(icon, breadcrumb.firstChild);
            }
            
            // Click handler
            if (item.position) {
                breadcrumb.classList.add('clickable');
                breadcrumb.addEventListener('click', () => {
                    this.navigateToPosition(item.position!);
                });
            }
            
            this.container!.appendChild(breadcrumb);
        });
    }
    
    private getBreadcrumbItems(): BreadcrumbItem[] {
        const items: BreadcrumbItem[] = [];
        
        // Add file path
        const pathSegments = this.editorService.getBreadcrumbs(this.groupId);
        pathSegments.forEach((segment, index) => {
            items.push({
                label: segment,
                uri: pathSegments.slice(0, index + 1).join('/')
            });
        });
        
        // Add symbol path
        const editor = this.editorService.getActiveEditor();
        if (editor && this.currentSymbols.length > 0) {
            const position = editor.getPosition();
            if (position) {
                const symbolPath = this.findSymbolPath(this.currentSymbols, position);
                items.push(...symbolPath);
            }
        }
        
        return items;
    }
    
    private findSymbolPath(
        symbols: monaco.languages.DocumentSymbol[], 
        position: monaco.Position
    ): BreadcrumbItem[] {
        const path: BreadcrumbItem[] = [];
        
        for (const symbol of symbols) {
            const range = symbol.range;
            if (this.positionInRange(position, range)) {
                path.push({
                    label: symbol.name,
                    position: new monaco.Position(range.startLineNumber, range.startColumn),
                    kind: symbol.kind
                });
                
                if (symbol.children) {
                    path.push(...this.findSymbolPath(symbol.children, position));
                }
                
                break;
            }
        }
        
        return path;
    }
    
    private positionInRange(position: monaco.Position, range: monaco.IRange): boolean {
        if (position.lineNumber < range.startLineNumber || 
            position.lineNumber > range.endLineNumber) {
            return false;
        }
        
        if (position.lineNumber === range.startLineNumber && 
            position.column < range.startColumn) {
            return false;
        }
        
        if (position.lineNumber === range.endLineNumber && 
            position.column > range.endColumn) {
            return false;
        }
        
        return true;
    }
    
    private navigateToPosition(position: monaco.Position): void {
        const editor = this.editorService.getActiveEditor();
        if (!editor) return;
        
        editor.setPosition(position);
        editor.revealPositionInCenter(position);
        editor.focus();
    }
    
    private getSymbolIcon(kind: monaco.languages.SymbolKind): string {
        const symbolKind = monaco.languages.SymbolKind;
        switch (kind) {
            case symbolKind.File: return '📄';
            case symbolKind.Module: return '📦';
            case symbolKind.Namespace: return '🗂️';
            case symbolKind.Package: return '📦';
            case symbolKind.Class: return '🏛️';
            case symbolKind.Method: return '⚡';
            case symbolKind.Property: return '🔧';
            case symbolKind.Field: return '📍';
            case symbolKind.Constructor: return '🔨';
            case symbolKind.Enum: return '📊';
            case symbolKind.Interface: return '🔌';
            case symbolKind.Function: return '⚙️';
            case symbolKind.Variable: return '📌';
            case symbolKind.Constant: return '🔒';
            case symbolKind.String: return '📝';
            case symbolKind.Number: return '🔢';
            case symbolKind.Boolean: return '☑️';
            case symbolKind.Array: return '📚';
            case symbolKind.Object: return '📦';
            case symbolKind.Key: return '🔑';
            case symbolKind.Null: return '⭕';
            case symbolKind.EnumMember: return '📍';
            case symbolKind.Struct: return '🏗️';
            case symbolKind.Event: return '⚡';
            case symbolKind.Operator: return '➕';
            case symbolKind.TypeParameter: return '🏷️';
            default: return '📍';
        }
    }
}