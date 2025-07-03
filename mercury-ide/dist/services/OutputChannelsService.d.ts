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
export declare class OutputChannelsService {
    private eventBus;
    private channels;
    private activeChannelId;
    constructor(eventBus: EventBus);
    private initializeDefaultChannels;
    createChannel(name: string, id?: string): string;
    appendLine(channelId: string, content: string, level?: OutputLine['level']): void;
    appendLines(channelId: string, lines: string[], level?: OutputLine['level']): void;
    clear(channelId: string): void;
    setActiveChannel(channelId: string): void;
    getChannel(channelId: string): OutputChannel | undefined;
    getChannels(): OutputChannel[];
    getActiveChannel(): OutputChannel | null;
    deleteChannel(channelId: string): void;
    info(channelId: string, message: string): void;
    warn(channelId: string, message: string): void;
    error(channelId: string, message: string): void;
    debug(channelId: string, message: string): void;
    logBuildOutput(output: string, isError?: boolean): void;
    logTestOutput(output: string, isError?: boolean): void;
    logDebugOutput(output: string): void;
    logSunScriptOutput(output: string, level?: OutputLine['level']): void;
    formatWithTimestamp(message: string): string;
    formatCommand(command: string, output: string): string;
    searchInChannel(channelId: string, query: string): OutputLine[];
    searchInAllChannels(query: string): Map<string, OutputLine[]>;
}
