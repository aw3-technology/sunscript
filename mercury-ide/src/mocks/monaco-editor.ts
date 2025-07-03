// Mock for monaco-editor in tests

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
    onDidChangeModelContent: jest.fn()
};

const editor = {
    create: jest.fn(() => mockEditor),
    createModel: jest.fn(() => mockEditor.getModel()),
    setModelLanguage: jest.fn(),
    defineTheme: jest.fn(),
    setTheme: jest.fn()
};

const languages = {
    register: jest.fn(),
    setLanguageConfiguration: jest.fn(),
    setMonarchTokensProvider: jest.fn(),
    registerCompletionItemProvider: jest.fn(),
    registerHoverProvider: jest.fn(),
    registerDefinitionProvider: jest.fn()
};

const Uri = {
    file: jest.fn((path: string) => ({ toString: () => `file://${path}` })),
    parse: jest.fn((uri: string) => ({ toString: () => uri }))
};

const KeyCode = { KEY_S: 49, KEY_O: 48, KEY_N: 47 };
const KeyMod = { CtrlCmd: 2048, Shift: 1024 };
const MarkerSeverity = { Error: 8, Warning: 4, Info: 2, Hint: 1 };

// Export as default (main monaco namespace)
const monaco = {
    editor,
    languages,
    Uri,
    KeyCode,
    KeyMod,
    MarkerSeverity
};

export default monaco;

// Also export individual pieces for named imports
export { editor, languages, Uri, KeyCode, KeyMod, MarkerSeverity };