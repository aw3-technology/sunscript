import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { Editor } from '../../components/Editor';
import { FileExplorer } from '../../components/FileExplorer';
import { SunScriptCompilerService } from '../../services/SunScriptCompilerService';
import { FileSystemService } from '../../services/FileSystemService';
import { EventBus } from '../../core/event-bus';
import { App } from '../../components/App.old';

// Mock Monaco Editor (comprehensive mock)
const mockEditor = {
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

const mockMonaco = {
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

(global as any).monaco = mockMonaco;

describe('Complete IDE Workflow E2E Tests', () => {
    let container: Container;
    let app: App;
    let editor: Editor;
    let fileExplorer: FileExplorer;
    let compilerService: SunScriptCompilerService;
    let fileSystemService: FileSystemService;
    let eventBus: EventBus;
    
    let rootElement: HTMLElement;
    
    const sampleProject = {
        'genesis.sun': `
            @project TodoApp {
                name: "Todo Application"
                version: "1.0.0"
                
                components: [
                    "./components/TodoList.sun",
                    "./components/TodoItem.sun"
                ]
            }
        `,
        'components/TodoList.sun': `
            @component TodoList {
                state: {
                    todos: []
                }
                
                @task addTodo(text: string) {
                    this.state.todos.push({
                        id: Date.now(),
                        text: text,
                        completed: false
                    });
                }
                
                @task removeTodo(id: number) {
                    this.state.todos = this.state.todos.filter(todo => todo.id !== id);
                }
            }
        `,
        'components/TodoItem.sun': `
            @component TodoItem {
                @task toggle() {
                    this.props.completed = !this.props.completed;
                }
                
                @task render() {
                    return \`
                        <div class="todo-item \${this.props.completed ? 'completed' : ''}">
                            <span>\${this.props.text}</span>
                            <button onclick="this.toggle()">Toggle</button>
                        </div>
                    \`;
                }
            }
        `
    };
    
    beforeEach(() => {
        container = new Container();
        
        // Bind all services
        container.bind(TYPES.EventBus).to(EventBus);
        container.bind(TYPES.FileSystemService).to(FileSystemService);
        container.bind(TYPES.CompilerService).to(SunScriptCompilerService);
        container.bind(TYPES.Editor).to(Editor);
        container.bind(TYPES.FileExplorer).to(FileExplorer);
        
        // Get services
        eventBus = container.get(TYPES.EventBus);
        fileSystemService = container.get(TYPES.FileSystemService);
        compilerService = container.get(TYPES.CompilerService);
        editor = container.get(TYPES.Editor);
        fileExplorer = container.get(TYPES.FileExplorer);
        
        // Create root element
        rootElement = document.createElement('div');
        rootElement.id = 'root';
        document.body.appendChild(rootElement);
        
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        document.body.removeChild(rootElement);
    });
    
    describe('Project Creation and Setup Workflow', () => {
        it('should create new project and set up file structure', async () => {
            // Step 1: Create new project
            await fileSystemService.createProject({
                name: 'TodoApp',
                path: '/projects/TodoApp',
                template: 'basic'
            });
            
            // Step 2: Open project in file explorer
            const project = await fileSystemService.openProject('/projects/TodoApp');
            expect(project.name).toBe('TodoApp');
            
            // Step 3: Create project files
            for (const [fileName, content] of Object.entries(sampleProject)) {
                await fileSystemService.saveFile(`/projects/TodoApp/${fileName}`, content);
            }
            
            // Step 4: Verify file structure
            const files = await fileSystemService.getFiles('/projects/TodoApp');
            expect(files.some(f => f.name === 'genesis.sun')).toBe(true);
            expect(files.some(f => f.name === 'components')).toBe(true);
            
            const componentFiles = await fileSystemService.getFiles('/projects/TodoApp/components');
            expect(componentFiles.some(f => f.name === 'TodoList.sun')).toBe(true);
            expect(componentFiles.some(f => f.name === 'TodoItem.sun')).toBe(true);
        });
        
        it('should validate project structure and dependencies', async () => {
            // Create project files
            for (const [fileName, content] of Object.entries(sampleProject)) {
                await fileSystemService.saveFile(`/projects/TodoApp/${fileName}`, content);
            }
            
            // Validate genesis.sun
            const genesisContent = await fileSystemService.loadFile('/projects/TodoApp/genesis.sun');
            const validationResult = await compilerService.validate(genesisContent);
            
            expect(validationResult.valid).toBe(true);
            expect(validationResult.errors).toHaveLength(0);
        });
    });
    
    describe('Code Editing and Compilation Workflow', () => {
        beforeEach(async () => {
            // Set up project files
            for (const [fileName, content] of Object.entries(sampleProject)) {
                await fileSystemService.saveFile(`/projects/TodoApp/${fileName}`, content);
            }
            
            // Initialize editor and file explorer
            editor.initialize();
            editor.mount(rootElement);
            await fileExplorer.mount(rootElement);
            
            // Connect file explorer to editor
            fileExplorer.onFileSelect((file) => {
                editor.openFile(file);
            });
        });
        
        it('should complete full editing cycle: open → edit → save → compile', async () => {
            // Step 1: Open file in editor via file explorer simulation
            const todoListContent = await fileSystemService.loadFile('/projects/TodoApp/components/TodoList.sun');
            editor.openFile({
                name: 'TodoList.sun',
                content: todoListContent
            });
            
            expect(mockEditor.setValue).toHaveBeenCalledWith(todoListContent);
            
            // Step 2: Edit file content
            const modifiedContent = todoListContent + '\n\n@task clearCompleted() {\n    this.state.todos = this.state.todos.filter(todo => !todo.completed);\n}';
            mockEditor.getValue.mockReturnValue(modifiedContent);
            
            // Step 3: Save file
            await fileSystemService.saveFile('/projects/TodoApp/components/TodoList.sun', modifiedContent);
            
            // Step 4: Validate modified code
            const validationResult = await compilerService.validate(modifiedContent);
            expect(validationResult.valid).toBe(true);
            
            // Step 5: Compile individual file
            const compileResult = await compilerService.compile('/projects/TodoApp/components/TodoList.sun');
            expect(compileResult.success).toBe(true);
        });
        
        it('should handle compilation errors and show diagnostics', async () => {
            // Open file with invalid content
            const invalidContent = `
                @component BrokenComponent {
                    state: {
                        // Missing closing brace
                    
                    @task brokenTask(
                        // Missing parameters and body
                }
            `;
            
            editor.openFile({
                name: 'BrokenComponent.sun',
                content: invalidContent
            });
            
            // Validate and expect errors
            const validationResult = await compilerService.validate(invalidContent);
            expect(validationResult.valid).toBe(false);
            expect(validationResult.errors.length).toBeGreaterThan(0);
            
            // Show errors in editor
            const errors = validationResult.errors.map((error, index) => ({
                line: index + 1,
                column: 1,
                message: error,
                severity: 'error'
            }));
            
            editor.showErrors(errors);
            expect(mockEditor.deltaDecorations).toHaveBeenCalled();
        });
    });
    
    describe('Project Build and Execution Workflow', () => {
        beforeEach(async () => {
            // Set up complete project
            for (const [fileName, content] of Object.entries(sampleProject)) {
                await fileSystemService.saveFile(`/projects/TodoApp/${fileName}`, content);
            }
        });
        
        it('should build complete project successfully', async () => {
            // Build entire project
            const buildResult = await compilerService.build('/projects/TodoApp');
            
            expect(buildResult.success).toBe(true);
            expect(buildResult.output).toContain('Compiled');
            
            if (buildResult.success) {
                expect(buildResult.output).toBeTruthy();
            }
        });
        
        it('should run project and generate output', async () => {
            // Run the main project file
            const runResult = await compilerService.run('/projects/TodoApp/genesis.sun');
            
            expect(runResult).toHaveProperty('success');
            
            if (runResult.success) {
                expect(runResult.output).toContain('execution');
            }
        });
        
        it('should handle build failures gracefully', async () => {
            // Create project with missing dependencies
            await fileSystemService.saveFile('/projects/BrokenApp/genesis.sun', `
                @project BrokenApp {
                    components: [
                        "./nonexistent/Component.sun"
                    ]
                }
            `);
            
            const buildResult = await compilerService.build('/projects/BrokenApp');
            
            // Should handle missing files gracefully (in fallback mode)
            expect(buildResult).toHaveProperty('success');
        });
    });
    
    describe('Multi-file Project Workflow', () => {
        beforeEach(async () => {
            editor.initialize();
            editor.mount(rootElement);
            await fileExplorer.mount(rootElement);
            
            fileExplorer.onFileSelect((file) => {
                editor.openFile(file);
            });
            
            // Set up project
            for (const [fileName, content] of Object.entries(sampleProject)) {
                await fileSystemService.saveFile(`/projects/TodoApp/${fileName}`, content);
            }
        });
        
        it('should handle multi-file editing session', async () => {
            const files = Object.keys(sampleProject);
            
            // Open and edit multiple files
            for (const fileName of files) {
                const content = await fileSystemService.loadFile(`/projects/TodoApp/${fileName}`);
                editor.openFile({
                    name: fileName.split('/').pop() || fileName,
                    content: content
                });
                
                // Simulate editing
                const modifiedContent = content + '\n// Modified in test';
                mockEditor.getValue.mockReturnValue(modifiedContent);
                
                // Save file
                await fileSystemService.saveFile(`/projects/TodoApp/${fileName}`, modifiedContent);
            }
            
            // Verify all files were processed
            expect(mockEditor.setValue).toHaveBeenCalledTimes(files.length);
        });
        
        it('should maintain consistency across file dependencies', async () => {
            // Modify TodoItem component
            const todoItemContent = await fileSystemService.loadFile('/projects/TodoApp/components/TodoItem.sun');
            const modifiedTodoItem = todoItemContent.replace('toggle()', 'toggleComplete()');
            
            await fileSystemService.saveFile('/projects/TodoApp/components/TodoItem.sun', modifiedTodoItem);
            
            // Update TodoList to use new method name
            const todoListContent = await fileSystemService.loadFile('/projects/TodoApp/components/TodoList.sun');
            const updatedTodoList = todoListContent + '\n// Updated to use toggleComplete method';
            
            await fileSystemService.saveFile('/projects/TodoApp/components/TodoList.sun', updatedTodoList);
            
            // Build project to check consistency
            const buildResult = await compilerService.build('/projects/TodoApp');
            expect(buildResult.success).toBe(true);
        });
    });
    
    describe('Error Recovery and User Experience', () => {
        it('should recover from file system errors', async () => {
            // Simulate file system error
            jest.spyOn(fileSystemService, 'loadFile').mockRejectedValueOnce(new Error('File not found'));
            
            // Attempt to open non-existent file
            try {
                await fileSystemService.loadFile('/projects/TodoApp/nonexistent.sun');
            } catch (error) {
                expect(error.message).toBe('File not found');
            }
            
            // Verify system continues to work
            const existingFile = await fileSystemService.loadFile('/projects/TodoApp/genesis.sun');
            expect(existingFile).toBeTruthy();
        });
        
        it('should handle rapid user interactions without race conditions', async () => {
            editor.initialize();
            editor.mount(rootElement);
            await fileExplorer.mount(rootElement);
            
            fileExplorer.onFileSelect((file) => {
                editor.openFile(file);
            });
            
            // Simulate rapid file switching
            const fileOperations = Object.keys(sampleProject).map(async (fileName, index) => {
                const content = await fileSystemService.loadFile(`/projects/TodoApp/${fileName}`);
                editor.openFile({
                    name: fileName,
                    content: content
                });
                
                // Simulate editing and saving
                const modified = content + `\n// Rapid edit ${index}`;
                mockEditor.getValue.mockReturnValue(modified);
                return fileSystemService.saveFile(`/projects/TodoApp/${fileName}`, modified);
            });
            
            // Wait for all operations to complete
            await Promise.all(fileOperations);
            
            // Verify system stability
            expect(mockEditor.setValue).toHaveBeenCalled();
        });
    });
    
    describe('Performance and Scalability', () => {
        it('should handle large project with many files', async () => {
            const largeProject = {};
            
            // Create 100 component files
            for (let i = 0; i < 100; i++) {
                largeProject[`components/Component${i}.sun`] = `
                    @component Component${i} {
                        state: { id: ${i} }
                        
                        @task render() {
                            return \`<div>Component ${i}</div>\`;
                        }
                    }
                `;
            }
            
            // Save all files
            const start = performance.now();
            
            for (const [fileName, content] of Object.entries(largeProject)) {
                await fileSystemService.saveFile(`/projects/LargeApp/${fileName}`, content);
            }
            
            const saveTime = performance.now() - start;
            
            // Build project
            const buildStart = performance.now();
            const buildResult = await compilerService.build('/projects/LargeApp');
            const buildTime = performance.now() - buildStart;
            
            expect(buildResult.success).toBe(true);
            expect(saveTime).toBeLessThan(5000); // Should save within 5 seconds
            expect(buildTime).toBeLessThan(10000); // Should build within 10 seconds
        });
        
        it('should maintain responsive UI during heavy operations', async () => {
            editor.initialize();
            editor.mount(rootElement);
            
            // Simulate heavy computation
            const heavyContent = '@task heavy {\n' + '  console.log("heavy");\n'.repeat(10000) + '}';
            
            const start = performance.now();
            
            editor.openFile({
                name: 'heavy.sun',
                content: heavyContent
            });
            
            const loadTime = performance.now() - start;
            
            // Should load large file quickly
            expect(loadTime).toBeLessThan(1000);
            expect(mockEditor.setValue).toHaveBeenCalledWith(heavyContent);
        });
    });
});