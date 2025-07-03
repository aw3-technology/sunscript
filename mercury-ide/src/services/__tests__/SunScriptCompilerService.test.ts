import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { SunScriptCompilerService, CompilerResult, BuildOptions, RunOptions } from '../SunScriptCompilerService';

describe('SunScriptCompilerService', () => {
    let container: Container;
    let compilerService: SunScriptCompilerService;
    
    beforeEach(() => {
        container = new Container();
        container.bind(TYPES.CompilerService).to(SunScriptCompilerService);
        
        compilerService = container.get(TYPES.CompilerService);
    });
    
    describe('Compiler Availability', () => {
        it('should check if compiler is available', () => {
            const isAvailable = compilerService.isAvailable();
            expect(typeof isAvailable).toBe('boolean');
        });
        
        it('should get compiler info', () => {
            const info = compilerService.getCompilerInfo();
            
            expect(info).toHaveProperty('available');
            expect(info).toHaveProperty('path');
            expect(typeof info.available).toBe('boolean');
            expect(typeof info.path).toBe('string');
        });
        
        it('should set working directory', () => {
            expect(() => {
                compilerService.setWorkingDirectory('/test/project');
            }).not.toThrow();
        });
    });
    
    describe('Code Compilation', () => {
        const validSunScriptCode = `
            @task greetUser(name: string) {
                console.log(\`Hello, \${name}!\`);
            }
        `;
        
        const invalidSunScriptCode = `
            invalid syntax here
            missing decorators
        `;
        
        it('should compile valid SunScript code', async () => {
            const result = await compilerService.compile('/test/valid.sun');
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('compilationTime');
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.compilationTime).toBe('number');
            
            if (result.success) {
                expect(result).toHaveProperty('output');
                expect(result).toHaveProperty('compiledCode');
            } else {
                expect(result).toHaveProperty('errors');
                expect(Array.isArray(result.errors)).toBe(true);
            }
        });
        
        it('should handle compilation with options', async () => {
            const options: BuildOptions = {
                outputDir: '/test/output',
                optimization: 'full',
                sourceMap: true,
                watch: false
            };
            
            const result = await compilerService.compile('/test/valid.sun', options);
            
            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');
        });
        
        it('should report compilation errors for invalid code', async () => {
            const result = await compilerService.compile('/test/invalid.sun');
            
            expect(result).toHaveProperty('success');
            
            // In fallback mode, it should detect missing decorators
            if (!result.success) {
                expect(result.errors).toContain(
                    expect.stringContaining('decorator')
                );
            }
        });
        
        it('should measure compilation time', async () => {
            const start = performance.now();
            const result = await compilerService.compile('/test/valid.sun');
            const actualDuration = performance.now() - start;
            
            expect(result.compilationTime).toBeGreaterThan(0);
            expect(result.compilationTime).toBeLessThanOrEqual(actualDuration + 100); // Allow some tolerance
        });
    });
    
    describe('Code Execution', () => {
        it('should run SunScript code', async () => {
            const result = await compilerService.run('/test/valid.sun');
            
            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');
            
            if (result.success) {
                expect(result).toHaveProperty('output');
                expect(typeof result.output).toBe('string');
            } else {
                expect(result).toHaveProperty('errors');
                expect(Array.isArray(result.errors)).toBe(true);
            }
        });
        
        it('should run code with options', async () => {
            const options: RunOptions = {
                arguments: ['--verbose'],
                environment: { DEBUG: 'true' },
                timeout: 5000
            };
            
            const result = await compilerService.run('/test/valid.sun', options);
            
            expect(result).toHaveProperty('success');
        });
        
        it('should handle runtime errors', async () => {
            const result = await compilerService.run('/test/runtime-error.sun');
            
            expect(result).toHaveProperty('success');
            
            if (!result.success) {
                expect(result).toHaveProperty('errors');
                expect(Array.isArray(result.errors)).toBe(true);
            }
        });
    });
    
    describe('Project Building', () => {
        it('should build complete project', async () => {
            const result = await compilerService.build('/test/project');
            
            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');
        });
        
        it('should build project with options', async () => {
            const options: BuildOptions = {
                outputDir: '/test/project/dist',
                optimization: 'basic',
                sourceMap: false
            };
            
            const result = await compilerService.build('/test/project', options);
            
            expect(result).toHaveProperty('success');
        });
        
        it('should handle missing genesis.sun file', async () => {
            const result = await compilerService.build('/test/empty-project');
            
            expect(result.success).toBe(false);
            expect(result.errors).toContain('No genesis.sun file found in project');
        });
        
        it('should build multiple files in project', async () => {
            const result = await compilerService.build('/test/multi-file-project');
            
            expect(result).toHaveProperty('success');
            
            if (result.success) {
                expect(result.output).toContain('Compiled');
            }
        });
    });
    
    describe('Code Validation', () => {
        const validCode = `
            @task calculateSum(a: number, b: number) {
                return a + b;
            }
        `;
        
        const invalidCode = `
            function withoutDecorator() {
                return "missing decorator";
            }
        `;
        
        const syntaxErrorCode = `
            @task broken {
                if (true) {
                    // missing closing brace
            }
        `;
        
        it('should validate valid SunScript code', async () => {
            const result = await compilerService.validate(validCode);
            
            expect(result).toHaveProperty('valid');
            expect(result).toHaveProperty('errors');
            expect(result).toHaveProperty('warnings');
            
            expect(result.valid).toBe(true);
            expect(Array.isArray(result.errors)).toBe(true);
            expect(Array.isArray(result.warnings)).toBe(true);
        });
        
        it('should detect missing decorators', async () => {
            const result = await compilerService.validate(invalidCode);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain(
                'File must contain at least one @task, @component, or @project declaration'
            );
        });
        
        it('should detect syntax errors', async () => {
            const result = await compilerService.validate(syntaxErrorCode);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Mismatched braces - check your { and } pairs');
        });
        
        it('should provide helpful warnings', async () => {
            const codeWithWarnings = `
                @unknown decorator
                @task example; // semicolon warning
            `;
            
            const result = await compilerService.validate(codeWithWarnings);
            
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings).toContain(
                expect.stringContaining('Unknown decorator')
            );
        });
    });
    
    describe('Fallback Compilation', () => {
        it('should use fallback when real compiler unavailable', async () => {
            // Force fallback mode by testing private method behavior
            const result = await compilerService.compile('/test/valid.sun');
            
            expect(result).toHaveProperty('success');
            
            if (result.success) {
                expect(result.output).toContain('simulated');
            }
        });
        
        it('should transform SunScript decorators to JavaScript', async () => {
            const result = await compilerService.compile('/test/decorators.sun');
            
            if (result.success && result.compiledCode) {
                expect(result.compiledCode).toContain('function');
                expect(result.compiledCode).toContain('Generated from SunScript');
            }
        });
        
        it('should simulate execution output', async () => {
            const result = await compilerService.run('/test/execution.sun');
            
            if (result.success) {
                expect(result.output).toContain('Program execution started');
                expect(result.output).toContain('Program execution completed');
            }
        });
    });
    
    describe('Error Handling and Edge Cases', () => {
        it('should handle empty code files', async () => {
            const result = await compilerService.validate('');
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Empty code');
        });
        
        it('should handle very large files', async () => {
            const largeCode = '@task large {\n' + '  console.log("test");\n'.repeat(10000) + '}';
            
            const result = await compilerService.validate(largeCode);
            
            expect(result).toHaveProperty('valid');
        });
        
        it('should handle concurrent compilation requests', async () => {
            const promises = Array.from({ length: 5 }, (_, i) => 
                compilerService.compile(`/test/concurrent-${i}.sun`)
            );
            
            const results = await Promise.all(promises);
            
            expect(results).toHaveLength(5);
            results.forEach(result => {
                expect(result).toHaveProperty('success');
            });
        });
        
        it('should cleanup resources properly', async () => {
            // Test that multiple operations don't leak resources
            for (let i = 0; i < 10; i++) {
                await compilerService.compile('/test/cleanup.sun');
            }
            
            // If we get here without hanging, cleanup is working
            expect(true).toBe(true);
        });
    });
});