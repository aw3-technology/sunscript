import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';
import { CommandRegistry } from './command-registry';
import { KeybindingRegistry } from './keybinding-registry';
import { MenuRegistry } from './menu-registry';
import { EventBus } from './event-bus';
import { ContributionLoader } from './contribution-loader';
import { FileSystemService } from '../services/FileSystemService';
import { SunScriptCompilerService } from '../services/SunScriptCompilerService';
import { EditorService } from '../services/EditorService';
import { LanguageServerClient } from '../services/LanguageServerClient';
import { TextMateService } from '../services/TextMateService';
import { DiagnosticsService } from '../services/DiagnosticsService';
import { TerminalService } from '../services/TerminalService';
import { OutputChannelsService } from '../services/OutputChannelsService';
import { TaskRunnerService } from '../services/TaskRunnerService';
import { DebugService } from '../services/DebugService';
import { WorkspaceService } from '../services/WorkspaceService';
import { FileWatcherService } from '../services/FileWatcherService';
import { SearchService } from '../services/SearchService';
import { RecentFilesService } from '../services/RecentFilesService';
import { FileIconService } from '../services/FileIconService';
import { DragDropService } from '../services/DragDropService';
import { GitService } from '../services/GitService';
import { SCMProviderFramework } from '../services/SCMProviderFramework';
import { BlameAnnotationService } from '../services/BlameAnnotationService';
import { MergeConflictService } from '../services/MergeConflictService';
import { CommandPaletteService } from '../services/CommandPaletteService';
import { QuickOpenService } from '../services/QuickOpenService';
import { AIService } from '../services/AIService';
import { AICompletionProvider } from '../services/AICompletionProvider';
import { LoggingService } from '../services/LoggingService';
import { PerformanceMonitoringService } from '../services/PerformanceMonitoringService';
import { App } from '../components/App';
import { Editor } from '../components/Editor';
import { FileExplorer } from '../components/FileExplorer';
import { OutputPanel } from '../components/OutputPanel';
import { Toolbar } from '../components/Toolbar';
import { EditorTabs } from '../components/EditorTabs';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ProblemsPanel } from '../components/ProblemsPanel';
import { Terminal } from '../components/Terminal';
import { OutputChannels } from '../components/OutputChannels';
import { TaskRunner } from '../components/TaskRunner';
import { DebugPanel } from '../components/DebugPanel';
import { SourceControlPanel } from '../components/SourceControlPanel';
import { GitHistoryPanel } from '../components/GitHistoryPanel';
import { CommandPalette } from '../components/CommandPalette';
import { QuickOpen } from '../components/QuickOpen';
import { AIChatPanel } from '../components/AIChatPanel';
import { AIConfigDialog } from '../components/AIConfigDialog';
import { 
    FileCommandContribution, 
    FileMenuContribution, 
    FileKeybindingContribution 
} from '../contributions/file-contributions';
import { 
    EditorCommandContribution, 
    EditorMenuContribution, 
    EditorKeybindingContribution 
} from '../contributions/editor-contributions';
import { 
    UICommandContribution, 
    UIMenuContribution, 
    UIKeybindingContribution 
} from '../contributions/ui-contributions';
import { SunScriptLanguageProvider } from '../providers/SunScriptLanguageProvider';
import { DatabaseService } from '../services/DatabaseService';
import { UserService } from '../services/UserService';
import { ProjectService } from '../services/ProjectService';
import { FileService } from '../services/FileService';
import { SessionService } from '../services/SessionService';
import { IDEService } from '../services/IDEService';

const container = new Container({ defaultScope: 'Singleton' });

// Core Services
container.bind(TYPES.CommandRegistry).to(CommandRegistry);
container.bind(TYPES.KeybindingRegistry).to(KeybindingRegistry);
container.bind(TYPES.MenuRegistry).to(MenuRegistry);
container.bind(TYPES.EventBus).to(EventBus);
container.bind(ContributionLoader).toSelf();

// Application Services
container.bind(TYPES.FileSystemService).to(FileSystemService);
container.bind(TYPES.CompilerService).to(SunScriptCompilerService);
container.bind(TYPES.EditorService).to(EditorService);
container.bind(TYPES.LanguageServerClient).to(LanguageServerClient);
container.bind(TYPES.TextMateService).to(TextMateService);
container.bind(TYPES.DiagnosticsService).to(DiagnosticsService);
container.bind(TYPES.IDEService).to(IDEService).inSingletonScope();

