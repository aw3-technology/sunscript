import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { EventBus } from '../../core/event-bus';
import { LoggingService, LogLevel } from '../LoggingService';

describe('LoggingService', () => {
    let container: Container;
    let loggingService: LoggingService;
    let eventBus: EventBus;
    
    beforeEach(() => {
        container = new Container();
        container.bind(TYPES.EventBus).to(EventBus);
        container.bind(TYPES.LoggingService).to(LoggingService);
        
        eventBus = container.get(TYPES.EventBus);
        loggingService = container.get(TYPES.LoggingService);
    });
    
    describe('Log Levels', () => {
        it('should only log messages at or above current log level', () => {
            loggingService.setLogLevel(LogLevel.WARN);
            
            loggingService.debug('test', 'debug message');
            loggingService.info('test', 'info message');
            loggingService.warn('test', 'warn message');
            loggingService.error('test', 'error message');
            
            const logs = loggingService.getLogs();
            expect(logs).toHaveLength(2);
            expect(logs[0].level).toBe(LogLevel.WARN);
            expect(logs[1].level).toBe(LogLevel.ERROR);
        });
        
        it('should emit event when log level changes', () => {
            const spy = jest.fn();
            eventBus.on('logging.levelChanged', spy);
            
            loggingService.setLogLevel(LogLevel.DEBUG);
            
            expect(spy).toHaveBeenCalledWith({
                data: { level: LogLevel.DEBUG }
            });
        });
    });
    
    describe('Log Filtering', () => {
        beforeEach(() => {
            loggingService.setLogLevel(LogLevel.DEBUG);
            loggingService.debug('category1', 'message 1');
            loggingService.info('category2', 'message 2');
            loggingService.warn('category1', 'message 3');
            loggingService.error('category2', 'error message');
        });
        
        it('should filter by log level', () => {
            const filtered = loggingService.getLogs({
                levels: [LogLevel.WARN, LogLevel.ERROR]
            });
            
            expect(filtered).toHaveLength(2);
            expect(filtered[0].level).toBe(LogLevel.WARN);
            expect(filtered[1].level).toBe(LogLevel.ERROR);
        });
        
        it('should filter by category', () => {
            const filtered = loggingService.getLogs({
                categories: ['category1']
            });
            
            expect(filtered).toHaveLength(2);
            expect(filtered.every(log => log.category === 'category1')).toBe(true);
        });
        
        it('should filter by search text', () => {
            const filtered = loggingService.getLogs({
                searchText: 'error'
            });
            
            expect(filtered).toHaveLength(1);
            expect(filtered[0].message).toContain('error');
        });
    });
    
    describe('Log Export', () => {
        beforeEach(() => {
            loggingService.info('test', 'Test message', { data: 'value' });
        });
        
        it('should export logs as JSON', () => {
            const exported = loggingService.exportLogs('json');
            const parsed = JSON.parse(exported);
            
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed[0]).toHaveProperty('message', 'Test message');
        });
        
        it('should export logs as CSV', () => {
            const exported = loggingService.exportLogs('csv');
            const lines = exported.split('\n');
            
            expect(lines[0]).toContain('Timestamp,Level,Category,Message');
            expect(lines[1]).toContain('INFO,test,"Test message"');
        });
        
        it('should export logs as text', () => {
            const exported = loggingService.exportLogs('text');
            
            expect(exported).toContain('[INFO] [test] Test message');
            expect(exported).toContain('Data: {\n  "data": "value"\n}');
        });
    });
    
    describe('Console Override', () => {
        let originalConsoleLog: typeof console.log;
        let originalConsoleError: typeof console.error;
        
        beforeEach(() => {
            originalConsoleLog = console.log;
            originalConsoleError = console.error;
        });
        
        afterEach(() => {
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
        });
        
        it('should capture console.log messages', () => {
            console.log('Test console message');
            
            const logs = loggingService.getLogs();
            expect(logs).toContainEqual(
                expect.objectContaining({
                    category: 'console',
                    message: 'Test console message',
                    level: LogLevel.INFO
                })
            );
        });
        
        it('should capture console.error with stack trace', () => {
            const error = new Error('Test error');
            console.error(error);
            
            const logs = loggingService.getLogs();
            const errorLog = logs.find(log => log.level === LogLevel.ERROR);
            
            expect(errorLog).toBeDefined();
            expect(errorLog?.stack).toContain('Error: Test error');
        });
    });
    
    describe('Log Handlers', () => {
        it('should notify registered handlers', () => {
            const handler = jest.fn();
            loggingService.registerHandler('test-handler', handler);
            
            loggingService.info('test', 'Test message');
            
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: LogLevel.INFO,
                    category: 'test',
                    message: 'Test message'
                })
            );
        });
        
        it('should handle handler errors gracefully', () => {
            const errorHandler = jest.fn(() => {
                throw new Error('Handler error');
            });
            
            loggingService.registerHandler('error-handler', errorHandler);
            
            expect(() => {
                loggingService.info('test', 'Test message');
            }).not.toThrow();
        });
    });
    
    describe('Performance Helpers', () => {
        it('should log performance data when provided', () => {
            loggingService.info('performance', 'Operation completed', {
                duration: 123,
                id: 'test-operation'
            });
            
            const logs = loggingService.getLogs({
                categories: ['performance']
            });
            
            expect(logs).toContainEqual(
                expect.objectContaining({
                    message: 'Operation completed',
                    category: 'performance',
                    data: expect.objectContaining({
                        duration: 123,
                        id: 'test-operation'
                    })
                })
            );
        });
        
        it('should log failed async operations', async () => {
            const error = new Error('Operation failed');
            const operation = jest.fn().mockRejectedValue(error);
            
            await expect(
                loggingService.measureAsync('failing-operation', operation)
            ).rejects.toThrow('Operation failed');
            
            const logs = loggingService.getLogs({
                categories: ['performance'],
                levels: [LogLevel.ERROR]
            });
            
            expect(logs).toContainEqual(
                expect.objectContaining({
                    message: 'Async operation failed: failing-operation'
                })
            );
        });
    });
});