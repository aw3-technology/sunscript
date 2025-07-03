import 'reflect-metadata';
import '@testing-library/jest-dom';

// Mock performance API for Node.js environment
Object.defineProperty(global, 'performance', {
    writable: true,
    value: {
        now: jest.fn(() => Date.now()),
        memory: {
            usedJSHeapSize: 1000000,
            totalJSHeapSize: 2000000,
            jsHeapSizeLimit: 4000000
        }
    }
});

// Mock requestAnimationFrame
Object.defineProperty(global, 'requestAnimationFrame', {
    writable: true,
    value: jest.fn((callback: FrameRequestCallback) => setTimeout(callback, 16))
});

// Mock cancelAnimationFrame
Object.defineProperty(global, 'cancelAnimationFrame', {
    writable: true,
    value: jest.fn((id: number) => clearTimeout(id))
});

// Mock DOM methods
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    writable: true,
    value: jest.fn()
});

Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    writable: true,
    value: jest.fn(() => ({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        right: 100,
        bottom: 100,
        left: 0,
        toJSON: () => {}
    }))
});

// Setup console spies
const originalConsole = { ...console };
beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
    jest.restoreAllMocks();
});