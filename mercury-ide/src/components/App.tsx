import React, { useEffect, useRef } from 'react';
import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { Editor } from './Editor';
import { FileExplorer } from './FileExplorer';
import { OutputPanel } from './OutputPanel';
import { Toolbar } from './Toolbar';
import { FileSystemService } from '../services/FileSystemService';
import { SunScriptCompilerService } from '../services/SunScriptCompilerService';
import { EventBus } from '../core/event-bus';
import { CommandRegistry } from '../core/command-registry';
import { CommandPalette } from './CommandPalette';
import { QuickOpen } from './QuickOpen';
import { AIChatPanel } from './AIChatPanel';
import { AIConfigDialog } from './AIConfigDialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { TooltipProvider } from './ui/tooltip';
import { 
  FileText, 
  Folder, 
  Terminal, 
  Settings, 
  Play, 
  Search,
  GitBranch,
  Bug,
  MessageSquare
} from 'lucide-react';

interface AppProps {
  editor: Editor;
  fileExplorer: FileExplorer;
  outputPanel: OutputPanel;
  toolbar: Toolbar;
  fileSystemService: FileSystemService;
  compilerService: SunScriptCompilerService;
  eventBus: EventBus;
  commandRegistry: CommandRegistry;
  commandPalette: CommandPalette;
  quickOpen: QuickOpen;
  aiChatPanel: AIChatPanel;
  aiConfigDialog: AIConfigDialog;
}

const AppComponent: React.FC<AppProps> = ({
  editor,
  fileExplorer,
  outputPanel,
  toolbar,
  fileSystemService,
  compilerService,
  eventBus,
  commandRegistry,
  commandPalette,
  quickOpen,
  aiChatPanel,
  aiConfigDialog
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileExplorerRef = useRef<HTMLDivElement>(null);
  const outputPanelRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize components when refs are available
    if (editorRef.current) {
      editor.initialize();
    }
    
    // Mount overlay components
    commandPalette.mount(document.body);
    quickOpen.mount(document.body);
    aiConfigDialog.mount(document.body);

    // Setup event listeners
    const handleKeydown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + P for command palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        commandPalette.show();
      }
      
      // Ctrl/Cmd + P for quick open
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        quickOpen.show();
      }
    };

    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [editor, commandPalette, quickOpen, aiConfigDialog]);

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background text-foreground font-sans">
        {/* Sidebar */}
        <div className="w-80 ide-sidebar border-r border-border/50 flex flex-col">
          {/* Sidebar Header */}
          <div className="h-12 border-b border-border/50 flex items-center px-4">
            <h1 className="text-lg ide-title text-foreground">SunScript IDE</h1>
          </div>
          
          {/* Activity Bar */}
          <div className="flex-1">
            <Tabs defaultValue="explorer" className="h-full">
              <TabsList className="grid w-full grid-cols-5 h-12 rounded-none border-b border-border/50 bg-transparent">
                <TabsTrigger 
                  value="explorer" 
                  className="rounded-none bg-transparent hover:bg-accent/50 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <Folder className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger 
                  value="search" 
                  className="rounded-none bg-transparent hover:bg-accent/50 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <Search className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger 
                  value="source-control" 
                  className="rounded-none bg-transparent hover:bg-accent/50 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <GitBranch className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger 
                  value="debug" 
                  className="rounded-none bg-transparent hover:bg-accent/50 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <Bug className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger 
                  value="ai" 
                  className="rounded-none bg-transparent hover:bg-accent/50 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <MessageSquare className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="explorer" className="flex-1 m-0 p-0">
                <div ref={fileExplorerRef} className="h-full" />
              </TabsContent>
              
              <TabsContent value="search" className="flex-1 m-0 p-4 ide-scrollbar overflow-y-auto">
                <div className="space-y-4">
                  <h3 className="text-sm ide-title text-foreground">Search</h3>
                  <p className="ide-text-subtle">Search functionality will be implemented here.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="source-control" className="flex-1 m-0 p-4 ide-scrollbar overflow-y-auto">
                <div className="space-y-4">
                  <h3 className="text-sm ide-title text-foreground">Source Control</h3>
                  <p className="ide-text-subtle">Git integration will be implemented here.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="debug" className="flex-1 m-0 p-4 ide-scrollbar overflow-y-auto">
                <div className="space-y-4">
                  <h3 className="text-sm ide-title text-foreground">Debug</h3>
                  <p className="ide-text-subtle">Debug panel will be implemented here.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="ai" className="flex-1 m-0 p-0">
                <div className="h-full" id="ai-chat-panel" />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col ide-editor">
          {/* Toolbar */}
          <div className="h-12 border-b border-border/50 flex items-center px-4 gap-2 bg-card">
            <div ref={toolbarRef} className="flex-1" />
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-accent/50 text-muted-foreground hover:text-foreground"
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-accent/50 text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          
          {/* Editor Tabs and Content */}
          <div className="flex-1 flex flex-col">
            {/* Editor Tab Bar */}
            <div className="h-10 border-b border-border/50 flex items-center bg-card/50">
              <div className="flex items-center h-full">
                <div className="ide-tab active flex items-center gap-2 px-3 h-full text-sm font-medium bg-background border-r border-border/50">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Welcome</span>
                </div>
              </div>
            </div>
            
            {/* Editor Content */}
            <div className="flex-1 bg-background">
              <div ref={editorRef} className="h-full w-full" />
            </div>
          </div>
          
          <Separator className="bg-border/50" />
          
          {/* Bottom Panel */}
          <div className="h-48 ide-panel">
            <Tabs defaultValue="terminal" className="h-full">
              <TabsList className="h-9 rounded-none border-b border-border/50 bg-transparent justify-start">
                <TabsTrigger 
                  value="terminal" 
                  className="rounded-none bg-transparent hover:bg-accent/50 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <Terminal className="h-3.5 w-3.5 mr-2" />
                  Terminal
                </TabsTrigger>
                <TabsTrigger 
                  value="output" 
                  className="rounded-none bg-transparent hover:bg-accent/50 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  Output
                </TabsTrigger>
                <TabsTrigger 
                  value="problems" 
                  className="rounded-none bg-transparent hover:bg-accent/50 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  Problems
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="terminal" className="flex-1 m-0 p-0">
                <div className="h-full ide-terminal p-4 font-mono text-sm ide-scrollbar overflow-y-auto">
                  <div className="text-green-400">$ Terminal ready...</div>
                  <div className="text-muted-foreground text-xs mt-2">SunScript IDE Terminal v1.0.0</div>
                </div>
              </TabsContent>
              
              <TabsContent value="output" className="flex-1 m-0 p-0">
                <div ref={outputPanelRef} className="h-full ide-scrollbar overflow-y-auto" />
              </TabsContent>
              
              <TabsContent value="problems" className="flex-1 m-0 p-4 ide-scrollbar overflow-y-auto">
                <div className="space-y-2">
                  <h3 className="text-sm ide-title text-foreground">Problems</h3>
                  <p className="ide-text-subtle">No problems detected.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

