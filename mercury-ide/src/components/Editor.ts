import { injectable } from 'inversify';
import * as monaco from 'monaco-editor';
import { registerSunScriptLanguage } from '../utils/sunscript-language';

@injectable()
export class Editor {
    private editor: monaco.editor.IStandaloneCodeEditor | null = null;
    private currentFile: string = 'untitled.sun';
    private files: Map<string, string> = new Map();
    
    constructor() {
        registerSunScriptLanguage();
        this.files.set(this.currentFile, '// Welcome to SunScript IDE\n');
    }
    
    mount(container: HTMLElement): void {
        this.editor = monaco.editor.create(container, {
            value: this.files.get(this.currentFile) || '',
            language: 'sunscript',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: {
                enabled: true
            },
            fontSize: 14,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            tabSize: 2
        });
    }
    
    initialize(): void {
        // Additional initialization if needed
    }
    
    getValue(): string {
        return this.editor?.getValue() || '';
    }
    
    setValue(value: string): void {
        this.editor?.setValue(value);
    }
    
    getCurrentFileName(): string {
        return this.currentFile;
    }
    
    openFile(file: { name: string; content: string }): void {
        if (this.editor) {
            // Save current file content
            this.files.set(this.currentFile, this.getValue());
            
            // Open new file
            this.currentFile = file.name;
            this.files.set(file.name, file.content);
            this.setValue(file.content);
            
            // Update editor language based on file extension
            const extension = file.name.split('.').pop();
            if (extension === 'sun') {
                monaco.editor.setModelLanguage(this.editor.getModel()!, 'sunscript');
            } else if (extension === 'js') {
                monaco.editor.setModelLanguage(this.editor.getModel()!, 'javascript');
            } else if (extension === 'ts') {
                monaco.editor.setModelLanguage(this.editor.getModel()!, 'typescript');
            }
        }
    }
    
    newFile(): void {
        const fileName = `untitled-${Date.now()}.sun`;
        this.openFile({ name: fileName, content: '' });
    }
    
    dispose(): void {
        this.editor?.dispose();
    }
}