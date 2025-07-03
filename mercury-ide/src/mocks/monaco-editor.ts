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

export const editor = {
    create: jest.fn(() => mockEditor),
    createModel: jest.fn(() => mockEditor.getModel()),
    setModelLanguage: jest.fn(),
    defineTheme: jest.fn(),
    setTheme: jest.fn()
};

export const languages = {
    register: jest.fn(),
    setLanguageConfiguration: jest.fn(),
    setMonarchTokensProvider: jest.fn(),
    registerCompletionItemProvider: jest.fn(),
    registerHoverProvider: jest.fn(),
    registerDefinitionProvider: jest.fn()
};

export const Uri = {
    file: jest.fn((path: string) => ({ toString: () => `file://${path}` })),
    parse: jest.fn((uri: string) => ({ toString: () => uri }))
};

export const KeyCode = { KEY_S: 49, KEY_O: 48, KEY_N: 47 };
export const KeyMod = { CtrlCmd: 2048, Shift: 1024 };
export const MarkerSeverity = { Error: 8, Warning: 4, Info: 2, Hint: 1 };