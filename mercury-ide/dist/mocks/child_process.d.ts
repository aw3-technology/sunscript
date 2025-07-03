export interface SpawnOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    argv0?: string;
    stdio?: any;
    detached?: boolean;
    uid?: number;
    gid?: number;
    shell?: boolean | string;
    windowsVerbatimArguments?: boolean;
    windowsHide?: boolean;
    timeout?: number;
    killSignal?: string | number;
}
export interface ExecOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    shell?: string;
    timeout?: number;
    maxBuffer?: number;
    killSignal?: string | number;
    uid?: number;
    gid?: number;
    windowsHide?: boolean;
}
export declare class MockChildProcess {
    stdout: {
        on: (event: string, callback: Function) => void;
    };
    stderr: {
        on: (event: string, callback: Function) => void;
    };
    on(event: string, callback: Function): void;
    kill(signal?: string): void;
}
export declare function spawn(command: string, args?: string[], options?: SpawnOptions): MockChildProcess;
export declare function exec(command: string, options?: ExecOptions, callback?: (error: Error | null, stdout: string, stderr: string) => void): MockChildProcess;
declare const _default: {
    spawn: typeof spawn;
    exec: typeof exec;
};
export default _default;
