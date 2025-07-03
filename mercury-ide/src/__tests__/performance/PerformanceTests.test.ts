import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { FileSystemService } from '../../services/FileSystemService';
import { SunScriptCompilerService } from '../../services/SunScriptCompilerService';
import { Editor } from '../../components/Editor';
import { FileExplorer } from '../../components/FileExplorer';
import { TestUtils, TestFixtures } from '../utils/TestUtils';

describe('Mercury IDE Performance Tests', () => {
    let container: Container;
    let fileSystemService: FileSystemService;
    let compilerService: SunScriptCompilerService;
    let editor: Editor;
    let fileExplorer: FileExplorer;
    
    beforeEach(() => {
        TestUtils.setupMonacoMock();
        
        container = TestUtils.createTestContainer();
        container.bind(TYPES.FileSystemService).to(FileSystemService);
        container.bind(TYPES.CompilerService).to(SunScriptCompilerService);
        container.bind(TYPES.Editor).to(Editor);
        container.bind(TYPES.FileExplorer).to(FileExplorer);
        
        fileSystemService = container.get(TYPES.FileSystemService);
        compilerService = container.get(TYPES.CompilerService);
        editor = container.get(TYPES.Editor);
        fileExplorer = container.get(TYPES.FileExplorer);
    });
    
    describe('File System Performance', () => {
        it('should load files quickly', async () => {
            const { result, duration } = await TestUtils.measurePerformance(() =>
                fileSystemService.loadFile('/test/example.sun')
            );
            
            expect(result).toBeDefined();
            TestUtils.assertPerformance(duration, 100, 'file loading');
        });
        
        it('should save files quickly', async () => {
            const content = TestFixtures.sampleSunScriptCode.component;
            
            const { duration } = await TestUtils.measurePerformance(() =>
                fileSystemService.saveFile('/test/component.sun', content)
            );
            
            TestUtils.assertPerformance(duration, 100, 'file saving');
        });
        
        it('should handle large files efficiently', async () => {
            const largeContent = TestUtils.generateRandomSunScriptCode({
                componentCount: 50,
                taskCount: 20,
                complexity: 'complex'
            });
            
            const { duration } = await TestUtils.measurePerformance(() =>
                fileSystemService.saveFile('/test/large.sun', largeContent)
            );
            
            TestUtils.assertPerformance(duration, 500, 'large file saving');
        });
        
        it('should list directory contents quickly', async () => {
            const { result, duration } = await TestUtils.measurePerformance(() =>
                fileSystemService.getFiles()
            );
            
            expect(Array.isArray(result)).toBe(true);
            TestUtils.assertPerformance(duration, 200, 'directory listing');
        });
        
        it('should handle concurrent file operations', async () => {
            const operations = Array.from({ length: 10 }, (_, i) =>
                fileSystemService.saveFile(`/test/concurrent-${i}.sun`, `@task test${i}() {}`)
            );
            
            const { duration } = await TestUtils.measurePerformance(() =>
                Promise.all(operations)
            );
            
            TestUtils.assertPerformance(duration, 1000, 'concurrent file operations');
        });
    });
    
    describe('Compiler Performance', () => {
        it('should compile small files quickly', async () => {
            const { result, duration } = await TestUtils.measurePerformance(() =>
                compilerService.validate(TestFixtures.sampleSunScriptCode.simple)
            );
            
            expect(result.valid).toBe(true);
            TestUtils.assertPerformance(duration, 100, 'small file compilation');
        });
        
        it('should handle complex code compilation', async () => {
            const complexCode = TestUtils.generateRandomSunScriptCode({
                componentCount: 10,
                taskCount: 15,
                complexity: 'complex'
            });
            
            const { result, duration } = await TestUtils.measurePerformance(() =>
                compilerService.validate(complexCode)
            );
            
            expect(result).toHaveProperty('valid');
            TestUtils.assertPerformance(duration, 500, 'complex code compilation');
        });
        
        it('should build projects efficiently', async () => {
            const { result, duration } = await TestUtils.measurePerformance(() =>
                compilerService.build('/test/project')
            );
            
            expect(result).toHaveProperty('success');
            TestUtils.assertPerformance(duration, 1000, 'project building');
        });
        
        it('should handle multiple concurrent validations', async () => {
            const codes = Array.from({ length: 5 }, (_, i) =>
                TestUtils.generateRandomSunScriptCode({
                    componentCount: 2,
                    taskCount: 5,
                    complexity: 'medium'
                })
            );
            
            const { duration } = await TestUtils.measurePerformance(() =>
                Promise.all(codes.map(code => compilerService.validate(code)))
            );
            
            TestUtils.assertPerformance(duration, 1000, 'concurrent compilations');
        });
    });
    
    describe('Editor Performance', () => {
        let container: HTMLElement;
        
        beforeEach(() => {
            container = TestUtils.createMockElement('div', 'editor-container');
            document.body.appendChild(container);
            
            editor.initialize();
            editor.mount(container);
        });
        
        afterEach(() => {
            document.body.removeChild(container);
        });
        
        it('should open files quickly', async () => {
            const file = {
                name: 'test.sun',
                content: TestFixtures.sampleSunScriptCode.component
            };
            
            const { duration } = await TestUtils.measurePerformance(() =>
                Promise.resolve(editor.openFile(file))
            );
            
            TestUtils.assertPerformance(duration, 50, 'file opening in editor');
        });
        
        it('should handle large files in editor', async () => {
            const largeContent = TestUtils.generateRandomSunScriptCode({
                componentCount: 100,
                taskCount: 10,
                complexity: 'simple'
            });
            
            const file = {
                name: 'large.sun',
                content: largeContent
            };
            
            const { duration } = await TestUtils.measurePerformance(() =>
                Promise.resolve(editor.openFile(file))
            );
            
            TestUtils.assertPerformance(duration, 200, 'large file opening');
        });
        
        it('should switch between files quickly', async () => {
            const files = Array.from({ length: 10 }, (_, i) => ({
                name: `file${i}.sun`,
                content: TestUtils.generateRandomSunScriptCode({
                    componentCount: 1,
                    taskCount: 3,
                    complexity: 'simple'
                })
            }));
            
            const { duration } = await TestUtils.measurePerformance(async () => {
                for (const file of files) {
                    editor.openFile(file);
                }
            });
            
            TestUtils.assertPerformance(duration, 300, 'file switching');
        });
    });
    
    describe('File Explorer Performance', () => {
        let container: HTMLElement;
        
        beforeEach(async () => {
            container = TestUtils.createMockElement('div', 'explorer-container');
            document.body.appendChild(container);
        });
        
        afterEach(() => {
            document.body.removeChild(container);
        });
        
        it('should render file tree quickly', async () => {
            const { duration } = await TestUtils.measurePerformance(() =>
                fileExplorer.mount(container)
            );
            
            TestUtils.assertPerformance(duration, 200, 'file tree rendering');
        });
        
        it('should handle large directory structures', async () => {
            // Mock large file structure
            const largeStructure = TestUtils.createMockFileSystem(
                TestUtils.generateTestData('large')
            );
            
            jest.spyOn(fileSystemService, 'getFiles').mockResolvedValue(largeStructure);
            
            const { duration } = await TestUtils.measurePerformance(() =>
                fileExplorer.mount(container)
            );
            
            TestUtils.assertPerformance(duration, 1000, 'large directory rendering');
        });
        
        it('should refresh efficiently', async () => {
            await fileExplorer.mount(container);
            
            const { duration } = await TestUtils.measurePerformance(() => {
                fileExplorer.refresh();
                return TestUtils.waitForAsync(10);
            });
            
            TestUtils.assertPerformance(duration, 100, 'file explorer refresh');
        });
    });
    
    describe('Memory Usage Tests', () => {
        it('should not leak memory during file operations', async () => {
            const memoryTracker = TestUtils.createMemoryTracker();
            memoryTracker.start();
            
            // Perform many file operations
            for (let i = 0; i < 100; i++) {
                await fileSystemService.saveFile(`/test/memory-test-${i}.sun`, `@task test${i}() {}`);
                await fileSystemService.loadFile(`/test/memory-test-${i}.sun`);
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            await TestUtils.waitForAsync(100);
            
            memoryTracker.assertNoLeaks(5000000); // 5MB tolerance
        });
        
        it('should not leak memory during compilation', async () => {
            const memoryTracker = TestUtils.createMemoryTracker();
            memoryTracker.start();
            
            // Perform many compilations
            for (let i = 0; i < 50; i++) {
                const code = TestUtils.generateRandomSunScriptCode({
                    componentCount: 2,
                    taskCount: 5,
                    complexity: 'medium'
                });
                await compilerService.validate(code);
            }
            
            if (global.gc) {
                global.gc();
            }
            
            await TestUtils.waitForAsync(100);
            
            memoryTracker.assertNoLeaks(10000000); // 10MB tolerance
        });
    });
    
    describe('Stress Tests', () => {
        it('should handle rapid file operations without degradation', async () => {
            const stressResults = await TestUtils.stressTest(
                async () => {
                    const content = TestUtils.generateRandomSunScriptCode({
                        componentCount: 1,
                        taskCount: 2,
                        complexity: 'simple'
                    });
                    
                    await fileSystemService.saveFile('/test/stress.sun', content);
                    const loaded = await fileSystemService.loadFile('/test/stress.sun');
                    await compilerService.validate(loaded);
                },
                100, // 100 iterations
                10   // 10 concurrent operations
            );
            
            expect(stressResults.successCount).toBeGreaterThan(90); // 90% success rate
            expect(stressResults.averageTime).toBeLessThan(100); // Average under 100ms
            expect(stressResults.maxTime).toBeLessThan(1000); // Max under 1 second
        });
        
        it('should maintain performance under heavy load', async () => {
            const heavyLoadResults = await TestUtils.stressTest(
                async () => {
                    const largeCode = TestUtils.generateRandomSunScriptCode({
                        componentCount: 5,
                        taskCount: 10,
                        complexity: 'complex'
                    });
                    
                    await compilerService.validate(largeCode);
                },
                50,  // 50 iterations
                5    // 5 concurrent operations
            );
            
            expect(heavyLoadResults.successCount).toBeGreaterThan(45); // 90% success rate
            expect(heavyLoadResults.averageTime).toBeLessThan(500); // Average under 500ms
        });
        
        it('should handle editor stress testing', async () => {
            const container = TestUtils.createMockElement('div', 'stress-editor');
            document.body.appendChild(container);
            
            try {
                editor.initialize();
                editor.mount(container);
                
                const editorStressResults = await TestUtils.stressTest(
                    async () => {
                        const file = {
                            name: `stress-${Math.random()}.sun`,
                            content: TestUtils.generateRandomSunScriptCode({
                                componentCount: 1,
                                taskCount: 3,
                                complexity: 'simple'
                            })
                        };
                        
                        editor.openFile(file);
                        await TestUtils.waitForAsync(1);
                    },
                    200, // 200 iterations
                    1    // Sequential operations for editor
                );
                
                expect(editorStressResults.successCount).toBe(200); // All should succeed
                expect(editorStressResults.averageTime).toBeLessThan(50); // Very fast
            } finally {
                document.body.removeChild(container);
            }
        });
    });
    
    describe('Scalability Tests', () => {
        const testSizes = ['small', 'medium', 'large'] as const;
        
        testSizes.forEach(size => {
            it(`should handle ${size} projects efficiently`, async () => {
                const testData = TestUtils.generateTestData(size);
                const fileCount = Object.keys(testData).length;
                
                const { duration } = await TestUtils.measurePerformance(async () => {
                    // Save all files
                    for (const [fileName, content] of Object.entries(testData)) {
                        await fileSystemService.saveFile(`/test/${size}/${fileName}`, content as string);
                    }
                    
                    // Build project
                    await compilerService.build(`/test/${size}`);
                });
                
                const expectedMaxTime = {
                    small: 1000,   // 1 second
                    medium: 5000,  // 5 seconds
                    large: 15000   // 15 seconds
                }[size];
                
                TestUtils.assertPerformance(duration, expectedMaxTime, `${size} project handling`);
                
                console.log(`${size} project (${fileCount} files) processed in ${duration}ms`);
            });
        });
    });
});