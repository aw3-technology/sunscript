export interface Stats {
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
    size: number;
    mtime: Date;
    atime: Date;
    ctime: Date;
}
export declare class MockStats implements Stats {
    size: number;
    mtime: Date;
    atime: Date;
    ctime: Date;
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
export interface Dirent {
    name: string;
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
export declare class MockDirent implements Dirent {
    name: string;
    private type;
    constructor(name: string, type?: 'file' | 'directory');
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
export declare function readFileSync(path: string, options?: any): string;
export declare function writeFileSync(path: string, data: string, options?: any): void;
export declare function existsSync(path: string): boolean;
export declare function statSync(path: string): Stats;
export declare function readdirSync(path: string, options?: any): string[] | Dirent[];
export declare function access(path: string, mode?: number, callback?: Function): void;
export declare function readFile(path: string, options: any, callback: Function): void;
declare const _default: {
    readFileSync: typeof readFileSync;
    writeFileSync: typeof writeFileSync;
    existsSync: typeof existsSync;
    statSync: typeof statSync;
    readdirSync: typeof readdirSync;
    access: typeof access;
    readFile: typeof readFile;
};
export default _default;
