import 'reflect-metadata';
import './styles/globals.css';
import { container } from './core/inversify.config';
import { TYPES } from './core/types';
import { App } from './components/App';
import { ContributionLoader } from './core/contribution-loader';
import { SunScriptLanguageProvider } from './providers/SunScriptLanguageProvider';
import { TextMateService } from './services/TextMateService';
import { DiagnosticsService } from './services/DiagnosticsService';
import { DatabaseService } from './services/DatabaseService';
import { IDEService } from './services/IDEService';

class SunScriptIDE {
    private app!: App;
    private contributionLoader!: ContributionLoader;

    constructor() {
        // Services will be initialized in init() method
    }
    
    private async initializeServices(): Promise<void> {
        try {
            // Initialize database connection first
            const databaseService = container.get<DatabaseService>(TYPES.DatabaseService);
            await databaseService.connect();
            await databaseService.createIndexes();
            console.log('Database connected and indexes created');
            
            // Initialize TextMate service
            const textMateService = container.get<TextMateService>(TYPES.TextMateService);
            await textMateService.initialize();
            
            // Initialize diagnostics service
            const diagnosticsService = container.get<DiagnosticsService>(TYPES.DiagnosticsService);
            
            // Initialize IDE service (this coordinates all other services)
            const ideService = container.get<IDEService>(TYPES.IDEService);
            console.log('IDE service initialized with compiler:', ideService.getCompilerInfo());
            
            // Initialize language provider
            const languageProvider = container.get(SunScriptLanguageProvider);
            languageProvider.register();
            
            // Load all contributions
            this.contributionLoader = container.get(ContributionLoader);
            this.contributionLoader.load();
            
            // Get the app instance from the container
            this.app = container.get<App>(TYPES.App);
            
            console.log('SunScript IDE services initialized successfully');
        } catch (error) {
            console.error('Failed to initialize IDE services:', error);
            throw error;
        }
    }

    async init(): Promise<void> {
        const rootElement = document.getElementById('app');
        if (!rootElement) {
            throw new Error('Root element not found');
        }
        
        // Wait for services to be initialized
        await this.initializeServices();
        
        this.app.mount(rootElement);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const ide = new SunScriptIDE();
    try {
        await ide.init();
        console.log('SunScript IDE initialized successfully');
    } catch (error) {
        console.error('Failed to initialize IDE:', error);
    }
});