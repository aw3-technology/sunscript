import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { EventBus } from '../../core/event-bus';
import { FileItem } from '../../services/FileSystemService';

/**
 * Utility functions for testing Mercury IDE components
 */

export class TestUtils {
    /**
     * Create a test container with all necessary bindings
     */
    static createTestContainer(): Container {
        const container = new Container();
        container.bind(TYPES.EventBus).to(EventBus);
        return container;
    }
    
    /**
     * Create a mock DOM element with specified properties
     */
    static createMockElement(tagName: string = 'div', id?: string, className?: string): HTMLElement {
        const element = document.createElement(tagName);
        if (id) element.id = id;
        if (className) element.className = className;
        return element;
    }
    
    /**
     * Wait for async operations to complete
     */
    static async waitForAsync(ms: number = 0): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Simulate a user click event
     */
    static simulateClick(element: HTMLElement): void {
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        element.dispatchEvent(event);
    }
    
    /**
     * Simulate a keyboard event
     */
    static simulateKeyEvent(
        element: HTMLElement, 
        type: 'keydown' | 'keyup' | 'keypress',
        key: string,
        options: Partial<KeyboardEventInit> = {}
    ): void {
        const event = new KeyboardEvent(type, {
            key,
            bubbles: true,
            cancelable: true,
            ...options
        });
        element.dispatchEvent(event);
    }
    
