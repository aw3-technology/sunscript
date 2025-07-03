import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { Editor } from '../Editor';
import { EventBus } from '../../core/event-bus';

// Mock the sunscript-language module
jest.mock('../../utils/sunscript-language', () => ({
    registerSunScriptLanguage: jest.fn()
}));

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
    onDidChangeModelContent: jest.fn()
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

describe('Editor Component', () => {
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
        
        mockContainer = document.createElement('div');
        
        jest.clearAllMocks();
    });
    
    describe('Initialization', () => {
        it('should create editor instance', () => {
            expect(editor).toBeDefined();
            expect(editor).toBeInstanceOf(Editor);
        });
        
        it('should initialize without errors', () => {
            expect(() => editor.initialize()).not.toThrow();
        });
    });
    
    describe('Mounting and Basic Operations', () => {
        it('should mount editor to container', () => {
            editor.mount(mockContainer);
            
            expect(mockMonaco.editor.create).toHaveBeenCalledWith(
                mockContainer,
                expect.objectContaining({
                    language: 'sunscript',
                    theme: 'vs-dark',
                    fontSize: 14
                })
            );
        });
        
        it('should get and set values', () => {
            editor.mount(mockContainer);
            
            const value = editor.getValue();
            expect(mockEditor.getValue).toHaveBeenCalled();
            expect(value).toBe('test content');
            
            editor.setValue('new content');
            expect(mockEditor.setValue).toHaveBeenCalledWith('new content');
        });
        
        it('should get current file name', () => {
            const fileName = editor.getCurrentFileName();
            expect(fileName).toBe('untitled.sun');
        });
    });
    
    describe('File Operations', () => {
        beforeEach(() => {
            editor.mount(mockContainer);
        });
        
        it('should open file', () => {
            const file = {
                name: 'test.sun',
                content: '@task hello() { console.log("Hello"); }'
            };
            
            editor.openFile(file);
            
            expect(mockEditor.setValue).toHaveBeenCalledWith(file.content);
        });
        
        it('should get current file content', () => {
            const content = '@task save() { console.log("Saved"); }';
            mockEditor.getValue.mockReturnValue(content);
            
            const currentContent = editor.getValue();
            
            expect(mockEditor.getValue).toHaveBeenCalled();
            expect(currentContent).toBe(content);
        });
    });
    
    describe('Editor Configuration', () => {
        it('should mount with default configuration', () => {
            editor.mount(mockContainer);
            
            expect(mockMonaco.editor.create).toHaveBeenCalledWith(
                mockContainer,
                expect.objectContaining({
                    language: 'sunscript',
                    theme: 'vs-dark',
                    automaticLayout: true,
                    fontSize: 14,
                    wordWrap: 'on'
                })
            );
        });
    });
});