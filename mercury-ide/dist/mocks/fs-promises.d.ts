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
export declare function readFile(path: string, options?: any): Promise<string>;
export declare function writeFile(path: string, data: string, options?: any): Promise<void>;
export declare function access(path: string, mode?: number): Promise<void>;
export declare function stat(path: string): Promise<Stats>;
export declare function readdir(path: string, options?: any): Promise<string[] | Dirent[]>;
export declare function mkdir(path: string, options?: any): Promise<void>;
export declare function rmdir(path: string): Promise<void>;
export declare function unlink(path: string): Promise<void>;
export declare function rename(oldPath: string, newPath: string): Promise<void>;
export declare function copyFile(src: string, dest: string, mode?: number): Promise<void>;
export declare function watch(filename: string, options?: any): any;
declare const _default: {
    readFile: typeof readFile;
    writeFile: typeof writeFile;
    access: typeof access;
    stat: typeof stat;
    readdir: typeof readdir;
    mkdir: typeof mkdir;
    rmdir: typeof rmdir;
    unlink: typeof unlink;
    rename: typeof rename;
    copyFile: typeof copyFile;
    watch: typeof watch;
};
export default _default;
