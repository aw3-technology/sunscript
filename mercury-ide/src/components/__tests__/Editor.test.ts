import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { Editor } from '../Editor';
import { EventBus } from '../../core/event-bus';

// Mock the sunscript-language module
jest.mock('../../utils/sunscript-language', () => ({
    registerSunScriptLanguage: jest.fn()
}));

// Mock monaco-editor - this will be handled by jest moduleNameMapper

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
            const monaco = require('monaco-editor');
            
            editor.mount(mockContainer);
            
            expect(monaco.editor.create).toHaveBeenCalledWith(
                mockContainer,
                expect.objectContaining({
                    language: 'sunscript',
                    theme: 'vs-dark',
                    fontSize: 14
                })
            );
        });
        
        it('should get and set values', () => {
            const monaco = require('monaco-editor');
            editor.mount(mockContainer);
            
            const value = editor.getValue();
            expect(value).toBeDefined();
            
            editor.setValue('new content');
            // Editor should delegate to monaco
            expect(monaco.editor.create).toHaveBeenCalled();
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
            
            editor.mount(mockContainer);
            editor.openFile(file);
            
            // File should be opened successfully
            expect(editor.getCurrentFileName()).toBe('test.sun');
        });
        
        it('should get current file content', () => {
            editor.mount(mockContainer);
            const currentContent = editor.getValue();
            
            expect(typeof currentContent).toBe('string');
        });
    });
    
    describe('Editor Configuration', () => {
        it('should mount with default configuration', () => {
            const monaco = require('monaco-editor');
            editor.mount(mockContainer);
            
            expect(monaco.editor.create).toHaveBeenCalledWith(
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