@injectable()
export class App {
  private reactApp: React.FC<AppProps>;
  
  constructor(
    @inject(TYPES.Editor) private editor: Editor,
    @inject(TYPES.FileExplorer) private fileExplorer: FileExplorer,
    @inject(TYPES.OutputPanel) private outputPanel: OutputPanel,
    @inject(TYPES.Toolbar) private toolbar: Toolbar,
    @inject(TYPES.FileSystemService) private fileSystemService: FileSystemService,
    @inject(TYPES.CompilerService) private compilerService: SunScriptCompilerService,
    @inject(TYPES.EventBus) private eventBus: EventBus,
    @inject(TYPES.CommandRegistry) private commandRegistry: CommandRegistry,
    @inject(TYPES.CommandPalette) private commandPalette: CommandPalette,
    @inject(TYPES.QuickOpen) private quickOpen: QuickOpen,
    @inject(TYPES.AIChatPanel) private aiChatPanel: AIChatPanel,
    @inject(TYPES.AIConfigDialog) private aiConfigDialog: AIConfigDialog
  ) {
    this.reactApp = AppComponent;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.eventBus.on('file.selected', (event) => {
      console.log('File selected:', event.data);
    });

    this.eventBus.on('file.opened', (event) => {
      console.log('File opened:', event.data);
    });

    this.eventBus.on('compile.started', () => {
      console.log('Compilation started');
    });

    this.eventBus.on('compile.completed', (event) => {
      console.log('Compilation completed:', event.data);
    });
  }
  
  mount(rootElement: HTMLElement): void {
    const React = require('react');
    const ReactDOM = require('react-dom/client');
    
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(this.reactApp, {
      editor: this.editor,
      fileExplorer: this.fileExplorer,
      outputPanel: this.outputPanel,
      toolbar: this.toolbar,
      fileSystemService: this.fileSystemService,
      compilerService: this.compilerService,
      eventBus: this.eventBus,
      commandRegistry: this.commandRegistry,
      commandPalette: this.commandPalette,
      quickOpen: this.quickOpen,
      aiChatPanel: this.aiChatPanel,
      aiConfigDialog: this.aiConfigDialog
    }));
  }
}