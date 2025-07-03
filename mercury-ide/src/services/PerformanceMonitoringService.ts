import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
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

@injectable()
export class PerformanceMonitoringService {
    private metrics = new Map<string, PerformanceMetric>();
    private completedMetrics: PerformanceMetric[] = [];
    private maxStoredMetrics = 1000;
    private thresholds = new Map<string, PerformanceThreshold>();
    private isMonitoring = false;
    private monitoringInterval: ReturnType<typeof setInterval> | null = null;
    private fpsFrames: number[] = [];
    private lastFrameTime = 0;
    
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.LoggingService) private loggingService: LoggingService
    ) {
        this.setupEventListeners();
        this.setupDefaultThresholds();
        this.startFPSMonitoring();
    }
    
    private setupEventListeners(): void {
        this.eventBus.on('performance.start', (event) => {
            const { id, name, category, metadata } = event.data;
            this.startMetric(id, name, category, metadata);
        });
        
        this.eventBus.on('performance.end', (event) => {
            const { id, metadata } = event.data;
            this.endMetric(id, metadata);
        });
        
        this.eventBus.on('performance.mark', (event) => {
            const { id, markName, metadata } = event.data;
            this.addMark(id, markName, metadata);
        });
    }
    
    private setupDefaultThresholds(): void {
        // Default performance thresholds
        this.addThreshold('editor.open', 1000, 'warn');
        this.addThreshold('editor.save', 500, 'warn');
        this.addThreshold('search.execute', 2000, 'warn');
        this.addThreshold('compile.sunscript', 5000, 'error');
        this.addThreshold('git.operation', 3000, 'warn');
    }
    
    private startFPSMonitoring(): void {
        const measureFPS = (timestamp: number) => {
            if (this.lastFrameTime) {
                const delta = timestamp - this.lastFrameTime;
                const fps = 1000 / delta;
                this.fpsFrames.push(fps);
                
                // Keep only last 60 frames
                if (this.fpsFrames.length > 60) {
                    this.fpsFrames.shift();
                }
            }
            
            this.lastFrameTime = timestamp;
            
            if (this.isMonitoring) {
                requestAnimationFrame(measureFPS);
            }
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    // Metric tracking
    startMetric(id: string, name: string, category: string, metadata?: Record<string, any>): void {
        const metric: PerformanceMetric = {
            id,
            name,
            category,
            startTime: performance.now(),
            metadata,
            marks: []
        };
        
        this.metrics.set(id, metric);
        this.loggingService.debug('performance', `Started metric: ${name}`, { id, category, metadata });
    }
    
    endMetric(id: string, metadata?: Record<string, any>): PerformanceMetric | null {
        const metric = this.metrics.get(id);
        if (!metric) {
            this.loggingService.warn('performance', `Metric not found: ${id}`);
            return null;
        }
        
        metric.endTime = performance.now();
        metric.duration = metric.endTime - metric.startTime;
        
        if (metadata) {
            metric.metadata = { ...metric.metadata, ...metadata };
        }
        
        // Check thresholds
        this.checkThreshold(metric);
        
        // Move to completed metrics
        this.metrics.delete(id);
        this.completedMetrics.push(metric);
        
        // Trim completed metrics
        if (this.completedMetrics.length > this.maxStoredMetrics) {
            this.completedMetrics.splice(0, this.completedMetrics.length - this.maxStoredMetrics);
        }
        
        this.loggingService.info('performance', `Completed metric: ${metric.name}`, {
            id,
            duration: metric.duration,
            metadata: metric.metadata
        });
        
        this.eventBus.emit('performance.metricCompleted', { metric });
        
        return metric;
    }
    
    addMark(metricId: string, markName: string, metadata?: Record<string, any>): void {
        const metric = this.metrics.get(metricId);
        if (!metric) {
            this.loggingService.warn('performance', `Cannot add mark - metric not found: ${metricId}`);
            return;
        }
        
        const mark: PerformanceMark = {
            name: markName,
            time: performance.now() - metric.startTime,
            metadata
        };
        
        metric.marks?.push(mark);
        
        this.loggingService.debug('performance', `Added mark: ${markName} to ${metric.name}`, {
            metricId,
            markTime: mark.time,
            metadata
        });
    }
    
    // Threshold management
    addThreshold(metric: string, threshold: number, action: 'warn' | 'error'): void {
        this.thresholds.set(metric, { metric, threshold, action });
    }
    
    removeThreshold(metric: string): void {
        this.thresholds.delete(metric);
    }
    
    private checkThreshold(metric: PerformanceMetric): void {
        const threshold = this.thresholds.get(metric.name);
        if (!threshold || !metric.duration) return;
        
        if (metric.duration > threshold.threshold) {
            const message = `Performance threshold exceeded for ${metric.name}: ${metric.duration.toFixed(2)}ms (threshold: ${threshold.threshold}ms)`;
            
            if (threshold.action === 'error') {
                this.loggingService.error('performance', message, { metric });
            } else {
                this.loggingService.warn('performance', message, { metric });
            }
            
            this.eventBus.emit('performance.thresholdExceeded', {
                metric,
                threshold,
                duration: metric.duration
            });
        }
    }
    
    // Monitoring
    startMonitoring(interval: number = 5000): void {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        this.monitoringInterval = setInterval(() => {
            const snapshot = this.captureSnapshot();
            this.eventBus.emit('performance.snapshot', { snapshot });
            
            // Log if memory usage is high
            if (snapshot.memory.usedJSHeapSize / snapshot.memory.jsHeapSizeLimit > 0.9) {
                this.loggingService.warn('performance', 'High memory usage detected', {
                    used: snapshot.memory.usedJSHeapSize,
                    limit: snapshot.memory.jsHeapSizeLimit,
                    percentage: (snapshot.memory.usedJSHeapSize / snapshot.memory.jsHeapSizeLimit * 100).toFixed(2)
                });
            }
            
            // Log if FPS is low
            if (snapshot.fps < 30) {
                this.loggingService.warn('performance', 'Low FPS detected', {
                    fps: snapshot.fps
                });
            }
        }, interval);
    }
    
    stopMonitoring(): void {
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
    
    captureSnapshot(): PerformanceSnapshot {
        const memory = (performance as any).memory || {
            usedJSHeapSize: 0,
            totalJSHeapSize: 0,
            jsHeapSizeLimit: 0
        };
        
        const avgFPS = this.fpsFrames.length > 0
            ? this.fpsFrames.reduce((a, b) => a + b, 0) / this.fpsFrames.length
            : 60;
        
        return {
            timestamp: new Date(),
            memory: {
                usedJSHeapSize: memory.usedJSHeapSize,
                totalJSHeapSize: memory.totalJSHeapSize,
                jsHeapSizeLimit: memory.jsHeapSizeLimit
            },
            fps: avgFPS,
            activeTimers: this.metrics.size,
            metrics: Array.from(this.metrics.values())
        };
    }
    
    // Query methods
    getActiveMetrics(): PerformanceMetric[] {
        return Array.from(this.metrics.values());
    }
    
    getCompletedMetrics(filter?: {
        category?: string;
        name?: string;
        minDuration?: number;
        maxDuration?: number;
        limit?: number;
    }): PerformanceMetric[] {
        let filtered = [...this.completedMetrics];
        
        if (filter) {
            if (filter.category) {
                filtered = filtered.filter(m => m.category === filter.category);
            }
            
            if (filter.name) {
                filtered = filtered.filter(m => m.name.includes(filter.name!));
            }
            
            if (filter.minDuration !== undefined) {
                filtered = filtered.filter(m => (m.duration || 0) >= filter.minDuration!);
            }
            
            if (filter.maxDuration !== undefined) {
                filtered = filtered.filter(m => (m.duration || 0) <= filter.maxDuration!);
            }
            
            if (filter.limit) {
                filtered = filtered.slice(-filter.limit);
            }
        }
        
        return filtered;
    }
    
    getAverageMetrics(): Map<string, { count: number; avgDuration: number; minDuration: number; maxDuration: number }> {
        const averages = new Map<string, { count: number; total: number; min: number; max: number }>();
        
        this.completedMetrics.forEach(metric => {
            if (!metric.duration) return;
            
            const existing = averages.get(metric.name);
            if (existing) {
                existing.count++;
                existing.total += metric.duration;
                existing.min = Math.min(existing.min, metric.duration);
                existing.max = Math.max(existing.max, metric.duration);
            } else {
                averages.set(metric.name, {
                    count: 1,
                    total: metric.duration,
                    min: metric.duration,
                    max: metric.duration
                });
            }
        });
        
        const result = new Map<string, { count: number; avgDuration: number; minDuration: number; maxDuration: number }>();
        
        averages.forEach((data, name) => {
            result.set(name, {
                count: data.count,
                avgDuration: data.total / data.count,
                minDuration: data.min,
                maxDuration: data.max
            });
        });
        
        return result;
    }
    
    // Utility methods
    measure<T>(name: string, category: string, fn: () => T): T {
        const id = `${name}-${Date.now()}`;
        this.startMetric(id, name, category);
        
        try {
            const result = fn();
            this.endMetric(id);
            return result;
        } catch (error) {
            this.endMetric(id, { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }
    
    async measureAsync<T>(name: string, category: string, fn: () => Promise<T>): Promise<T> {
        const id = `${name}-${Date.now()}`;
        this.startMetric(id, name, category);
        
        try {
            const result = await fn();
            this.endMetric(id);
            return result;
        } catch (error) {
            this.endMetric(id, { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }
    
    // Export data
    exportMetrics(format: 'json' | 'csv' = 'json'): string {
        const metrics = this.getCompletedMetrics();
        
        if (format === 'csv') {
            const headers = ['ID', 'Name', 'Category', 'Start Time', 'Duration (ms)', 'Metadata'];
            const rows = metrics.map(m => [
                m.id,
                m.name,
                m.category,
                new Date(m.startTime).toISOString(),
                m.duration?.toFixed(2) || '',
                JSON.stringify(m.metadata || {})
            ]);
            
            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }
        
        return JSON.stringify(metrics, null, 2);
    }
    
    // Clear data
    clearMetrics(): void {
        this.completedMetrics = [];
        this.eventBus.emit('performance.cleared');
    }
    
    // Dispose
    dispose(): void {
        this.stopMonitoring();
        this.metrics.clear();
        this.completedMetrics = [];
        this.thresholds.clear();
    }
}