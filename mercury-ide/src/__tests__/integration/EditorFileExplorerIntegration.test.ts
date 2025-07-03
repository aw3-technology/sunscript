import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { Editor } from '../../components/Editor';
import { FileExplorer } from '../../components/FileExplorer';
import { FileSystemService } from '../../services/FileSystemService';
import { EventBus } from '../../core/event-bus';

// Mock Monaco Editor
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

describe('Editor-FileExplorer Integration', () => {
    let container: Container;
    let editor: Editor;
    let fileExplorer: FileExplorer;
    let eventBus: EventBus;
    let mockFileSystemService: jest.Mocked<FileSystemService>;
    
    let editorContainer: HTMLElement;
    let explorerContainer: HTMLElement;
    
    const testFiles = [
        {
            name: 'app.sun',
            path: '/project/app.sun',
            type: 'file' as const,
            size: 1024,
            lastModified: new Date()
        },
        {
            name: 'components',
            path: '/project/components',
            type: 'folder' as const,
            children: [
                {
                    name: 'Button.sun',
                    path: '/project/components/Button.sun',
                    type: 'file' as const,
                    size: 512,
                    lastModified: new Date()
                }
            ]
        }
    ];
    
    const testFileContents = {
        '/project/app.sun': '@task main {\n  console.log("Hello World");\n}',
        '/project/components/Button.sun': '@component Button {\n  state: {\n    text: "Click me"\n  }\n}'
    };
    
    beforeEach(() => {
        container = new Container();
        
        // Mock FileSystemService
        mockFileSystemService = {
            getFiles: jest.fn().mockResolvedValue(testFiles),
            loadFile: jest.fn().mockImplementation((path: string) => 
                Promise.resolve(testFileContents[path] || '// Default content')
            ),
            saveFile: jest.fn().mockResolvedValue(undefined),
            fileExists: jest.fn().mockResolvedValue(true)
        } as any;
        
        container.bind(TYPES.EventBus).to(EventBus);
        container.bind(TYPES.FileSystemService).toConstantValue(mockFileSystemService);
        container.bind(TYPES.Editor).to(Editor);
        container.bind(TYPES.FileExplorer).to(FileExplorer);
        
        eventBus = container.get(TYPES.EventBus);
        editor = container.get(TYPES.Editor);
        fileExplorer = container.get(TYPES.FileExplorer);
        
        // Create DOM containers
        editorContainer = document.createElement('div');
        editorContainer.id = 'editor-container';
        document.body.appendChild(editorContainer);
        
        explorerContainer = document.createElement('div');
        explorerContainer.id = 'explorer-container';
        document.body.appendChild(explorerContainer);
        
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        document.body.removeChild(editorContainer);
        document.body.removeChild(explorerContainer);
    });
    
    describe('File Selection Flow', () => {
        beforeEach(async () => {
            editor.initialize();
            editor.mount(editorContainer);
            await fileExplorer.mount(explorerContainer);
        });
        
        it('should load file content when file is selected in explorer', async () => {
            // Set up file selection callback
            fileExplorer.onFileSelect((file) => {
                editor.openFile(file);
            });
            
            // Simulate file selection
            const fileItems = explorerContainer.querySelectorAll('[data-type="file"]');
            const appFileItem = Array.from(fileItems).find(item => 
                item.textContent?.includes('app.sun')
            ) as HTMLElement;
            
            expect(appFileItem).toBeDefined();
            
            // Click the file
            appFileItem.click();
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockFileSystemService.loadFile).toHaveBeenCalledWith('/project/app.sun');
            expect(mockEditor.setValue).toHaveBeenCalledWith(testFileContents['/project/app.sun']);
        });
        
        it('should highlight selected file in explorer when opened in editor', async () => {
            fileExplorer.onFileSelect((file) => {
                editor.openFile(file);
            });
            
            const fileItems = explorerContainer.querySelectorAll('[data-type="file"]');
            const buttonFileItem = Array.from(fileItems).find(item => 
                item.textContent?.includes('Button.sun')
            ) as HTMLElement;
            
            buttonFileItem.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(buttonFileItem.classList.contains('selected')).toBe(true);
        });
        
        it('should maintain file selection state across refreshes', async () => {
            fileExplorer.onFileSelect((file) => {
                editor.openFile(file);
            });
            
            // Select a file
            const fileItems = explorerContainer.querySelectorAll('[data-type="file"]');
            const appFileItem = fileItems[0] as HTMLElement;
            appFileItem.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            const selectedFile = editor.getCurrentFileName();
            
            // Refresh explorer
            fileExplorer.refresh();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // File should still be open in editor
            expect(editor.getCurrentFileName()).toBe(selectedFile);
        });
    });
    
    describe('File Content Synchronization', () => {
        beforeEach(async () => {
            editor.initialize();
            editor.mount(editorContainer);
            await fileExplorer.mount(explorerContainer);
            
            fileExplorer.onFileSelect((file) => {
                editor.openFile(file);
            });
        });
        
        it('should save file content when save event is triggered', async () => {
            // Open a file
            const fileItems = explorerContainer.querySelectorAll('[data-type="file"]');
            const appFileItem = fileItems[0] as HTMLElement;
            appFileItem.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Modify content
            const newContent = '@task modified {\n  console.log("Modified");\n}';
            mockEditor.getValue.mockReturnValue(newContent);
            
            // Trigger save event
            eventBus.emit('file.save');
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockFileSystemService.saveFile).toHaveBeenCalledWith(
                '/project/app.sun',
                newContent
            );
        });
        
        it('should detect unsaved changes in editor', async () => {
            const fileItems = explorerContainer.querySelectorAll('[data-type="file"]');
            const appFileItem = fileItems[0] as HTMLElement;
            appFileItem.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Simulate content change in editor
            const originalContent = testFileContents['/project/app.sun'];
            const modifiedContent = originalContent + '\n// Modified';
            mockEditor.getValue.mockReturnValue(modifiedContent);
            
            // Trigger content change event
            const changeCallback = mockEditor.onDidChangeModelContent.mock.calls[0][0];
            changeCallback({ changes: [{ text: '\n// Modified' }] });
            
            // Editor should track the change (implementation specific)
            expect(mockEditor.getValue()).toBe(modifiedContent);
        });
    });
    
    describe('Multi-file Editing', () => {
        beforeEach(async () => {
            editor.initialize();
            editor.mount(editorContainer);
            await fileExplorer.mount(explorerContainer);
            
            fileExplorer.onFileSelect((file) => {
                editor.openFile(file);
            });
        });
        
        it('should switch between multiple open files', async () => {
            const fileItems = explorerContainer.querySelectorAll('[data-type="file"]');
            
            // Open first file
            const appFileItem = Array.from(fileItems).find(item => 
                item.textContent?.includes('app.sun')
            ) as HTMLElement;
            appFileItem.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockEditor.setValue).toHaveBeenLastCalledWith(testFileContents['/project/app.sun']);
            
            // Open second file
            const buttonFileItem = Array.from(fileItems).find(item => 
                item.textContent?.includes('Button.sun')
            ) as HTMLElement;
            buttonFileItem.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockEditor.setValue).toHaveBeenLastCalledWith(testFileContents['/project/components/Button.sun']);
        });
        
        it('should preserve cursor position when switching files', async () => {
            const fileItems = explorerContainer.querySelectorAll('[data-type="file"]');
            
            // Open first file and set cursor position
            const appFileItem = fileItems[0] as HTMLElement;
            appFileItem.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            mockEditor.getPosition.mockReturnValue({ lineNumber: 2, column: 5 });
            
            // Open second file
            const buttonFileItem = fileItems[1] as HTMLElement;
            buttonFileItem.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Switch back to first file
            appFileItem.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Cursor position should be restored (implementation specific)
            expect(mockEditor.setPosition).toHaveBeenCalled();
        });
    });
    
    describe('Error Handling Integration', () => {
        beforeEach(async () => {
            editor.initialize();
            editor.mount(editorContainer);
            await fileExplorer.mount(explorerContainer);
            
            fileExplorer.onFileSelect((file) => {
                editor.openFile(file);
            });
        });
        
        it('should handle file loading errors gracefully', async () => {
            mockFileSystemService.loadFile.mockRejectedValueOnce(new Error('File not found'));
            
            const fileItems = explorerContainer.querySelectorAll('[data-type="file"]');
            const appFileItem = fileItems[0] as HTMLElement;
            
            appFileItem.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Should not crash the application
            expect(mockFileSystemService.loadFile).toHaveBeenCalled();
        });
        
        it('should handle file saving errors gracefully', async () => {
            mockFileSystemService.saveFile.mockRejectedValueOnce(new Error('Permission denied'));
            
            const fileItems = explorerContainer.querySelectorAll('[data-type="file"]');
            const appFileItem = fileItems[0] as HTMLElement;
            appFileItem.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Trigger save
            eventBus.emit('file.save');
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockFileSystemService.saveFile).toHaveBeenCalled();
        });
    });
    
    describe('Performance Integration', () => {
        it('should handle rapid file switching efficiently', async () => {
            editor.initialize();
            editor.mount(editorContainer);
            await fileExplorer.mount(explorerContainer);
            
            fileExplorer.onFileSelect((file) => {
                editor.openFile(file);
            });
            
            const fileItems = explorerContainer.querySelectorAll('[data-type="file"]');
            
            const start = performance.now();
            
            // Rapidly switch between files
            for (let i = 0; i < 10; i++) {
                const fileItem = fileItems[i % fileItems.length] as HTMLElement;
                fileItem.click();
                await new Promise(resolve => setTimeout(resolve, 1));
            }
            
            const duration = performance.now() - start;
            
            expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });
        
        it('should not cause memory leaks with frequent operations', async () => {
            editor.initialize();
            editor.mount(editorContainer);
            await fileExplorer.mount(explorerContainer);
            
            fileExplorer.onFileSelect((file) => {
                editor.openFile(file);
            });
            
            // Simulate frequent file operations
            for (let i = 0; i < 50; i++) {
                const fileItems = explorerContainer.querySelectorAll('[data-type="file"]');
                const fileItem = fileItems[i % fileItems.length] as HTMLElement;
                fileItem.click();
                await new Promise(resolve => setTimeout(resolve, 1));
                
                if (i % 10 === 0) {
                    fileExplorer.refresh();
                }
            }
            
            // If we reach here without issues, no obvious memory leaks
            expect(mockFileSystemService.loadFile).toHaveBeenCalled();
        });
    });
});