import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { DiagnosticsService, Diagnostic } from '../services/DiagnosticsService';
import { EventBus } from '../core/event-bus';
import { EditorService } from '../services/EditorService';
import * as monaco from 'monaco-editor';

@injectable()
export class ProblemsPanel {
    private container: HTMLElement | null = null;
    private problemsList: HTMLElement | null = null;
    private filterLevel: 'all' | 'errors' | 'warnings' | 'infos' = 'all';
    private currentProblems: Diagnostic[] = [];
    
    constructor(
        @inject(TYPES.DiagnosticsService) private diagnosticsService: DiagnosticsService,
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.EditorService) private editorService: EditorService
    ) {
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        this.eventBus.on('diagnostics.changed', () => {
            this.refreshProblems();
        });
        
        this.eventBus.on('problems.countChanged', (event) => {
            this.updateHeader(event.data);
        });
        
        this.eventBus.on('diagnostics.cleared', () => {
            this.refreshProblems();
        });
    }
    
    mount(container: HTMLElement): void {
        this.container = container;
        this.render();
        this.refreshProblems();
    }
    
    private render(): void {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="problems-panel">
                <div class="problems-header">
                    <div class="problems-title">
                        <span class="problems-icon">⚠️</span>
                        <span class="problems-text">Problems</span>
                        <span class="problems-count">0</span>
                    </div>
                    <div class="problems-actions">
                        <button class="problems-filter-btn" data-filter="all" title="Show All">All</button>
                        <button class="problems-filter-btn" data-filter="errors" title="Show Errors">
                            <span class="error-icon">❌</span>
                            <span class="error-count">0</span>
                        </button>
                        <button class="problems-filter-btn" data-filter="warnings" title="Show Warnings">
                            <span class="warning-icon">⚠️</span>
                            <span class="warning-count">0</span>
                        </button>
                        <button class="problems-filter-btn" data-filter="infos" title="Show Infos">
                            <span class="info-icon">ℹ️</span>
                            <span class="info-count">0</span>
                        </button>
                        <button class="problems-clear-btn" title="Clear All">Clear</button>
                    </div>
                </div>
                <div class="problems-content">
                    <div class="problems-list"></div>
                </div>
            </div>
        `;
        
        this.problemsList = this.container.querySelector('.problems-list');
        this.attachEventListeners();
    }
    
    private attachEventListeners(): void {
        if (!this.container) return;
        
        // Filter buttons
        this.container.querySelectorAll('.problems-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const filter = target.dataset.filter as typeof this.filterLevel;
                if (filter) {
                    this.setFilter(filter);
                }
            });
        });
        
        // Clear button
        const clearBtn = this.container.querySelector('.problems-clear-btn');
        clearBtn?.addEventListener('click', () => {
            this.diagnosticsService.clearAllDiagnostics();
        });
    }
    
    private setFilter(filter: typeof this.filterLevel): void {
        this.filterLevel = filter;
        
        // Update active filter button
        this.container?.querySelectorAll('.problems-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = this.container?.querySelector(`[data-filter="${filter}"]`);
        activeBtn?.classList.add('active');
        
        this.refreshProblems();
    }
    
    private refreshProblems(): void {
        const allProblems = this.diagnosticsService.getDiagnostics();
        
        // Filter problems based on current filter
        this.currentProblems = this.filterProblems(allProblems);
        
        this.renderProblems();
    }
    
    private filterProblems(problems: Diagnostic[]): Diagnostic[] {
        switch (this.filterLevel) {
            case 'errors':
                return problems.filter(p => p.severity === monaco.MarkerSeverity.Error);
            case 'warnings':
                return problems.filter(p => p.severity === monaco.MarkerSeverity.Warning);
            case 'infos':
                return problems.filter(p => 
                    p.severity === monaco.MarkerSeverity.Info || 
                    p.severity === monaco.MarkerSeverity.Hint
                );
            default:
                return problems;
        }
    }
    
    private renderProblems(): void {
        if (!this.problemsList) return;
        
        this.problemsList.innerHTML = '';
        
        if (this.currentProblems.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'problems-empty';
            emptyState.innerHTML = `
                <div class="problems-empty-icon">✅</div>
                <div class="problems-empty-text">No problems found</div>
            `;
            this.problemsList.appendChild(emptyState);
            return;
        }
        
        // Group problems by file
        const problemsByFile = this.groupProblemsByFile(this.currentProblems);
        
        for (const [uri, problems] of problemsByFile) {
            const fileGroup = this.createFileGroup(uri, problems);
            this.problemsList.appendChild(fileGroup);
        }
    }
    
    private groupProblemsByFile(problems: Diagnostic[]): Map<string, Diagnostic[]> {
        const grouped = new Map<string, Diagnostic[]>();
        
        for (const problem of problems) {
            if (!grouped.has(problem.uri)) {
                grouped.set(problem.uri, []);
            }
            grouped.get(problem.uri)!.push(problem);
        }
        
        return grouped;
    }
    
    private createFileGroup(uri: string, problems: Diagnostic[]): HTMLElement {
        const fileGroup = document.createElement('div');
        fileGroup.className = 'problems-file-group';
        
        const fileName = this.getFileName(uri);
        const relativePath = this.getRelativePath(uri);
        
        // File header
        const fileHeader = document.createElement('div');
        fileHeader.className = 'problems-file-header';
        fileHeader.innerHTML = `
            <div class="problems-file-info">
                <span class="problems-file-icon">📄</span>
                <span class="problems-file-name">${fileName}</span>
                <span class="problems-file-path">${relativePath}</span>
            </div>
            <div class="problems-file-count">${problems.length}</div>
        `;
        fileGroup.appendChild(fileHeader);
        
        // Problems list
        const problemsList = document.createElement('div');
        problemsList.className = 'problems-file-problems';
        
        problems.forEach(problem => {
            const problemItem = this.createProblemItem(problem);
            problemsList.appendChild(problemItem);
        });
        
        fileGroup.appendChild(problemsList);
        
        return fileGroup;
    }
    
    private createProblemItem(problem: Diagnostic): HTMLElement {
        const problemItem = document.createElement('div');
        problemItem.className = 'problems-item';
        problemItem.dataset.uri = problem.uri;
        problemItem.dataset.line = problem.startLineNumber.toString();
        problemItem.dataset.column = problem.startColumn.toString();
        
        const severity = this.getSeverityInfo(problem.severity);
        
        problemItem.innerHTML = `
            <div class="problems-item-severity">
                <span class="problems-severity-icon">${severity.icon}</span>
            </div>
            <div class="problems-item-content">
                <div class="problems-item-message">${problem.message}</div>
                <div class="problems-item-location">
                    <span class="problems-location">Line ${problem.startLineNumber}, Column ${problem.startColumn}</span>
                    ${problem.source ? `<span class="problems-source">${problem.source}</span>` : ''}
                    ${problem.code ? `<span class="problems-code">[${problem.code}]</span>` : ''}
                </div>
            </div>
        `;
        
        // Click to navigate
        problemItem.addEventListener('click', () => {
            this.navigateToProblem(problem);
        });
        
        return problemItem;
    }
    
    private getSeverityInfo(severity: monaco.MarkerSeverity): { icon: string; className: string } {
        switch (severity) {
            case monaco.MarkerSeverity.Error:
                return { icon: '❌', className: 'error' };
            case monaco.MarkerSeverity.Warning:
                return { icon: '⚠️', className: 'warning' };
            case monaco.MarkerSeverity.Info:
                return { icon: 'ℹ️', className: 'info' };
            case monaco.MarkerSeverity.Hint:
                return { icon: '💡', className: 'hint' };
            default:
                return { icon: '❓', className: 'unknown' };
        }
    }
    
    private async navigateToProblem(problem: Diagnostic): Promise<void> {
        try {
            // Open the file in the editor
            await this.editorService.openFile(problem.uri);
            
            // Get the active editor
            const editor = this.editorService.getActiveEditor();
            if (editor) {
                // Navigate to the problem location
                const position = new monaco.Position(problem.startLineNumber, problem.startColumn);
                editor.setPosition(position);
                editor.revealPositionInCenter(position);
                editor.focus();
                
                // Highlight the problem range
                const range = new monaco.Range(
                    problem.startLineNumber,
                    problem.startColumn,
                    problem.endLineNumber,
                    problem.endColumn
                );
                
                editor.setSelection(range);
            }
        } catch (error) {
            console.error('Failed to navigate to problem:', error);
        }
    }
    
    private updateHeader(counts: { errors: number; warnings: number; infos: number }): void {
        if (!this.container) return;
        
        const totalCount = counts.errors + counts.warnings + counts.infos;
        
        // Update total count
        const totalCountEl = this.container.querySelector('.problems-count');
        if (totalCountEl) {
            totalCountEl.textContent = totalCount.toString();
        }
        
        // Update individual counts
        const errorCountEl = this.container.querySelector('.error-count');
        if (errorCountEl) {
            errorCountEl.textContent = counts.errors.toString();
        }
        
        const warningCountEl = this.container.querySelector('.warning-count');
        if (warningCountEl) {
            warningCountEl.textContent = counts.warnings.toString();
        }
        
        const infoCountEl = this.container.querySelector('.info-count');
        if (infoCountEl) {
            infoCountEl.textContent = counts.infos.toString();
        }
    }
    
    private getFileName(uri: string): string {
        return uri.split('/').pop() || uri;
    }
    
    private getRelativePath(uri: string): string {
        // Simple implementation - in a real IDE, this would be relative to workspace root
        const parts = uri.split('/');
        return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    }
}