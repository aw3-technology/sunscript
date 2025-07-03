export interface CompilerResult {
    success: boolean;
    output?: string;
    errors?: string[];
    compiledCode?: string;
    compilationTime?: number;
}
export interface BuildOptions {
    outputDir?: string;
    optimization?: 'none' | 'basic' | 'full';
    sourceMap?: boolean;
    watch?: boolean;
}
export interface RunOptions {
    arguments?: string[];
    environment?: Record<string, string>;
    timeout?: number;
}
export declare class SunScriptCompilerService {
    private sunscriptExecutablePath;
    private workingDirectory;
    private isCompilerAvailable;
    constructor();
    private findSunScriptCompiler;
    private checkCompilerAvailability;
    setWorkingDirectory(directory: string): void;
    compile(filePath: string, options?: BuildOptions): Promise<CompilerResult>;
    run(filePath: string, options?: RunOptions): Promise<CompilerResult>;
    build(projectPath: string, options?: BuildOptions): Promise<CompilerResult>;
    private buildCompilerCommand;
    private buildRunCommand;
    private buildProjectCommand;
    private executeCompiler;
    private executeProgram;
    private getOutputPath;
    private fallbackCompile;
    private fallbackRun;
    private fallbackBuild;
    private findSunFiles;
    private simulateCompilation;
    private transformSunScriptToJS;
    private simulateExecution;
    validate(code: string): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    isAvailable(): boolean;
    getCompilerInfo(): {
        available: boolean;
        path: string;
        version?: string;
    };
}