// Database Services
container.bind(TYPES.DatabaseService).to(DatabaseService).inSingletonScope();
container.bind(TYPES.UserService).to(UserService).inSingletonScope();
container.bind(TYPES.ProjectService).to(ProjectService).inSingletonScope();
container.bind(TYPES.FileService).to(FileService).inSingletonScope();
container.bind(TYPES.SessionService).to(SessionService).inSingletonScope();

// Development Tools
container.bind(TYPES.TerminalService).to(TerminalService);
container.bind(TYPES.OutputChannelsService).to(OutputChannelsService);
container.bind(TYPES.TaskRunnerService).to(TaskRunnerService);
container.bind(TYPES.DebugService).to(DebugService);

// File Management
container.bind(TYPES.WorkspaceService).to(WorkspaceService);
container.bind(TYPES.FileWatcherService).to(FileWatcherService);
container.bind(TYPES.SearchService).to(SearchService);
container.bind(TYPES.RecentFilesService).to(RecentFilesService);
container.bind(TYPES.FileIconService).to(FileIconService);
container.bind(TYPES.DragDropService).to(DragDropService);

// Version Control
container.bind(TYPES.GitService).to(GitService);
container.bind(TYPES.SCMProviderFramework).to(SCMProviderFramework);
container.bind(TYPES.BlameAnnotationService).to(BlameAnnotationService);
container.bind(TYPES.MergeConflictService).to(MergeConflictService);

// UI/UX Services
container.bind(TYPES.CommandPaletteService).to(CommandPaletteService);
container.bind(TYPES.QuickOpenService).to(QuickOpenService);

// AI Services
container.bind(TYPES.AIService).to(AIService);
container.bind(TYPES.AICompletionProvider).to(AICompletionProvider);

// Monitoring Services
container.bind(TYPES.LoggingService).to(LoggingService).inSingletonScope();
container.bind(TYPES.PerformanceMonitoringService).to(PerformanceMonitoringService).inSingletonScope();

// UI Components
container.bind(TYPES.App).to(App);
container.bind(TYPES.Editor).to(Editor);
container.bind(TYPES.FileExplorer).to(FileExplorer);
container.bind(TYPES.OutputPanel).to(OutputPanel);
container.bind(TYPES.Toolbar).to(Toolbar);
container.bind(TYPES.EditorTabs).to(EditorTabs);
container.bind(TYPES.Breadcrumbs).to(Breadcrumbs);
container.bind(TYPES.ProblemsPanel).to(ProblemsPanel);
container.bind(TYPES.Terminal).to(Terminal);
container.bind(TYPES.OutputChannels).to(OutputChannels);
container.bind(TYPES.TaskRunner).to(TaskRunner);
container.bind(TYPES.DebugPanel).to(DebugPanel);
container.bind(TYPES.SourceControlPanel).to(SourceControlPanel);
container.bind(TYPES.GitHistoryPanel).to(GitHistoryPanel);
container.bind(TYPES.CommandPalette).to(CommandPalette);
container.bind(TYPES.QuickOpen).to(QuickOpen);
container.bind(TYPES.AIChatPanel).to(AIChatPanel);
container.bind(TYPES.AIConfigDialog).to(AIConfigDialog);

// Language Providers
container.bind(SunScriptLanguageProvider).toSelf();

// Bind Contributions
// Command Contributions
container.bind(TYPES.CommandContribution).to(FileCommandContribution);
container.bind(TYPES.CommandContribution).to(EditorCommandContribution);
container.bind(TYPES.CommandContribution).to(UICommandContribution);

// Menu Contributions
container.bind(TYPES.MenuContribution).to(FileMenuContribution);
container.bind(TYPES.MenuContribution).to(EditorMenuContribution);
container.bind(TYPES.MenuContribution).to(UIMenuContribution);

// Keybinding Contributions
container.bind(TYPES.KeybindingContribution).to(FileKeybindingContribution);
container.bind(TYPES.KeybindingContribution).to(EditorKeybindingContribution);
container.bind(TYPES.KeybindingContribution).to(UIKeybindingContribution);

export { container };