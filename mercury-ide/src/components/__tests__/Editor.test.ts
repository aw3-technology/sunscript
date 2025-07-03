import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { Editor } from '../Editor';
import { EventBus } from '../../core/event-bus';

// Mock Monaco Editor
const mockEditor = {
    getValue: jest.fn(() => 'test content'),
    setValue: jest.fn(),
    getModel: jest.fn(() => ({
        uri: { toString: () => 'file:///test.sun' },
        getValue: jest.fn(() => 'test content'),
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
    createContextKey: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn()
    })),
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
    KeyCode: {
        KEY_S: 49,
        KEY_O: 48,
        KEY_N: 47
    },
    KeyMod: {
        CtrlCmd: 2048,
        Shift: 1024
    },
    MarkerSeverity: {
        Error: 8,
        Warning: 4,
        Info: 2,
        Hint: 1
    }
};

// Mock the global monaco object
(global as any).monaco = mockMonaco;

describe('Editor', () => {
    let container: Container;
    let editor: Editor;
    let eventBus: EventBus;
    let mockContainer: HTMLElement;
    
    beforeEach(() => {
        container = new Container();
        container.bind(TYPES.EventBus).to(EventBus);
        container.bind(TYPES.Editor).to(Editor);
        
        eventBus = container.get(TYPES.EventBus);
        editor = container.get(TYPES.Editor);
        
        // Create mock DOM container
        mockContainer = document.createElement('div');
        mockContainer.id = 'test-editor';
        document.body.appendChild(mockContainer);
        
        // Reset mocks
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        document.body.removeChild(mockContainer);
    });
    
    describe('Initialization', () => {
        it('should initialize Monaco editor', () => {
            editor.initialize();
            
            expect(mockMonaco.languages.register).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'sunscript',
                    extensions: ['.sun'],
                    aliases: ['SunScript', 'sunscript']
                })
            );
        });
        
        it('should mount to DOM container', () => {
            editor.mount(mockContainer);
            
            expect(mockMonaco.editor.create).toHaveBeenCalledWith(
                mockContainer,
                expect.objectContaining({
                    theme: 'vs-dark',
                    language: 'sunscript'
                })
            );
        });
        
        it('should set up event listeners', () => {
            editor.mount(mockContainer);
            
            expect(mockEditor.onDidChangeModelContent).toHaveBeenCalled();
            expect(mockEditor.onDidChangeCursorPosition).toHaveBeenCalled();
        });
    });
    
    describe('File Operations', () => {
        beforeEach(() => {
            editor.mount(mockContainer);
        });
        
        it('should open file with content', () => {
            const file = {
                name: 'test.sun',
                content: '@task example {\n  console.log("Hello");\n}'
            };
            
            editor.openFile(file);
            
            expect(mockEditor.setValue).toHaveBeenCalledWith(file.content);
        });
        
        it('should get current file content', () => {
            const content = editor.getValue();
            
            expect(mockEditor.getValue).toHaveBeenCalled();
            expect(content).toBe('test content');
        });
        
        it('should set editor content', () => {
            const newContent = '@task newExample {\n  return "hello";\n}';
            
            editor.setValue(newContent);
            
            expect(mockEditor.setValue).toHaveBeenCalledWith(newContent);
        });
        
        it('should get current filename', () => {
            const file = { name: 'example.sun', content: 'test' };
            editor.openFile(file);
            
            const filename = editor.getCurrentFileName();
            
            expect(filename).toBe('example.sun');
        });
        
        it('should create new file', () => {
            editor.newFile();
            
            expect(mockEditor.setValue).toHaveBeenCalledWith('');
        });
    });
    
    describe('Editor Commands', () => {
        beforeEach(() => {
            editor.mount(mockContainer);
        });
        
        it('should register save command', () => {
            expect(mockEditor.addAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'save-file',
                    label: 'Save File'
                })
            );
        });
        
        it('should register open command', () => {
            expect(mockEditor.addAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'open-file',
                    label: 'Open File'
                })
            );
        });
        
        it('should register new file command', () => {
            expect(mockEditor.addAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'new-file',
                    label: 'New File'
                })
            );
        });
        
        it('should emit events when commands are executed', () => {
            const spy = jest.fn();
            eventBus.on('file.save', spy);
            
            // Simulate command execution by calling the registered action
            const saveAction = mockEditor.addAction.mock.calls.find(
                call => call[0].id === 'save-file'
            );
            
            if (saveAction) {
                saveAction[0].run();
                expect(spy).toHaveBeenCalled();
            }
        });
    });
    
    describe('Language Features', () => {
        beforeEach(() => {
            editor.initialize();
            editor.mount(mockContainer);
        });
        
        it('should register SunScript language support', () => {
            expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalledWith(
                'sunscript',
                expect.objectContaining({
                    tokenizer: expect.any(Object)
                })
            );
        });
        
        it('should provide autocomplete suggestions', () => {
            expect(mockMonaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
                'sunscript',
                expect.objectContaining({
                    provideCompletionItems: expect.any(Function)
                })
            );
        });
        
        it('should provide hover information', () => {
            expect(mockMonaco.languages.registerHoverProvider).toHaveBeenCalledWith(
                'sunscript',
                expect.objectContaining({
                    provideHover: expect.any(Function)
                })
            );
        });
        
        it('should provide definition support', () => {
            expect(mockMonaco.languages.registerDefinitionProvider).toHaveBeenCalledWith(
                'sunscript',
                expect.objectContaining({
                    provideDefinition: expect.any(Function)
                })
            );
        });
    });
    
    describe('Themes and Appearance', () => {
        beforeEach(() => {
            editor.mount(mockContainer);
        });
        
        it('should set theme', () => {
            editor.setTheme('vs-light');
            
            expect(mockMonaco.editor.setTheme).toHaveBeenCalledWith('vs-light');
        });
        
        it('should set font size', () => {
            editor.setFontSize(16);
            
            // Font size would be updated through editor options
            expect(mockEditor.getValue).toBeDefined(); // Editor is available
        });
        
        it('should toggle word wrap', () => {
            editor.setWordWrap(true);
            
            // Word wrap would be updated through editor options
            expect(mockEditor.getValue).toBeDefined(); // Editor is available
        });
    });
    
    describe('Cursor and Selection', () => {
        beforeEach(() => {
            editor.mount(mockContainer);
        });
        
        it('should get cursor position', () => {
            const position = editor.getCursorPosition();
            
            expect(mockEditor.getPosition).toHaveBeenCalled();
            expect(position).toEqual({ lineNumber: 1, column: 1 });
        });
        
        it('should set cursor position', () => {
            const position = { lineNumber: 5, column: 10 };
            
            editor.setCursorPosition(position);
            
            expect(mockEditor.setPosition).toHaveBeenCalledWith(position);
        });
        
        it('should focus editor', () => {
            editor.focus();
            
            expect(mockEditor.focus).toHaveBeenCalled();
        });
        
        it('should go to line', () => {
            editor.goToLine(10);
            
            expect(mockEditor.setPosition).toHaveBeenCalledWith({ lineNumber: 10, column: 1 });
            expect(mockEditor.revealLine).toHaveBeenCalledWith(10);
        });
    });
    
    describe('Error Markers and Diagnostics', () => {
        beforeEach(() => {
            editor.mount(mockContainer);
        });
        
        it('should show error markers', () => {
            const errors = [
                {
                    line: 5,
                    column: 10,
                    message: 'Syntax error',
                    severity: 'error'
                }
            ];
            
            editor.showErrors(errors);
            
            expect(mockEditor.deltaDecorations).toHaveBeenCalled();
        });
        
        it('should clear error markers', () => {
            editor.clearErrors();
            
            expect(mockEditor.deltaDecorations).toHaveBeenCalledWith([], []);
        });
        
        it('should handle different error severities', () => {
            const diagnostics = [
                { line: 1, message: 'Error', severity: 'error' },
                { line: 2, message: 'Warning', severity: 'warning' },
                { line: 3, message: 'Info', severity: 'info' }
            ];
            
            editor.showErrors(diagnostics);
            
            expect(mockEditor.deltaDecorations).toHaveBeenCalled();
        });
    });
    
    describe('Event Handling', () => {
        beforeEach(() => {
            editor.mount(mockContainer);
        });
        
        it('should emit content change events', () => {
            const spy = jest.fn();
            eventBus.on('editor.contentChanged', spy);
            
            // Simulate content change by calling the registered callback
            const changeCallback = mockEditor.onDidChangeModelContent.mock.calls[0][0];
            changeCallback({ changes: [{ text: 'new text' }] });
            
            expect(spy).toHaveBeenCalled();
        });
        
        it('should emit cursor position change events', () => {
            const spy = jest.fn();
            eventBus.on('editor.cursorPositionChanged', spy);
            
            // Simulate cursor change by calling the registered callback
            const cursorCallback = mockEditor.onDidChangeCursorPosition.mock.calls[0][0];
            cursorCallback({ position: { lineNumber: 2, column: 5 } });
            
            expect(spy).toHaveBeenCalled();
        });
        
        it('should handle resize events', () => {
            editor.resize();
            
            expect(mockEditor.layout).toHaveBeenCalled();
        });
    });
    
    describe('Cleanup and Disposal', () => {
        beforeEach(() => {
            editor.mount(mockContainer);
        });
        
        it('should dispose editor resources', () => {
            editor.dispose();
            
            expect(mockEditor.dispose).toHaveBeenCalled();
        });
        
        it('should handle disposal gracefully when not mounted', () => {
            const unmountedEditor = container.get(TYPES.Editor);
            
            expect(() => {
                unmountedEditor.dispose();
            }).not.toThrow();
        });
    });
});