import { injectable } from 'inversify';

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

@injectable()
export class EventBus {
    private listeners = new Map<string, Set<EventListener>>();
    private eventHistory: Event[] = [];
    private maxHistorySize = 100;
    
    on<T = any>(type: string, listener: EventListener<T>): Disposable {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        
        const listeners = this.listeners.get(type)!;
        listeners.add(listener);
        
        return {
            dispose: () => {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.listeners.delete(type);
                }
            }
        };
    }
    
    once<T = any>(type: string, listener: EventListener<T>): Disposable {
        const disposable = this.on(type, (event: Event<T>) => {
            disposable.dispose();
            listener(event);
        });
        
        return disposable;
    }
    
    emit<T = any>(type: string, data?: T): void {
        const event: Event<T> = {
            type,
            data,
            timestamp: Date.now()
        };
        
        // Add to history
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
        
        // Notify listeners
        const listeners = this.listeners.get(type);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(event);
                } catch (error) {
                    console.error(`Error in event listener for ${type}:`, error);
                }
            });
        }
        
        // Also emit wildcard event
        const wildcardListeners = this.listeners.get('*');
        if (wildcardListeners) {
            wildcardListeners.forEach(listener => {
                try {
                    listener(event);
                } catch (error) {
                    console.error('Error in wildcard event listener:', error);
                }
            });
        }
    }
    
    off(type: string, listener?: EventListener): void {
        if (!listener) {
            this.listeners.delete(type);
            return;
        }
        
        const listeners = this.listeners.get(type);
        if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this.listeners.delete(type);
            }
        }
    }
    
    getEventHistory(type?: string): Event[] {
        if (type) {
            return this.eventHistory.filter(event => event.type === type);
        }
        return [...this.eventHistory];
    }
    
    clearHistory(): void {
        this.eventHistory = [];
    }
    
    hasListeners(type: string): boolean {
        return this.listeners.has(type);
    }
}