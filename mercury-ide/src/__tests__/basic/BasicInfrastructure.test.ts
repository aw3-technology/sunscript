/**
 * Basic Infrastructure Tests
 * These tests verify that the core testing infrastructure is working
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { EventBus } from '../../core/event-bus';

describe('Basic Testing Infrastructure', () => {
    let container: Container;
    let eventBus: EventBus;
    
    beforeEach(() => {
        container = new Container();
        container.bind(TYPES.EventBus).to(EventBus);
        eventBus = container.get(TYPES.EventBus);
    });

    describe('Dependency Injection', () => {
        it('should create container', () => {
            expect(container).toBeDefined();
            expect(container).toBeInstanceOf(Container);
        });

        it('should resolve EventBus', () => {
            expect(eventBus).toBeDefined();
            expect(eventBus).toBeInstanceOf(EventBus);
        });

        it('should have event bus methods', () => {
            expect(typeof eventBus.on).toBe('function');
            expect(typeof eventBus.emit).toBe('function');
            expect(typeof eventBus.off).toBe('function');
        });
    });

    describe('Event System', () => {
        it('should emit and receive events', () => {
            const handler = jest.fn();
            
            eventBus.on('test-event', handler);
            eventBus.emit('test-event', { data: 'test' });
            
            expect(handler).toHaveBeenCalledWith(expect.objectContaining({ data: { data: 'test' } }));
        });

        it('should remove event listeners', () => {
            const handler = jest.fn();
            
            eventBus.on('test-event', handler);
            eventBus.off('test-event', handler);
            eventBus.emit('test-event', { data: 'test' });
            
            expect(handler).not.toHaveBeenCalled();
        });

        it('should handle multiple listeners', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            
            eventBus.on('test-event', handler1);
            eventBus.on('test-event', handler2);
            eventBus.emit('test-event', { data: 'test' });
            
            expect(handler1).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
        });
    });

    describe('Performance Testing', () => {
        it('should measure operation time', async () => {
            const start = performance.now();
            
            // Simulate some work
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const duration = performance.now() - start;
            expect(duration).toBeGreaterThan(5);
            expect(duration).toBeLessThan(100);
        });

        it('should handle concurrent operations', async () => {
            const operations = Array.from({ length: 5 }, (_, i) =>
                new Promise(resolve => setTimeout(() => resolve(i), 10))
            );
            
            const results = await Promise.all(operations);
            
            expect(results).toHaveLength(5);
            expect(results).toEqual([0, 1, 2, 3, 4]);
        });
    });

    describe('Data Generation', () => {
        it('should generate test data', () => {
            const testData = {
                string: 'test-string',
                number: 42,
                boolean: true,
                array: [1, 2, 3],
                object: { nested: 'value' }
            };
            
            expect(typeof testData.string).toBe('string');
            expect(typeof testData.number).toBe('number');
            expect(typeof testData.boolean).toBe('boolean');
            expect(Array.isArray(testData.array)).toBe(true);
            expect(typeof testData.object).toBe('object');
        });

        it('should generate random values', () => {
            const randomString = Math.random().toString(36);
            const randomNumber = Math.floor(Math.random() * 100);
            
            expect(typeof randomString).toBe('string');
            expect(randomString.length).toBeGreaterThan(0);
            expect(typeof randomNumber).toBe('number');
            expect(randomNumber).toBeGreaterThanOrEqual(0);
            expect(randomNumber).toBeLessThan(100);
        });
    });

    describe('Mock Functionality', () => {
        it('should create and use mocks', () => {
            const mockFunction = jest.fn();
            mockFunction.mockReturnValue('mocked value');
            
            const result = mockFunction('test');
            
            expect(mockFunction).toHaveBeenCalledWith('test');
            expect(result).toBe('mocked value');
        });

        it('should spy on methods', () => {
            const obj = {
                method: () => 'original'
            };
            
            const spy = jest.spyOn(obj, 'method');
            spy.mockReturnValue('spied');
            
            const result = obj.method();
            
            expect(spy).toHaveBeenCalled();
            expect(result).toBe('spied');
        });
    });

    describe('Async Testing', () => {
        it('should handle promises', async () => {
            const asyncOperation = () => Promise.resolve('async result');
            
            const result = await asyncOperation();
            
            expect(result).toBe('async result');
        });

        it('should handle promise rejections', async () => {
            const failingOperation = () => Promise.reject(new Error('async error'));
            
            await expect(failingOperation()).rejects.toThrow('async error');
        });

        it('should timeout long operations', async () => {
            const longOperation = () => new Promise(resolve => 
                setTimeout(() => resolve('completed'), 50)
            );
            
            const result = await longOperation();
            expect(result).toBe('completed');
        }, 100); // 100ms timeout
    });
});