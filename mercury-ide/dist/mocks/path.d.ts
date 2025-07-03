export declare const sep = "/";
export declare const delimiter = ":";
export declare function normalize(path: string): string;
export declare function join(...paths: string[]): string;
export declare function resolve(...paths: string[]): string;
export declare function relative(from: string, to: string): string;
export declare function dirname(path: string): string;
export declare function basename(path: string, ext?: string): string;
export declare function extname(path: string): string;
export declare function parse(path: string): {
    root: string;
    dir: string;
    base: string;
    ext: string;
    name: string;
};
export declare function format(pathObject: {
    root?: string;
    dir?: string;
    base?: string;
    ext?: string;
    name?: string;
}): string;
export declare function isAbsolute(path: string): boolean;
declare const _default: {
    sep: string;
    delimiter: string;
    normalize: typeof normalize;
    join: typeof join;
    resolve: typeof resolve;
    relative: typeof relative;
    dirname: typeof dirname;
    basename: typeof basename;
    extname: typeof extname;
    parse: typeof parse;
    format: typeof format;
    isAbsolute: typeof isAbsolute;
};
export default _default;