    /**
     * Simulate text input
     */
    static simulateTextInput(element: HTMLInputElement, value: string): void {
        element.value = value;
        const event = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);
    }
    
    /**
     * Create a performance measurement wrapper
     */
    static measurePerformance<T>(operation: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
        return new Promise(async (resolve) => {
            const start = performance.now();
            const result = await operation();
            const duration = performance.now() - start;
            resolve({ result, duration });
        });
    }
    
    /**
     * Create a mock file system structure
     */
    static createMockFileSystem(structure: Record<string, any>): FileItem[] {
        const files: FileItem[] = [];
        
        for (const [path, content] of Object.entries(structure)) {
            const parts = path.split('/');
            const name = parts[parts.length - 1];
            const isFolder = typeof content === 'object' && content !== null;
            
            const file: FileItem = {
                name,
                path,
                type: isFolder ? 'folder' : 'file',
                size: isFolder ? undefined : (typeof content === 'string' ? content.length : 1024),
                lastModified: new Date(),
                children: isFolder ? this.createMockFileSystem(content) : undefined
            };
            
            files.push(file);
        }
        
        return files;
    }
    
    /**
     * Generate random SunScript code for testing
     */
    static generateRandomSunScriptCode(options: {
        componentCount?: number;
        taskCount?: number;
        complexity?: 'simple' | 'medium' | 'complex';
    } = {}): string {
        const { componentCount = 1, taskCount = 3, complexity = 'simple' } = options;
        
        let code = '';
        
        for (let i = 0; i < componentCount; i++) {
            code += `@component Component${i} {\n`;
            code += `  state: {\n`;
            code += `    id: ${i},\n`;
            code += `    active: ${Math.random() > 0.5}\n`;
            code += `  }\n\n`;
            
            for (let j = 0; j < taskCount; j++) {
                code += `  @task task${j}(`;
                
                if (complexity !== 'simple') {
                    code += `param1: string, param2: number`;
                }
                
                code += `) {\n`;
                
                if (complexity === 'complex') {
                    code += `    if (param1 && param2 > 0) {\n`;
                    code += `      this.state.active = !this.state.active;\n`;
                    code += `      console.log(\`Task \${param1} executed with \${param2}\`);\n`;
                    code += `    }\n`;
                } else {
                    code += `    console.log("Task ${j} executed");\n`;
                }
                
                code += `  }\n\n`;
            }
            
            code += `}\n\n`;
        }
        
        return code;
    }
    
    /**
     * Create mock Monaco editor instance
     */
    static createMockMonacoEditor(): any {
        return {
            getValue: jest.fn(() => ''),
            setValue: jest.fn(),
            getModel: jest.fn(() => ({
                uri: { toString: () => 'file:///test.sun' },
                getValue: jest.fn(() => ''),
                setValue: jest.fn(),
                onDidChangeContent: jest.fn(),
                getLanguageId: jest.fn(() => 'sunscript')
            })),
            setModel: jest.fn(),
            focus: jest.fn(),
            layout: jest.fn(),
            dispose: jest.fn(),
            onDidChangeCursorPosition: jest.fn(),
            onDidChangeModelContent: jest.fn(),
            addAction: jest.fn(),
            addCommand: jest.fn(),
            createContextKey: jest.fn(() => ({ set: jest.fn(), get: jest.fn() })),
            getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
            setPosition: jest.fn(),
            revealLine: jest.fn(),
            deltaDecorations: jest.fn(() => []),
            changeViewZones: jest.fn(),
            getScrollTop: jest.fn(() => 0),
            setScrollTop: jest.fn()
        };
    }
    
    /**
     * Setup global Monaco mock
     */
    static setupMonacoMock(): void {
        const mockEditor = this.createMockMonacoEditor();
        
        (global as any).monaco = {
            editor: {
                create: jest.fn(() => mockEditor),
                createModel: jest.fn(() => mockEditor.getModel()),
                setModelLanguage: jest.fn(),
                defineTheme: jest.fn(),
                setTheme: jest.fn()
            },
            languages: {
                register: jest.fn(),
                setMonarchTokensProvider: jest.fn(),
                registerCompletionItemProvider: jest.fn(),
                registerHoverProvider: jest.fn(),
                registerDefinitionProvider: jest.fn()
            },
            Uri: {
                file: jest.fn((path: string) => ({ toString: () => `file://${path}` })),
                parse: jest.fn((uri: string) => ({ toString: () => uri }))
            },
            KeyCode: { KEY_S: 49, KEY_O: 48, KEY_N: 47 },
            KeyMod: { CtrlCmd: 2048, Shift: 1024 },
            MarkerSeverity: { Error: 8, Warning: 4, Info: 2, Hint: 1 }
        };
    }
    
    /**
     * Create a stress test for performance testing
     */
    static async stressTest(
        operation: () => Promise<any>,
        iterations: number = 100,
        concurrency: number = 10
    ): Promise<{
        totalTime: number;
        averageTime: number;
        minTime: number;
        maxTime: number;
        successCount: number;
        errorCount: number;
    }> {
        const results: number[] = [];
        let successCount = 0;
        let errorCount = 0;
        
        const batches = Math.ceil(iterations / concurrency);
        
        for (let batch = 0; batch < batches; batch++) {
            const batchPromises: Promise<number>[] = [];
            const batchSize = Math.min(concurrency, iterations - batch * concurrency);
            
            for (let i = 0; i < batchSize; i++) {
                batchPromises.push(
                    this.measurePerformance(operation).then(
                        result => {
                            successCount++;
                            return result.duration;
                        }
                    ).catch(error => {
                        errorCount++;
                        return 0;
                    })
                );
            }
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.filter(time => time > 0));
        }
        
        const totalTime = results.reduce((sum, time) => sum + time, 0);
        const averageTime = totalTime / results.length;
        const minTime = Math.min(...results);
        const maxTime = Math.max(...results);
        
        return {
            totalTime,
            averageTime,
            minTime,
            maxTime,
            successCount,
            errorCount
        };
    }
    
    /**
     * Generate test data for different scenarios
     */
    static generateTestData(type: 'small' | 'medium' | 'large' | 'huge'): any {
        const sizes = {
            small: { files: 5, components: 2, tasks: 3 },
            medium: { files: 25, components: 10, tasks: 8 },
            large: { files: 100, components: 50, tasks: 15 },
            huge: { files: 1000, components: 200, tasks: 30 }
        };
        
        const config = sizes[type];
        const testData: Record<string, string> = {};
        
        // Generate project files
        testData['genesis.sun'] = `
            @project TestProject {
                name: "Test Project ${type}"
                version: "1.0.0"
                components: [${Array.from({ length: config.components }, (_, i) => `"./components/Component${i}.sun"`).join(', ')}]
            }
        `;
        
        // Generate component files
        for (let i = 0; i < config.components; i++) {
            testData[`components/Component${i}.sun`] = this.generateRandomSunScriptCode({
                componentCount: 1,
                taskCount: config.tasks,
                complexity: type === 'small' ? 'simple' : type === 'huge' ? 'complex' : 'medium'
            });
        }
        
        // Generate additional files
        for (let i = config.components; i < config.files; i++) {
            testData[`files/File${i}.sun`] = `
                @task simpleTask${i}() {
                    console.log("Simple task ${i}");
                }
            `;
        }
        
        return testData;
    }
    
    /**
     * Assert that performance meets expectations
     */
    static assertPerformance(duration: number, maxDuration: number, operation: string): void {
        if (duration > maxDuration) {
            throw new Error(
                `Performance assertion failed for ${operation}: ` +
                `Expected <= ${maxDuration}ms, but got ${duration}ms`
            );
        }
    }
    
    /**
     * Create a memory usage tracker
     */
    static createMemoryTracker(): {
        start: () => void;
        measure: () => { used: number; total: number; limit: number };
        assertNoLeaks: (tolerance: number) => void;
    } {
        let initialMemory: number = 0;
        
        return {
            start: () => {
                if (performance.memory) {
                    initialMemory = performance.memory.usedJSHeapSize;
                }
            },
            measure: () => {
                if (performance.memory) {
                    return {
                        used: performance.memory.usedJSHeapSize,
                        total: performance.memory.totalJSHeapSize,
                        limit: performance.memory.jsHeapSizeLimit
                    };
                }
                return { used: 0, total: 0, limit: 0 };
            },
            assertNoLeaks: (tolerance: number = 1000000) => { // 1MB tolerance
                if (performance.memory) {
                    const currentMemory = performance.memory.usedJSHeapSize;
                    const increase = currentMemory - initialMemory;
                    
                    if (increase > tolerance) {
                        throw new Error(
                            `Memory leak detected: ${increase} bytes increase ` +
                            `(tolerance: ${tolerance} bytes)`
                        );
                    }
                }
            }
        };
    }
}

