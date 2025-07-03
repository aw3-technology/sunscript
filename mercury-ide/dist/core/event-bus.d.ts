export interface Event<T = any> {
    type: string;
    data?: T;
    timestamp: number;
}
export interface EventListener<T = any> {
    (event: Event<T>): void;
}
export interface Disposable {
    dispose(): void;
}
export declare class EventBus {
    private listeners;
    private eventHistory;
    private maxHistorySize;
    on<T = any>(type: string, listener: EventListener<T>): Disposable;
    once<T = any>(type: string, listener: EventListener<T>): Disposable;
    emit<T = any>(type: string, data?: T): void;
    off(type: string, listener?: EventListener): void;
    getEventHistory(type?: string): Event[];
    clearHistory(): void;
    hasListeners(type: string): boolean;
}
