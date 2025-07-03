import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { SunScriptCompilerService } from './SunScriptCompilerService';
import { FileSystemService } from './FileSystemService';
import { EditorService } from './EditorService';
import { WorkspaceService } from './WorkspaceService';
import { LoggingService } from './LoggingService';
import { EventBus } from '../core/event-bus';

export interface IDEInfo {
    name: string;
    version: string;
    compiler: {
        name: string;
        version: string;
        path: string;
    };
}

@injectable()
export class ClientIDEService {
    private initialized = false;
    
    constructor(
        @inject(TYPES.CompilerService) private compilerService: SunScriptCompilerService,
        @inject(TYPES.FileSystemService) private fileSystemService: FileSystemService,
        @inject(TYPES.EditorService) private editorService: EditorService,
        @inject(TYPES.WorkspaceService) private workspaceService: WorkspaceService,
        @inject(TYPES.LoggingService) private loggingService: LoggingService,
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {}

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            this.loggingService.info('IDE', 'Initializing Client IDE Service...');
            
            // Initialize core services
            await this.initializeServices();
            
            this.initialized = true;
            this.loggingService.info('IDE', 'Client IDE Service initialized successfully');
            
            this.eventBus.emit('ide.initialized', {
                timestamp: new Date(),
                services: ['compiler', 'filesystem', 'editor', 'workspace']
            });
        } catch (error) {
            this.loggingService.error('IDE', 'Failed to initialize Client IDE Service', error);
            throw error;
        }
    }

    private async initializeServices(): Promise<void> {
        // Services are already initialized through Inversify
        // Just verify compiler availability
        const compilerInfo = this.compilerService.getCompilerInfo();
        this.loggingService.info('Compiler', 'SunScript compiler initialized', compilerInfo);
    }

    getInfo(): IDEInfo {
        return {
            name: 'Mercury IDE',
            version: '1.0.0',
            compiler: {
                name: 'SunScript',
                version: '1.0.0',
                path: '/my-sunscript-project/bin/sunscript.ts'
            }
        };
    }

    getCompilerInfo(): any {
        return this.getInfo().compiler;
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    async shutdown(): Promise<void> {
        this.loggingService.info('IDE', 'Shutting down Client IDE Service...');
        
        // Clean up services
        // Note: Individual services handle their own cleanup
        
        this.initialized = false;
        this.eventBus.emit('ide.shutdown', { timestamp: new Date() });
    }

    // API methods for future server communication
    async saveToServer(data: any): Promise<void> {
        // TODO: Implement API call to server
        this.loggingService.info('API', 'Save to server called (not implemented)', data);
    }

    async loadFromServer(id: string): Promise<any> {
        // TODO: Implement API call to server
        this.loggingService.info('API', 'Load from server called (not implemented)', { id });
        return null;
    }
}