/**
 * Test fixtures for common testing scenarios
 */
export const TestFixtures = {
    sampleSunScriptCode: {
        simple: `
            @task hello() {
                console.log("Hello, World!");
            }
        `,
        component: `
            @component Button {
                state: {
                    text: "Click me",
                    disabled: false
                }
                
                @task click() {
                    console.log("Button clicked!");
                }
                
                @task disable() {
                    this.state.disabled = true;
                }
            }
        `,
        project: `
            @project MyApp {
                name: "My Application"
                version: "1.0.0"
                
                components: [
                    "./components/App.sun",
                    "./components/Header.sun",
                    "./components/Footer.sun"
                ]
                
                @task start() {
                    console.log("Starting application...");
                }
            }
        `,
        withErrors: `
            @component BrokenComponent {
                state: {
                    // Missing closing brace
                
                @task brokenTask(
                    // Missing parameters and body
            }
        `
    },
    
    sampleFileStructure: {
        'genesis.sun': TestFixtures.sampleSunScriptCode?.project || '',
        'components/App.sun': TestFixtures.sampleSunScriptCode?.component || '',
        'components/Header.sun': `
            @component Header {
                @task render() {
                    return "<header>My App</header>";
                }
            }
        `,
        'components/Footer.sun': `
            @component Footer {
                @task render() {
                    return "<footer>© 2024</footer>";
                }
            }
        `,
        'utils/helpers.sun': `
            @task formatDate(date: Date) {
                return date.toLocaleDateString();
            }
        `,
        'README.md': '# My SunScript Project\n\nThis is a test project.'
    }
};

/**
 * Custom Jest matchers for Mercury IDE testing
 */
export const CustomMatchers = {
    /**
     * Check if SunScript code is valid
     */
    toBeValidSunScript: (received: string) => {
        const hasDecorator = /@(task|component|project|service|api|route|middleware|auth|model|schema)/.test(received);
        const hasValidBraces = (received.match(/{/g) || []).length === (received.match(/}/g) || []).length;
        
        return {
            message: () => `Expected "${received}" to be valid SunScript code`,
            pass: hasDecorator && hasValidBraces
        };
    },
    
    /**
     * Check if performance is within acceptable range
     */
    toMeetPerformanceExpectations: (received: number, expected: number) => {
        return {
            message: () => `Expected operation to complete within ${expected}ms, but took ${received}ms`,
            pass: received <= expected
        };
    }
};

// Extend Jest matchers
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidSunScript(): R;
            toMeetPerformanceExpectations(expected: number): R;
        }
    }
}

// Add custom matchers to Jest
if (typeof expect !== 'undefined') {
    expect.extend(CustomMatchers);
}