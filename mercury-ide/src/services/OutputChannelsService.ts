import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';

export interface OutputChannel {
    name: string;
    id: string;
    lines: OutputLine[];
    isActive: boolean;
    maxLines: number;
}

export interface OutputLine {
    content: string;
    timestamp: Date;
    level: 'info' | 'warn' | 'error' | 'debug';
}

@injectable()
export class OutputChannelsService {
    private channels = new Map<string, OutputChannel>();
    private activeChannelId: string | null = null;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.initializeDefaultChannels();
    }

    private initializeDefaultChannels(): void {
        // Create default output channels
        this.createChannel('SunScript', 'sunscript');
        this.createChannel('Build', 'build');
        this.createChannel('Test', 'test');
        this.createChannel('Debug', 'debug');
        this.createChannel('Extension Host', 'extension-host');

        // Set SunScript as the default active channel
        this.setActiveChannel('sunscript');
    }

    createChannel(name: string, id?: string): string {
        const channelId = id || name.toLowerCase().replace(/\s+/g, '-');
        
        if (this.channels.has(channelId)) {
            return channelId;
        }

        const channel: OutputChannel = {
            name,
            id: channelId,
            lines: [],
            isActive: false,
            maxLines: 1000
        };

        this.channels.set(channelId, channel);
        this.eventBus.emit('outputChannel.created', { channelId, name });

        return channelId;
    }

    appendLine(channelId: string, content: string, level: OutputLine['level'] = 'info'): void {
        const channel = this.channels.get(channelId);
        if (!channel) {
            console.warn(`Output channel ${channelId} not found`);
            return;
        }

        const line: OutputLine = {
            content,
            timestamp: new Date(),
            level
        };

        channel.lines.push(line);

        // Trim lines if exceeding max
        if (channel.lines.length > channel.maxLines) {
            channel.lines.splice(0, channel.lines.length - channel.maxLines);
        }

        this.eventBus.emit('outputChannel.lineAdded', { 
            channelId, 
            line,
            isActiveChannel: this.activeChannelId === channelId
        });
    }

    appendLines(channelId: string, lines: string[], level: OutputLine['level'] = 'info'): void {
        lines.forEach(line => this.appendLine(channelId, line, level));
    }

    clear(channelId: string): void {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.lines = [];
            this.eventBus.emit('outputChannel.cleared', { channelId });
        }
    }

    setActiveChannel(channelId: string): void {
        // Deactivate current channel
        if (this.activeChannelId) {
            const currentChannel = this.channels.get(this.activeChannelId);
            if (currentChannel) {
                currentChannel.isActive = false;
            }
        }

        // Activate new channel
        const newChannel = this.channels.get(channelId);
        if (newChannel) {
            newChannel.isActive = true;
            this.activeChannelId = channelId;
            this.eventBus.emit('outputChannel.activated', { channelId });
        }
    }

    getChannel(channelId: string): OutputChannel | undefined {
        return this.channels.get(channelId);
    }

    getChannels(): OutputChannel[] {
        return Array.from(this.channels.values());
    }

    getActiveChannel(): OutputChannel | null {
        return this.activeChannelId ? this.channels.get(this.activeChannelId) || null : null;
    }

    deleteChannel(channelId: string): void {
        if (this.channels.delete(channelId)) {
            // If this was the active channel, activate another one
            if (this.activeChannelId === channelId) {
                this.activeChannelId = null;
                const remainingChannels = Array.from(this.channels.keys());
                if (remainingChannels.length > 0) {
                    this.setActiveChannel(remainingChannels[0]);
                }
            }
            
            this.eventBus.emit('outputChannel.deleted', { channelId });
        }
    }

    // Convenience methods for common log levels
    info(channelId: string, message: string): void {
        this.appendLine(channelId, message, 'info');
    }

    warn(channelId: string, message: string): void {
        this.appendLine(channelId, message, 'warn');
    }

    error(channelId: string, message: string): void {
        this.appendLine(channelId, message, 'error');
    }

    debug(channelId: string, message: string): void {
        this.appendLine(channelId, message, 'debug');
    }

    // Integration methods for common IDE operations
    logBuildOutput(output: string, isError: boolean = false): void {
        const level = isError ? 'error' : 'info';
        this.appendLine('build', output, level);
    }

    logTestOutput(output: string, isError: boolean = false): void {
        const level = isError ? 'error' : 'info';
        this.appendLine('test', output, level);
    }

    logDebugOutput(output: string): void {
        this.appendLine('debug', output, 'debug');
    }

    logSunScriptOutput(output: string, level: OutputLine['level'] = 'info'): void {
        this.appendLine('sunscript', output, level);
    }

    // Format helpers
    formatWithTimestamp(message: string): string {
        const timestamp = new Date().toLocaleTimeString();
        return `[${timestamp}] ${message}`;
    }

    formatCommand(command: string, output: string): string {
        return `> ${command}\n${output}`;
    }

    // Search functionality
    searchInChannel(channelId: string, query: string): OutputLine[] {
        const channel = this.channels.get(channelId);
        if (!channel) return [];

        return channel.lines.filter(line => 
            line.content.toLowerCase().includes(query.toLowerCase())
        );
    }

    searchInAllChannels(query: string): Map<string, OutputLine[]> {
        const results = new Map<string, OutputLine[]>();

        for (const [channelId, channel] of this.channels) {
            const matches = channel.lines.filter(line => 
                line.content.toLowerCase().includes(query.toLowerCase())
            );
            
            if (matches.length > 0) {
                results.set(channelId, matches);
            }
        }

        return results;
    }
}