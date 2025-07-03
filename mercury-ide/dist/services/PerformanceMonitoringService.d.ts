import { EventBus } from '../core/event-bus';
import { LoggingService } from './LoggingService';
export interface PerformanceMetric {
    id: string;
    name: string;
    category: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, any>;
    marks?: PerformanceMark[];
}
export interface PerformanceMark {
    name: string;
    time: number;
    metadata?: Record<string, any>;
}
export interface PerformanceSnapshot {
    timestamp: Date;
    memory: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
    };
    fps: number;
    activeTimers: number;
    metrics: PerformanceMetric[];
}
export interface PerformanceThreshold {
    metric: string;
    threshold: number;
    action: 'warn' | 'error';
}
export declare class PerformanceMonitoringService {
    private eventBus;
    private loggingService;
    private metrics;
    private completedMetrics;
    private maxStoredMetrics;
    private thresholds;
    private isMonitoring;
    private monitoringInterval;
    private fpsFrames;
    private lastFrameTime;
    constructor(eventBus: EventBus, loggingService: LoggingService);
    private setupEventListeners;
    private setupDefaultThresholds;
    private startFPSMonitoring;
    startMetric(id: string, name: string, category: string, metadata?: Record<string, any>): void;
    endMetric(id: string, metadata?: Record<string, any>): PerformanceMetric | null;
    addMark(metricId: string, markName: string, metadata?: Record<string, any>): void;
    addThreshold(metric: string, threshold: number, action: 'warn' | 'error'): void;
    removeThreshold(metric: string): void;
    private checkThreshold;
    startMonitoring(interval?: number): void;
    stopMonitoring(): void;
    captureSnapshot(): PerformanceSnapshot;
    getActiveMetrics(): PerformanceMetric[];
    getCompletedMetrics(filter?: {
        category?: string;
        name?: string;
        minDuration?: number;
        maxDuration?: number;
        limit?: number;
    }): PerformanceMetric[];
    getAverageMetrics(): Map<string, {
        count: number;
        avgDuration: number;
        minDuration: number;
        maxDuration: number;
    }>;
    measure<T>(name: string, category: string, fn: () => T): T;
    measureAsync<T>(name: string, category: string, fn: () => Promise<T>): Promise<T>;
    exportMetrics(format?: 'json' | 'csv'): string;
    clearMetrics(): void;
    dispose(): void;
}
