export const TYPES = {
    // Core Services
    CommandRegistry: Symbol.for('CommandRegistry'),
    KeybindingRegistry: Symbol.for('KeybindingRegistry'),
    MenuRegistry: Symbol.for('MenuRegistry'),
    ContributionProvider: Symbol.for('ContributionProvider'),
    EventBus: Symbol.for('EventBus'),
    
    // Application Services
    FileSystemService: Symbol.for('FileSystemService'),
    CompilerService: Symbol.for('CompilerService'),
    EditorService: Symbol.for('EditorService'),
    LanguageServerClient: Symbol.for('LanguageServerClient'),
    TextMateService: Symbol.for('TextMateService'),
    DiagnosticsService: Symbol.for('DiagnosticsService'),
    IDEService: Symbol.for('IDEService'),
    
    // Database Services
    DatabaseService: Symbol.for('DatabaseService'),
    UserService: Symbol.for('UserService'),
    ProjectService: Symbol.for('ProjectService'),
    FileService: Symbol.for('FileService'),
    SessionService: Symbol.for('SessionService'),
    
    // Development Tools
    TerminalService: Symbol.for('TerminalService'),
    OutputChannelsService: Symbol.for('OutputChannelsService'),
    TaskRunnerService: Symbol.for('TaskRunnerService'),
    DebugService: Symbol.for('DebugService'),
    
    // File Management
    WorkspaceService: Symbol.for('WorkspaceService'),
    FileWatcherService: Symbol.for('FileWatcherService'),
    SearchService: Symbol.for('SearchService'),
    RecentFilesService: Symbol.for('RecentFilesService'),
    FileIconService: Symbol.for('FileIconService'),
    DragDropService: Symbol.for('DragDropService'),
    
    // Version Control
    GitService: Symbol.for('GitService'),
    SCMProviderFramework: Symbol.for('SCMProviderFramework'),
    BlameAnnotationService: Symbol.for('BlameAnnotationService'),
    MergeConflictService: Symbol.for('MergeConflictService'),
    
    // UI/UX Services
    CommandPaletteService: Symbol.for('CommandPaletteService'),
    QuickOpenService: Symbol.for('QuickOpenService'),
    SettingsService: Symbol.for('SettingsService'),
    NotificationService: Symbol.for('NotificationService'),
    StatusBarService: Symbol.for('StatusBarService'),
    
    // AI Services
    AIService: Symbol.for('AIService'),
    AICompletionProvider: Symbol.for('AICompletionProvider'),
    
    // Monitoring Services
    LoggingService: Symbol.for('LoggingService'),
    PerformanceMonitoringService: Symbol.for('PerformanceMonitoringService'),
    
    // UI Components
    App: Symbol.for('App'),
    Editor: Symbol.for('Editor'),
    FileExplorer: Symbol.for('FileExplorer'),
    OutputPanel: Symbol.for('OutputPanel'),
    Toolbar: Symbol.for('Toolbar'),
    EditorTabs: Symbol.for('EditorTabs'),
    Breadcrumbs: Symbol.for('Breadcrumbs'),
    ProblemsPanel: Symbol.for('ProblemsPanel'),
    Terminal: Symbol.for('Terminal'),
    OutputChannels: Symbol.for('OutputChannels'),
    TaskRunner: Symbol.for('TaskRunner'),
    DebugPanel: Symbol.for('DebugPanel'),
    SourceControlPanel: Symbol.for('SourceControlPanel'),
    GitHistoryPanel: Symbol.for('GitHistoryPanel'),
    CommandPalette: Symbol.for('CommandPalette'),
    QuickOpen: Symbol.for('QuickOpen'),
    StatusBar: Symbol.for('StatusBar'),
    NotificationCenter: Symbol.for('NotificationCenter'),
    AIChatPanel: Symbol.for('AIChatPanel'),
    AIConfigDialog: Symbol.for('AIConfigDialog'),
    
    // Contribution Points
    CommandContribution: Symbol.for('CommandContribution'),
    MenuContribution: Symbol.for('MenuContribution'),
    KeybindingContribution: Symbol.for('KeybindingContribution'),
};

export interface Newable<T> {
    new(...args: any[]): T;
}

export interface ContributionProvider<T extends object> {
    getContributions(): T[];
}