import { DiagnosticsService } from '../services/DiagnosticsService';
import { EventBus } from '../core/event-bus';
import { EditorService } from '../services/EditorService';
export declare class ProblemsPanel {
    private diagnosticsService;
    private eventBus;
    private editorService;
    private container;
    private problemsList;
    private filterLevel;
    private currentProblems;
    constructor(diagnosticsService: DiagnosticsService, eventBus: EventBus, editorService: EditorService);
    private setupEventListeners;
    mount(container: HTMLElement): void;
    private render;
    private attachEventListeners;
    private setFilter;
    private refreshProblems;
    private filterProblems;
    private renderProblems;
    private groupProblemsByFile;
    private createFileGroup;
    private createProblemItem;
    private getSeverityInfo;
    private navigateToProblem;
    private updateHeader;
    private getFileName;
    private getRelativePath;
}
