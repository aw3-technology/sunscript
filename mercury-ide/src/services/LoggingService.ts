import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
}

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    category: string;
    message: string;
    data?: any;
    stack?: string;
}

export interface LogFilter {
    levels?: LogLevel[];
    categories?: string[];
    searchText?: string;
    dateRange?: { start: Date; end: Date };
}

@injectable()
export class LoggingService {
    private logs: LogEntry[] = [];
    private maxLogs = 10000;
    private currentLogLevel = LogLevel.INFO;
    private logHandlers = new Map<string, (entry: LogEntry) => void>();
    private categories = new Set<string>();
    
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.setupConsoleOverrides();
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Listen for log level changes
        this.eventBus.on('logging.setLevel', (event) => {
            const { level } = event.data;
            this.setLogLevel(level);
        });
        
        // Listen for log export requests
        this.eventBus.on('logging.export', (event) => {
            const { format } = event.data;
            this.exportLogs(format);
        });
    }
    
    private setupConsoleOverrides(): void {
        // Store original console methods
        const originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
            debug: console.debug
        };
        
        // Override console methods
        console.log = (...args: any[]) => {
            originalConsole.log(...args);
            this.log(LogLevel.INFO, 'console', this.formatConsoleMessage(args));
        };
        
        console.info = (...args: any[]) => {
            originalConsole.info(...args);
            this.log(LogLevel.INFO, 'console', this.formatConsoleMessage(args));
        };
        
        console.warn = (...args: any[]) => {
            originalConsole.warn(...args);
            this.log(LogLevel.WARN, 'console', this.formatConsoleMessage(args));
        };
        
        console.error = (...args: any[]) => {
            originalConsole.error(...args);
            const message = this.formatConsoleMessage(args);
            const stack = args[0]?.stack || new Error().stack;
            this.log(LogLevel.ERROR, 'console', message, undefined, stack);
        };
        
        console.debug = (...args: any[]) => {
            originalConsole.debug(...args);
            this.log(LogLevel.DEBUG, 'console', this.formatConsoleMessage(args));
        };
    }
    
    private formatConsoleMessage(args: any[]): string {
        return args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
    }
    
    // Main logging methods
    debug(category: string, message: string, data?: any): void {
        this.log(LogLevel.DEBUG, category, message, data);
    }
    
    info(category: string, message: string, data?: any): void {
        this.log(LogLevel.INFO, category, message, data);
    }
    
    warn(category: string, message: string, data?: any): void {
        this.log(LogLevel.WARN, category, message, data);
    }
    
    error(category: string, message: string, error?: Error | any): void {
        const stack = error?.stack || new Error().stack;
        this.log(LogLevel.ERROR, category, message, error, stack);
    }
    
    fatal(category: string, message: string, error?: Error | any): void {
        const stack = error?.stack || new Error().stack;
        this.log(LogLevel.FATAL, category, message, error, stack);
    }
    
    private log(level: LogLevel, category: string, message: string, data?: any, stack?: string): void {
        if (level < this.currentLogLevel) return;
        
        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            category,
            message,
            data,
            stack
        };
        
        // Add to logs array
        this.logs.push(entry);
        this.categories.add(category);
        
        // Trim logs if necessary
        if (this.logs.length > this.maxLogs) {
            this.logs.splice(0, this.logs.length - this.maxLogs);
        }
        
        // Notify handlers
        this.notifyHandlers(entry);
        
        // Emit event
        this.eventBus.emit('logging.entry', { entry });
    }
    
    private notifyHandlers(entry: LogEntry): void {
        this.logHandlers.forEach(handler => {
            try {
                handler(entry);
            } catch (error) {
                console.error('Log handler error:', error);
            }
        });
    }
    
    // Configuration methods
    setLogLevel(level: LogLevel): void {
        this.currentLogLevel = level;
        this.eventBus.emit('logging.levelChanged', { level });
    }
    
    getLogLevel(): LogLevel {
        return this.currentLogLevel;
    }
    
    setMaxLogs(max: number): void {
        this.maxLogs = max;
        if (this.logs.length > max) {
            this.logs.splice(0, this.logs.length - max);
        }
    }
    
    // Query methods
    getLogs(filter?: LogFilter): LogEntry[] {
        let filtered = [...this.logs];
        
        if (filter) {
            if (filter.levels && filter.levels.length > 0) {
                filtered = filtered.filter(log => filter.levels!.includes(log.level));
            }
            
            if (filter.categories && filter.categories.length > 0) {
                filtered = filtered.filter(log => filter.categories!.includes(log.category));
            }
            
            if (filter.searchText) {
                const searchLower = filter.searchText.toLowerCase();
                filtered = filtered.filter(log => 
                    log.message.toLowerCase().includes(searchLower) ||
                    (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower))
                );
            }
            
            if (filter.dateRange) {
                filtered = filtered.filter(log => 
                    log.timestamp >= filter.dateRange!.start &&
                    log.timestamp <= filter.dateRange!.end
                );
            }
        }
        
        return filtered;
    }
    
    getCategories(): string[] {
        return Array.from(this.categories).sort();
    }
    
    getLogStats(): { total: number; byLevel: Record<LogLevel, number>; byCategory: Record<string, number> } {
        const byLevel: Record<LogLevel, number> = {
            [LogLevel.DEBUG]: 0,
            [LogLevel.INFO]: 0,
            [LogLevel.WARN]: 0,
            [LogLevel.ERROR]: 0,
            [LogLevel.FATAL]: 0
        };
        
        const byCategory: Record<string, number> = {};
        
        this.logs.forEach(log => {
            byLevel[log.level]++;
            byCategory[log.category] = (byCategory[log.category] || 0) + 1;
        });
        
        return {
            total: this.logs.length,
            byLevel,
            byCategory
        };
    }
    
    // Handler registration
    registerHandler(id: string, handler: (entry: LogEntry) => void): void {
        this.logHandlers.set(id, handler);
    }
    
    unregisterHandler(id: string): void {
        this.logHandlers.delete(id);
    }
    
    // Export functionality
    exportLogs(format: 'json' | 'csv' | 'text' = 'json'): string {
        const logs = this.getLogs();
        
        switch (format) {
            case 'json':
                return JSON.stringify(logs, null, 2);
                
            case 'csv':
                const headers = ['Timestamp', 'Level', 'Category', 'Message', 'Data', 'Stack'];
                const rows = logs.map(log => [
                    log.timestamp.toISOString(),
                    LogLevel[log.level],
                    log.category,
                    `"${log.message.replace(/"/g, '""')}"`,
                    log.data ? `"${JSON.stringify(log.data).replace(/"/g, '""')}"` : '',
                    log.stack ? `"${log.stack.replace(/"/g, '""')}"` : ''
                ]);
                return [headers, ...rows].map(row => row.join(',')).join('\n');
                
            case 'text':
                return logs.map(log => {
                    const level = LogLevel[log.level].padEnd(5);
                    const time = log.timestamp.toISOString();
                    let text = `[${time}] ${level} [${log.category}] ${log.message}`;
                    if (log.data) {
                        text += `\n  Data: ${JSON.stringify(log.data, null, 2)}`;
                    }
                    if (log.stack) {
                        text += `\n  Stack: ${log.stack}`;
                    }
                    return text;
                }).join('\n\n');
                
            default:
                return JSON.stringify(logs, null, 2);
        }
    }
    
    // Clear logs
    clearLogs(category?: string): void {
        if (category) {
            this.logs = this.logs.filter(log => log.category !== category);
        } else {
            this.logs = [];
            this.categories.clear();
        }
        
        this.eventBus.emit('logging.cleared', { category });
    }
    
    // Performance logging helpers
    startTimer(id: string): void {
        const start = performance.now();
        this.debug('performance', `Timer started: ${id}`, { id, start });
    }
    
    endTimer(id: string): number {
        const end = performance.now();
        const duration = end;
        this.debug('performance', `Timer ended: ${id}`, { id, end, duration });
        return duration;
    }
    
    measureAsync<T>(id: string, operation: () => Promise<T>): Promise<T> {
        const start = performance.now();
        
        return operation()
            .then(result => {
                const duration = performance.now() - start;
                this.debug('performance', `Async operation completed: ${id}`, { id, duration });
                return result;
            })
            .catch(error => {
                const duration = performance.now() - start;
                this.error('performance', `Async operation failed: ${id}`, { id, duration, error });
                throw error;
            });
    }
}

// Global logging instance for convenience
export let logger: LoggingService;

export function setGlobalLogger(instance: LoggingService): void {
    logger = instance;
}