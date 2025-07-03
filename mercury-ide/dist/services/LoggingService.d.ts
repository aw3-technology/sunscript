import { EventBus } from '../core/event-bus';
export declare enum LogLevel {
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
    dateRange?: {
        start: Date;
        end: Date;
    };
}
export declare class LoggingService {
    private eventBus;
    private logs;
    private maxLogs;
    private currentLogLevel;
    private logHandlers;
    private categories;
    constructor(eventBus: EventBus);
    private setupEventListeners;
    private setupConsoleOverrides;
    private formatConsoleMessage;
    debug(category: string, message: string, data?: any): void;
    info(category: string, message: string, data?: any): void;
    warn(category: string, message: string, data?: any): void;
    error(category: string, message: string, error?: Error | any): void;
    fatal(category: string, message: string, error?: Error | any): void;
    private log;
    private notifyHandlers;
    setLogLevel(level: LogLevel): void;
    getLogLevel(): LogLevel;
    setMaxLogs(max: number): void;
    getLogs(filter?: LogFilter): LogEntry[];
    getCategories(): string[];
    getLogStats(): {
        total: number;
        byLevel: Record<LogLevel, number>;
        byCategory: Record<string, number>;
    };
    registerHandler(id: string, handler: (entry: LogEntry) => void): void;
    unregisterHandler(id: string): void;
    exportLogs(format?: 'json' | 'csv' | 'text'): string;
    clearLogs(category?: string): void;
    startTimer(id: string): void;
    endTimer(id: string): number;
    measureAsync<T>(id: string, operation: () => Promise<T>): Promise<T>;
}
export declare let logger: LoggingService;
export declare function setGlobalLogger(instance: LoggingService): void;
