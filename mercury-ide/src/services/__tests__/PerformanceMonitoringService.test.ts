import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { EventBus } from '../../core/event-bus';
import { LoggingService } from '../LoggingService';
import { PerformanceMonitoringService, PerformanceMetric } from '../PerformanceMonitoringService';

describe('PerformanceMonitoringService', () => {
    let container: Container;
    let performanceService: PerformanceMonitoringService;
    let eventBus: EventBus;
    let loggingService: LoggingService;
    
    beforeEach(() => {
        container = new Container();
        container.bind(TYPES.EventBus).to(EventBus);
        container.bind(TYPES.LoggingService).to(LoggingService);
        container.bind(TYPES.PerformanceMonitoringService).to(PerformanceMonitoringService);
        
        eventBus = container.get(TYPES.EventBus);
        loggingService = container.get(TYPES.LoggingService);
        performanceService = container.get(TYPES.PerformanceMonitoringService);
    });
    
    afterEach(() => {
        performanceService.dispose();
    });
    
    describe('Metric Tracking', () => {
        it('should start and end metrics correctly', () => {
            const metricId = 'test-metric';
            const metricName = 'Test Operation';
            const category = 'test';
            
            performanceService.startMetric(metricId, metricName, category);
            
            const activeMetrics = performanceService.getActiveMetrics();
            expect(activeMetrics).toHaveLength(1);
            expect(activeMetrics[0].id).toBe(metricId);
            expect(activeMetrics[0].name).toBe(metricName);
            expect(activeMetrics[0].category).toBe(category);
            
            const completedMetric = performanceService.endMetric(metricId);
            
            expect(completedMetric).toBeDefined();
            expect(completedMetric?.duration).toBeDefined();
            expect(completedMetric?.endTime).toBeDefined();
            expect(performanceService.getActiveMetrics()).toHaveLength(0);
        });
        
        it('should add marks to metrics', () => {
            const metricId = 'test-metric';
            performanceService.startMetric(metricId, 'Test Operation', 'test');
            
            performanceService.addMark(metricId, 'checkpoint-1', { step: 'first' });
            performanceService.addMark(metricId, 'checkpoint-2', { step: 'second' });
            
            const metric = performanceService.endMetric(metricId);
            
            expect(metric?.marks).toHaveLength(2);
            expect(metric?.marks?.[0].name).toBe('checkpoint-1');
            expect(metric?.marks?.[1].name).toBe('checkpoint-2');
        });
        
        it('should handle non-existent metrics gracefully', () => {
            const result = performanceService.endMetric('non-existent');
            expect(result).toBeNull();
            
            // Should not throw
            performanceService.addMark('non-existent', 'mark');
        });
    });
    
    describe('Threshold Management', () => {
        it('should trigger warnings when thresholds are exceeded', () => {
            const spy = jest.fn();
            eventBus.on('performance.thresholdExceeded', spy);
            
            performanceService.addThreshold('slow-operation', 100, 'warn');
            
            const metricId = 'test-slow';
            performanceService.startMetric(metricId, 'slow-operation', 'test');
            
            // Mock a slow operation
            jest.spyOn(performance, 'now')
                .mockReturnValueOnce(1000)  // start time
                .mockReturnValueOnce(1200); // end time (200ms duration)
            
            performanceService.endMetric(metricId);
            
            expect(spy).toHaveBeenCalledWith({
                metric: expect.objectContaining({
                    name: 'slow-operation',
                    duration: 200
                }),
                threshold: expect.objectContaining({
                    threshold: 100,
                    action: 'warn'
                }),
                duration: 200
            });
        });
        
        it('should remove thresholds', () => {
            performanceService.addThreshold('test-operation', 100, 'warn');
            performanceService.removeThreshold('test-operation');
            
            const spy = jest.fn();
            eventBus.on('performance.thresholdExceeded', spy);
            
            const metricId = 'test-slow';
            performanceService.startMetric(metricId, 'test-operation', 'test');
            
            // Mock slow operation
            jest.spyOn(performance, 'now')
                .mockReturnValueOnce(1000)
                .mockReturnValueOnce(1200);
            
            performanceService.endMetric(metricId);
            
            expect(spy).not.toHaveBeenCalled();
        });
    });
    
    describe('Monitoring', () => {
        it('should capture performance snapshots', () => {
            const snapshot = performanceService.captureSnapshot();
            
            expect(snapshot).toMatchObject({
                timestamp: expect.any(Date),
                memory: {
                    usedJSHeapSize: expect.any(Number),
                    totalJSHeapSize: expect.any(Number),
                    jsHeapSizeLimit: expect.any(Number)
                },
                fps: expect.any(Number),
                activeTimers: expect.any(Number),
                metrics: expect.any(Array)
            });
        });
        
        it('should start and stop monitoring', () => {
            const spy = jest.fn();
            eventBus.on('performance.snapshot', spy);
            
            performanceService.startMonitoring(100); // Very short interval for testing
            
            expect(performanceService['isMonitoring']).toBe(true);
            
            performanceService.stopMonitoring();
            
            expect(performanceService['isMonitoring']).toBe(false);
        });
    });
    
    describe('Query Methods', () => {
        beforeEach(() => {
            // Create some test metrics
            performanceService.startMetric('metric1', 'operation-a', 'category1');
            performanceService.endMetric('metric1');
            
            performanceService.startMetric('metric2', 'operation-b', 'category2');
            performanceService.endMetric('metric2');
            
            performanceService.startMetric('metric3', 'operation-a', 'category1');
            performanceService.endMetric('metric3');
        });
        
        it('should filter completed metrics by category', () => {
            const filtered = performanceService.getCompletedMetrics({
                category: 'category1'
            });
            
            expect(filtered).toHaveLength(2);
            expect(filtered.every(m => m.category === 'category1')).toBe(true);
        });
        
        it('should filter completed metrics by name', () => {
            const filtered = performanceService.getCompletedMetrics({
                name: 'operation-a'
            });
            
            expect(filtered).toHaveLength(2);
            expect(filtered.every(m => m.name === 'operation-a')).toBe(true);
        });
        
        it('should calculate average metrics', () => {
            const averages = performanceService.getAverageMetrics();
            
            expect(averages.has('operation-a')).toBe(true);
            expect(averages.has('operation-b')).toBe(true);
            
            const opAStats = averages.get('operation-a');
            expect(opAStats?.count).toBe(2);
            expect(opAStats?.avgDuration).toBeGreaterThan(0);
        });
    });
    
    describe('Utility Methods', () => {
        it('should measure synchronous operations', () => {
            const mockFn = jest.fn(() => 'result');
            
            const result = performanceService.measure('test-sync', 'test', mockFn);
            
            expect(result).toBe('result');
            expect(mockFn).toHaveBeenCalled();
            
            const completedMetrics = performanceService.getCompletedMetrics();
            expect(completedMetrics).toHaveLength(1);
            expect(completedMetrics[0].name).toBe('test-sync');
        });
        
        it('should measure asynchronous operations', async () => {
            const mockFn = jest.fn().mockResolvedValue('async-result');
            
            const result = await performanceService.measureAsync('test-async', 'test', mockFn);
            
            expect(result).toBe('async-result');
            expect(mockFn).toHaveBeenCalled();
            
            const completedMetrics = performanceService.getCompletedMetrics();
            expect(completedMetrics).toHaveLength(1);
            expect(completedMetrics[0].name).toBe('test-async');
        });
        
        it('should handle errors in measured operations', () => {
            const mockFn = jest.fn(() => {
                throw new Error('Test error');
            });
            
            expect(() => {
                performanceService.measure('error-test', 'test', mockFn);
            }).toThrow('Test error');
            
            const completedMetrics = performanceService.getCompletedMetrics();
            expect(completedMetrics).toHaveLength(1);
            expect(completedMetrics[0].metadata?.error).toBe('Test error');
        });
    });
    
    describe('Export Functions', () => {
        beforeEach(() => {
            performanceService.startMetric('export-test', 'Export Operation', 'export');
            performanceService.endMetric('export-test');
        });
        
        it('should export metrics as JSON', () => {
            const exported = performanceService.exportMetrics('json');
            const parsed = JSON.parse(exported);
            
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed[0]).toMatchObject({
                id: 'export-test',
                name: 'Export Operation',
                category: 'export'
            });
        });
        
        it('should export metrics as CSV', () => {
            const exported = performanceService.exportMetrics('csv');
            const lines = exported.split('\n');
            
            expect(lines[0]).toContain('ID,Name,Category');
            expect(lines[1]).toContain('export-test,Export Operation,export');
        });
    });
    
    describe('Event Integration', () => {
        it('should respond to event bus performance events', () => {
            const spy = jest.spyOn(performanceService, 'startMetric');
            
            eventBus.emit('performance.start', {
                data: {
                    id: 'event-metric',
                    name: 'Event Operation',
                    category: 'events'
                }
            });
            
            expect(spy).toHaveBeenCalledWith('event-metric', 'Event Operation', 'events', undefined);
        });
        
        it('should emit events when metrics are completed', () => {
            const spy = jest.fn();
            eventBus.on('performance.metricCompleted', spy);
            
            performanceService.startMetric('completion-test', 'Completion Test', 'test');
            const metric = performanceService.endMetric('completion-test');
            
            expect(spy).toHaveBeenCalledWith({ metric });
        });
    });
});