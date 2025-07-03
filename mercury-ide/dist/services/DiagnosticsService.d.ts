import { EventBus } from '../core/event-bus';
import * as monaco from 'monaco-editor';
export interface Diagnostic {
    uri: string;
    severity: monaco.MarkerSeverity;
    message: string;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    source: string;
    code?: string | number;
    relatedInformation?: DiagnosticRelatedInformation[];
}
export interface DiagnosticRelatedInformation {
    location: {
        uri: string;
        range: {
            startLineNumber: number;
            startColumn: number;
            endLineNumber: number;
            endColumn: number;
        };
    };
    message: string;
}
export declare class DiagnosticsService {
    private eventBus;
    private diagnostics;
    private problemsCount;
    constructor(eventBus: EventBus);
    private setupEventListeners;
    updateDiagnostics(uri: string, diagnostics: Diagnostic[]): void;
    private updateProblemsCount;
    private validateModel;
    private validateSunScript;
    getDiagnostics(uri?: string): Diagnostic[];
    getProblemsCount(): {
        errors: number;
        warnings: number;
        infos: number;
    };
    clearDiagnostics(uri: string): void;
    clearAllDiagnostics(): void;
}
