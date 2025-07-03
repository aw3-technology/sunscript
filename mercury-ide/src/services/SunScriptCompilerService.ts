import { injectable } from 'inversify';
import { spawn, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

@injectable()
export class SunScriptCompilerService {
    private sunscriptExecutablePath: string;
    private workingDirectory: string;
    private isCompilerAvailable: boolean = false;
    
    constructor() {
        // Try to find the SunScript compiler
        this.sunscriptExecutablePath = this.findSunScriptCompiler();
        this.workingDirectory = process.cwd();
        this.checkCompilerAvailability();
    }
    
    private findSunScriptCompiler(): string {
        // Look for SunScript compiler in common locations
        const possiblePaths = [
            // Local installation
            path.join(process.cwd(), '..', 'my-sunscript-project', 'bin', 'sunscript.ts'),
            path.join(process.cwd(), 'my-sunscript-project', 'bin', 'sunscript.ts'),
            // Parent directory installation
            path.join(__dirname, '..', '..', '..', 'my-sunscript-project', 'bin', 'sunscript.ts'),
            // Global installation
            'sunscript',
            'npx sunscript'
        ];
        
        // For now, use the local TypeScript version
        return possiblePaths[0];
    }
    
    private async checkCompilerAvailability(): Promise<void> {
        try {
            // Check if the SunScript compiler exists
            const compilerPath = this.sunscriptExecutablePath;
            
            if (compilerPath.endsWith('.ts')) {
                // Check if the TypeScript file exists
                await fs.access(compilerPath);
                this.isCompilerAvailable = true;
                console.log('✅ SunScript compiler found at:', compilerPath);
            } else {
                // Try to run the command
                await execAsync(`${compilerPath} --version`);
                this.isCompilerAvailable = true;
                console.log('✅ SunScript compiler available:', compilerPath);
            }
        } catch (error: any) {
            this.isCompilerAvailable = false;
            console.warn('⚠️ SunScript compiler not found. Using fallback simulation.', error.message);
        }
    }
    
    setWorkingDirectory(directory: string): void {
        this.workingDirectory = directory;
    }
    
    async compile(filePath: string, options: BuildOptions = {}): Promise<CompilerResult> {
        const startTime = Date.now();
        
        try {
            if (!this.isCompilerAvailable) {
                return await this.fallbackCompile(filePath);
            }
            
            // Read the source file
            const sourceCode = await fs.readFile(filePath, 'utf-8');
            
            // Prepare compiler command
            const compilerCommand = await this.buildCompilerCommand(filePath, options);
            
            // Execute compilation
            const result = await this.executeCompiler(compilerCommand);
            
            const compilationTime = Date.now() - startTime;
            
            if (result.success) {
                // Try to read the compiled output
                const outputPath = this.getOutputPath(filePath, options.outputDir);
                let compiledCode = '';
                
                try {
                    compiledCode = await fs.readFile(outputPath, 'utf-8');
                } catch (error: any) {
                    console.warn('Could not read compiled output:', error.message);
                }
                
                return {
                    success: true,
                    output: result.output,
                    compiledCode,
                    compilationTime
                };
            } else {
                return {
                    success: false,
                    errors: result.errors,
                    compilationTime
                };
            }
        } catch (error: any) {
            console.error('Compilation error:', error);
            return {
                success: false,
                errors: [error.message],
                compilationTime: Date.now() - startTime
            };
        }
    }
    
    async run(filePath: string, options: RunOptions = {}): Promise<CompilerResult> {
        try {
            if (!this.isCompilerAvailable) {
                return await this.fallbackRun(filePath);
            }
            
            // First compile the file
            const compileResult = await this.compile(filePath);
            
            if (!compileResult.success) {
                return compileResult;
            }
            
            // Prepare run command
            const runCommand = await this.buildRunCommand(filePath, options);
            
            // Execute the program
            const result = await this.executeProgram(runCommand, options);
            
            return {
                success: result.success,
                output: result.output,
                errors: result.errors
            };
        } catch (error: any) {
            console.error('Run error:', error);
            return {
                success: false,
                errors: [error.message]
            };
        }
    }
    
    async build(projectPath: string, options: BuildOptions = {}): Promise<CompilerResult> {
        try {
            if (!this.isCompilerAvailable) {
                return await this.fallbackBuild(projectPath);
            }
            
            // Look for genesis.sun file
            const genesisPath = path.join(projectPath, 'genesis.sun');
            
            // Check if genesis.sun exists
            try {
                await fs.access(genesisPath);
            } catch (error) {
                return {
                    success: false,
                    errors: ['No genesis.sun file found in project']
                };
            }
            
            // Build the entire project
            const buildCommand = await this.buildProjectCommand(projectPath, options);
            const result = await this.executeCompiler(buildCommand);
            
            return {
                success: result.success,
                output: result.output,
                errors: result.errors
            };
        } catch (error: any) {
            console.error('Build error:', error);
            return {
                success: false,
                errors: [error.message]
            };
        }
    }
    
    private async buildCompilerCommand(filePath: string, options: BuildOptions): Promise<string> {
        const args = [];
        
        // Add compilation flags
        args.push('compile');
        args.push(filePath);
        
        if (options.outputDir) {
            args.push('--output', options.outputDir);
        }
        
        if (options.optimization) {
            args.push('--optimization', options.optimization);
        }
        
        if (options.sourceMap) {
            args.push('--source-map');
        }
        
        if (options.watch) {
            args.push('--watch');
        }
        
        // For TypeScript-based compiler
        if (this.sunscriptExecutablePath.endsWith('.ts')) {
            return `npx ts-node "${this.sunscriptExecutablePath}" ${args.join(' ')}`;
        }
        
        return `${this.sunscriptExecutablePath} ${args.join(' ')}`;
    }
    
    private async buildRunCommand(filePath: string, options: RunOptions): Promise<string> {
        const args = [];
        
        args.push('run');
        args.push(filePath);
        
        if (options.arguments) {
            args.push('--', ...options.arguments);
        }
        
        // For TypeScript-based compiler
        if (this.sunscriptExecutablePath.endsWith('.ts')) {
            return `npx ts-node "${this.sunscriptExecutablePath}" ${args.join(' ')}`;
        }
        
        return `${this.sunscriptExecutablePath} ${args.join(' ')}`;
    }
    
    private async buildProjectCommand(projectPath: string, options: BuildOptions): Promise<string> {
        const args = [];
        
        args.push('build');
        args.push(projectPath);
        
        if (options.outputDir) {
            args.push('--output', options.outputDir);
        }
        
        if (options.optimization) {
            args.push('--optimization', options.optimization);
        }
        
        // For TypeScript-based compiler
        if (this.sunscriptExecutablePath.endsWith('.ts')) {
            return `npx ts-node "${this.sunscriptExecutablePath}" ${args.join(' ')}`;
        }
        
        return `${this.sunscriptExecutablePath} ${args.join(' ')}`;
    }
    
    private async executeCompiler(command: string): Promise<{ success: boolean; output?: string; errors?: string[] }> {
        return new Promise((resolve) => {
            const compilerProcess = spawn(command, [], {
                shell: true,
                cwd: this.workingDirectory,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let output = '';
            let errorOutput = '';
            
            compilerProcess.stdout?.on('data', (data: any) => {
                output += data.toString();
            });
            
            compilerProcess.stderr?.on('data', (data: any) => {
                errorOutput += data.toString();
            });
            
            compilerProcess.on('close', (code: any) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        output: output.trim()
                    });
                } else {
                    resolve({
                        success: false,
                        errors: errorOutput.split('\n').filter(line => line.trim())
                    });
                }
            });
            
            compilerProcess.on('error', (error: any) => {
                resolve({
                    success: false,
                    errors: [error.message]
                });
            });
        });
    }
    
    private async executeProgram(
        command: string, 
        options: RunOptions
    ): Promise<{ success: boolean; output?: string; errors?: string[] }> {
        return new Promise((resolve) => {
            const timeout = options.timeout || 30000; // 30 second default timeout
            
            const childProcess = spawn(command, [], {
                shell: true,
                cwd: this.workingDirectory,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, ...options.environment }
            });
            
            let output = '';
            let errorOutput = '';
            let isResolved = false;
            
            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    childProcess.kill('SIGTERM');
                    isResolved = true;
                    resolve({
                        success: false,
                        errors: ['Program execution timed out']
                    });
                }
            }, timeout);
            
            childProcess.stdout?.on('data', (data: any) => {
                output += data.toString();
            });
            
            childProcess.stderr?.on('data', (data: any) => {
                errorOutput += data.toString();
            });
            
            childProcess.on('close', (code: any) => {
                if (!isResolved) {
                    clearTimeout(timeoutId);
                    isResolved = true;
                    
                    if (code === 0) {
                        resolve({
                            success: true,
                            output: output.trim()
                        });
                    } else {
                        resolve({
                            success: false,
                            errors: errorOutput.split('\n').filter(line => line.trim())
                        });
                    }
                }
            });
            
            childProcess.on('error', (error: any) => {
                if (!isResolved) {
                    clearTimeout(timeoutId);
                    isResolved = true;
                    resolve({
                        success: false,
                        errors: [error.message]
                    });
                }
            });
        });
    }
    
    private getOutputPath(inputPath: string, outputDir?: string): string {
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const outputFileName = `${fileName}.js`;
        
        if (outputDir) {
            return path.join(outputDir, outputFileName);
        }
        
        return path.join(path.dirname(inputPath), outputFileName);
    }
    
    // Fallback methods for when the real compiler is not available
    private async fallbackCompile(filePath: string): Promise<CompilerResult> {
        try {
            const code = await fs.readFile(filePath, 'utf-8');
            const result = await this.simulateCompilation(code);
            
            return {
                success: result.success,
                output: result.success ? 'Compilation successful (simulated)' : undefined,
                errors: result.success ? undefined : [result.error || 'Compilation failed'],
                compiledCode: result.compiledCode,
                compilationTime: 500
            };
        } catch (error: any) {
            return {
                success: false,
                errors: [error.message]
            };
        }
    }
    
    private async fallbackRun(filePath: string): Promise<CompilerResult> {
        try {
            const code = await fs.readFile(filePath, 'utf-8');
            const compileResult = await this.simulateCompilation(code);
            
            if (compileResult.success) {
                const output = this.simulateExecution(compileResult.compiledCode);
                return {
                    success: true,
                    output
                };
            } else {
                return {
                    success: false,
                    errors: [compileResult.error || 'Compilation failed']
                };
            }
        } catch (error: any) {
            return {
                success: false,
                errors: [error.message]
            };
        }
    }
    
    private async fallbackBuild(projectPath: string): Promise<CompilerResult> {
        try {
            // Look for all .sun files in the project
            const sunFiles = await this.findSunFiles(projectPath);
            
            if (sunFiles.length === 0) {
                return {
                    success: false,
                    errors: ['No .sun files found in project']
                };
            }
            
            let allOutput = '';
            const errors: string[] = [];
            
            for (const file of sunFiles) {
                const result = await this.fallbackCompile(file);
                if (result.success) {
                    allOutput += `Compiled ${file}\n`;
                } else {
                    errors.push(...(result.errors || []));
                }
            }
            
            return {
                success: errors.length === 0,
                output: allOutput,
                errors: errors.length > 0 ? errors : undefined
            };
        } catch (error: any) {
            return {
                success: false,
                errors: [error.message]
            };
        }
    }
    
    private async findSunFiles(directory: string): Promise<string[]> {
        const files: string[] = [];
        
        try {
            const entries = await fs.readdir(directory, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    const subFiles = await this.findSunFiles(fullPath);
                    files.push(...subFiles);
                } else if (entry.isFile() && entry.name.endsWith('.sun')) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            console.error('Error reading directory:', error);
        }
        
        return files;
    }
    
    private async simulateCompilation(code: string): Promise<{ success: boolean; compiledCode: string; error?: string }> {
        // Simulate compilation delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        try {
            // Basic validation
            if (!code.trim()) {
                return { success: false, compiledCode: '', error: 'Empty code' };
            }
            
            // Check for basic SunScript syntax
            const hasDecorator = /@(task|component|project|service|api|route|middleware|auth|model|schema)/.test(code);
            
            if (!hasDecorator) {
                return { 
                    success: false, 
                    compiledCode: '', 
                    error: 'No SunScript decorators found. Please use @task, @component, @project, etc.' 
                };
            }
            
            // Simulate successful compilation
            const compiledCode = this.transformSunScriptToJS(code);
            
            return { success: true, compiledCode };
        } catch (error) {
            return { success: false, compiledCode: '', error: String(error) };
        }
    }
    
    private transformSunScriptToJS(code: string): string {
        let jsCode = code;
        
        // Transform @task decorators
        jsCode = jsCode.replace(/@task\s+(\w+)\s*\(/g, 'function $1(');
        jsCode = jsCode.replace(/@task\s+(\w+)\s*{/g, 'function $1() {');
        
        // Transform @component decorators
        jsCode = jsCode.replace(/@component\s+(\w+)\s*{/g, 'class $1 {');
        
        // Transform @project decorators
        jsCode = jsCode.replace(/@project\s+(\w+)\s*{/g, 'const project_$1 = {');
        
        // Transform @service decorators
        jsCode = jsCode.replace(/@service\s+(\w+)\s*{/g, 'class $1Service {');
        
        // Transform @api decorators
        jsCode = jsCode.replace(/@api\s+(\w+)\s*{/g, 'class $1API {');
        
        // Transform state declarations
        jsCode = jsCode.replace(/state:\s*{/g, 'constructor() { this.state = {');
        
        // Add helpful comments
        jsCode = `// Generated from SunScript\n// This is a simulated compilation\n${jsCode}`;
        
        return jsCode;
    }
    
    private simulateExecution(compiledCode: string): string {
        const lines = compiledCode.split('\n');
        const output: string[] = ['🚀 Program execution started...'];
        
        // Analyze the compiled code for execution simulation
        lines.forEach(line => {
            if (line.includes('function')) {
                const match = line.match(/function\s+(\w+)/);
                if (match) {
                    output.push(`✓ Loaded function: ${match[1]}()`);
                }
            } else if (line.includes('class')) {
                const match = line.match(/class\s+(\w+)/);
                if (match) {
                    output.push(`✓ Loaded class: ${match[1]}`);
                }
            } else if (line.includes('console.log')) {
                const match = line.match(/console\.log\(['".](.+?)['"]/);
                if (match) {
                    output.push(`📝 Output: ${match[1]}`);
                }
            }
        });
        
        output.push('✅ Program execution completed successfully!');
        output.push('💡 Note: This is a simulated execution. Install the SunScript compiler for real execution.');
        
        return output.join('\n');
    }
    
    async validate(code: string): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Basic syntax validation
        const lines = code.split('\n');
        let braceCount = 0;
        let inString = false;
        let stringChar = '';
        
        lines.forEach((line, index) => {
            // Track brace balance
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (!inString) {
                    if (char === '"' || char === "'" || char === '`') {
                        inString = true;
                        stringChar = char;
                    } else if (char === '{') {
                        braceCount++;
                    } else if (char === '}') {
                        braceCount--;
                    }
                } else if (char === stringChar && line[i-1] !== '\\') {
                    inString = false;
                }
            }
            
            // Check for valid decorators
            const decoratorMatch = line.match(/@(\w+)/);
            if (decoratorMatch) {
                const decorator = decoratorMatch[1];
                const validDecorators = [
                    'task', 'component', 'project', 'service', 'api', 'route',
                    'middleware', 'auth', 'public', 'private', 'protected',
                    'override', 'syntax', 'model', 'schema', 'validation', 'inject'
                ];
                
                if (!validDecorators.includes(decorator)) {
                    warnings.push(`Line ${index + 1}: Unknown decorator @${decorator}`);
                }
            }
            
            // Check for common issues
            if (line.trim().endsWith(';') && /@(task|component|service)/.test(line)) {
                warnings.push(`Line ${index + 1}: Decorator lines should not end with semicolon`);
            }
        });
        
        if (braceCount !== 0) {
            errors.push('Mismatched braces - check your { and } pairs');
        }
        
        // Check for required elements
        if (!/@(task|component|project)/.test(code)) {
            errors.push('File must contain at least one @task, @component, or @project declaration');
        }
        
        return { 
            valid: errors.length === 0, 
            errors, 
            warnings 
        };
    }
    
    isAvailable(): boolean {
        return this.isCompilerAvailable;
    }
    
    getCompilerInfo(): { available: boolean; path: string; version?: string } {
        return {
            available: this.isCompilerAvailable,
            path: this.sunscriptExecutablePath,
            version: this.isCompilerAvailable ? 'Unknown' : undefined
        };
    }
}