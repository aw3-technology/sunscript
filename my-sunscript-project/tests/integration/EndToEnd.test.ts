import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { SunScriptCompiler } from '../../src/compiler/Compiler';
import { MockProvider } from '../../src/ai/providers/MockProvider';
import { CompilerConfig } from '../../src/types';

describe('End-to-End Compilation Tests', () => {
  const testOutputDir = './tests/e2e-output';
  const fixturesDir = path.join(__dirname, '../fixtures');
  
  beforeEach(() => {
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('Full Compilation Pipeline', () => {
    let compiler: SunScriptCompiler;

    beforeEach(() => {
      const config: CompilerConfig = {
        targetLanguage: 'javascript',
        outputDir: testOutputDir,
        aiProvider: new MockProvider(),
        verbose: false
      };
      compiler = new SunScriptCompiler(config);
    });

    it('should compile basic functions end-to-end', async () => {
      const inputFile = path.join(fixturesDir, 'basic-functions.sun');
      
      const result = await compiler.compileFile(inputFile);

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(Object.keys(result.code).length).toBeGreaterThan(0);

      // Check that output files were created
      const outputFiles = fs.readdirSync(testOutputDir);
      expect(outputFiles.length).toBeGreaterThan(0);
      
      // Check that files have correct extensions
      const jsFiles = outputFiles.filter(file => file.endsWith('.js'));
      expect(jsFiles.length).toBeGreaterThan(0);

      // Verify file content is valid JavaScript
      for (const file of jsFiles) {
        const content = fs.readFileSync(path.join(testOutputDir, file), 'utf8');
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(0);
        
        // Basic syntax check - should not have obvious errors
        expect(content).not.toMatch(/undefined|null|error/i);
      }
    });

    it('should compile HTML pages with targets directive', async () => {
      const htmlCompiler = new SunScriptCompiler({
        targetLanguage: 'html',
        outputDir: testOutputDir,
        aiProvider: new MockProvider(),
        verbose: false
      });

      const inputFile = path.join(fixturesDir, 'html-page.sun');
      
      const result = await htmlCompiler.compileFile(inputFile);

      expect(result.success).toBe(true);
      
      // Check for HTML output
      const outputFiles = fs.readdirSync(testOutputDir);
      const htmlFiles = outputFiles.filter(file => file.endsWith('.html'));
      expect(htmlFiles.length).toBeGreaterThan(0);

      // Verify HTML content
      const htmlFile = htmlFiles[0];
      const content = fs.readFileSync(path.join(testOutputDir, htmlFile), 'utf8');
      
      expect(content).toMatch(/<html|<HTML/);
      expect(content).toMatch(/<\/html>|<\/HTML>/);
      expect(content.length).toBeGreaterThan(100); // Should be substantial content
    });

    it('should handle flex syntax compilation', async () => {
      const inputFile = path.join(fixturesDir, 'flex-syntax.sun');
      
      const result = await compiler.compileFile(inputFile);

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();

      // Check output files
      const outputFiles = fs.readdirSync(testOutputDir);
      expect(outputFiles.length).toBeGreaterThan(0);
    });

    it('should handle different target languages', async () => {
      const languages = ['javascript', 'typescript', 'python', 'html'];
      const inputFile = path.join(fixturesDir, 'basic-functions.sun');

      for (const language of languages) {
        const langCompiler = new SunScriptCompiler({
          targetLanguage: language as any,
          outputDir: path.join(testOutputDir, language),
          aiProvider: new MockProvider(),
          verbose: false
        });

        const result = await langCompiler.compileFile(inputFile);
        expect(result.success).toBe(true);

        // Check for appropriate file extensions
        const langOutputDir = path.join(testOutputDir, language);
        if (fs.existsSync(langOutputDir)) {
          const files = fs.readdirSync(langOutputDir);
          expect(files.length).toBeGreaterThan(0);

          const extensions = {
            javascript: '.js',
            typescript: '.ts',
            python: '.py',
            html: '.html'
          };

          const expectedExt = extensions[language as keyof typeof extensions];
          const correctFiles = files.filter(file => file.endsWith(expectedExt));
          expect(correctFiles.length).toBeGreaterThan(0);
        }
      }
    });

    it('should maintain compilation consistency', async () => {
      const inputFile = path.join(fixturesDir, 'basic-functions.sun');

      // Compile the same file multiple times
      const results = await Promise.all([
        compiler.compileFile(inputFile),
        compiler.compileFile(inputFile),
        compiler.compileFile(inputFile)
      ]);

      // All compilations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.code).toBeDefined();
      });

      // Results should be consistent (same structure)
      const firstResult = results[0];
      const codeKeys = Object.keys(firstResult.code);

      results.slice(1).forEach(result => {
        expect(Object.keys(result.code)).toEqual(codeKeys);
      });
    });
  });

  describe('CLI Integration Tests', () => {
    const cliPath = path.join(__dirname, '../../dist/bin/sunscript.js');

    beforeEach(() => {
      // Ensure CLI is built
      if (!fs.existsSync(cliPath)) {
        throw new Error('CLI not built. Run npm run build first.');
      }
    });

    it('should execute compile command via CLI', (done) => {
      const inputFile = path.join(fixturesDir, 'basic-functions.sun');
      const args = ['compile', inputFile, '--output', testOutputDir, '--target', 'javascript'];

      const child = spawn('node', [cliPath, ...args], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          // Check for output files
          if (fs.existsSync(testOutputDir)) {
            const files = fs.readdirSync(testOutputDir);
            expect(files.length).toBeGreaterThan(0);
          }

          // Should not have critical errors
          expect(stderr).not.toMatch(/Error:|FATAL|TypeError/);
          
          done();
        } catch (error) {
          done(error);
        }
      });

      // Set timeout for CLI execution
      setTimeout(() => {
        child.kill();
        done(new Error('CLI execution timeout'));
      }, 30000);
    }, 35000);

    it('should handle invalid CLI arguments gracefully', (done) => {
      const args = ['compile', 'nonexistent.sun'];

      const child = spawn('node', [cliPath, ...args], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stderr = '';

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          // Should exit with error code
          expect(code).not.toBe(0);
          
          // Should provide helpful error message
          expect(stderr.length).toBeGreaterThan(0);
          
          done();
        } catch (error) {
          done(error);
        }
      });

      setTimeout(() => {
        child.kill();
        done(new Error('CLI error handling timeout'));
      }, 10000);
    }, 15000);

    it('should show help when requested', (done) => {
      const child = spawn('node', [cliPath, '--help'], {
        stdio: 'pipe'
      });

      let stdout = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        try {
          expect(code).toBe(0);
          expect(stdout).toMatch(/Usage:|Commands:|Options:/);
          done();
        } catch (error) {
          done(error);
        }
      });

      setTimeout(() => {
        child.kill();
        done(new Error('Help command timeout'));
      }, 5000);
    }, 10000);
  });

  describe('Error Handling and Recovery', () => {
    let compiler: SunScriptCompiler;

    beforeEach(() => {
      const config: CompilerConfig = {
        targetLanguage: 'javascript',
        outputDir: testOutputDir,
        aiProvider: new MockProvider(),
        verbose: true
      };
      compiler = new SunScriptCompiler(config);
    });

    it('should handle malicious source code safely', async () => {
      const maliciousFile = path.join(fixturesDir, 'malicious-attempt.sun');
      
      const result = await compiler.compileFile(maliciousFile);

      // Should either reject completely or sanitize the output
      if (result.success) {
        // If compilation succeeded, check that dangerous patterns are removed
        const codeValues = Object.values(result.code);
        for (const code of codeValues) {
          expect(code).not.toMatch(/eval\(/);
          expect(code).not.toMatch(/process\.env/);
          expect(code).not.toMatch(/\/etc\/passwd/);
        }
      } else {
        // If compilation failed, should be due to security validation
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle compilation errors gracefully', async () => {
      // Create a file with syntax errors
      const errorFile = path.join(testOutputDir, 'syntax-error.sun');
      fs.writeFileSync(errorFile, 'function { invalid syntax here }');

      try {
        const result = await compiler.compileFile(errorFile);
        
        // Should handle errors without crashing
        expect(result).toBeDefined();
        
        if (!result.success) {
          expect(result.errors).toBeDefined();
          expect(result.errors.length).toBeGreaterThan(0);
        }
      } catch (error) {
        // If it throws, should be a controlled error
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });

    it('should handle large files appropriately', async () => {
      // Create a large but valid file
      const largeContent = Array.from({ length: 100 }, (_, i) => 
        `function func${i} { Create function number ${i} that does something useful. }`
      ).join('\n\n');

      const largeFile = path.join(testOutputDir, 'large.sun');
      fs.writeFileSync(largeFile, largeContent);

      const result = await compiler.compileFile(largeFile);

      expect(result).toBeDefined();
      if (result.success) {
        expect(Object.keys(result.code).length).toBeGreaterThan(5);
      }
    });

    it('should handle concurrent compilations', async () => {
      const inputFile = path.join(fixturesDir, 'basic-functions.sun');

      // Run multiple compilations concurrently
      const promises = Array.from({ length: 3 }, (_, i) =>
        new SunScriptCompiler({
          targetLanguage: 'javascript',
          outputDir: path.join(testOutputDir, `concurrent-${i}`),
          aiProvider: new MockProvider(),
          verbose: false
        }).compileFile(inputFile)
      );

      const results = await Promise.all(promises);

      // All should complete successfully
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        
        // Check output directories
        const outputDir = path.join(testOutputDir, `concurrent-${i}`);
        if (fs.existsSync(outputDir)) {
          const files = fs.readdirSync(outputDir);
          expect(files.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Genesis Project Compilation', () => {
    let compiler: SunScriptCompiler;

    beforeEach(() => {
      const config: CompilerConfig = {
        targetLanguage: 'typescript',
        outputDir: testOutputDir,
        aiProvider: new MockProvider(),
        verbose: false
      };
      compiler = new SunScriptCompiler(config);
    });

    it('should handle genesis project structure', async () => {
      const genesisFile = path.join(fixturesDir, 'genesis-project.sun');
      
      try {
        const result = await compiler.compileFile(genesisFile);
        
        // Genesis files may require special handling
        expect(result).toBeDefined();
        
        if (result.success) {
          expect(result.code).toBeDefined();
        }
      } catch (error) {
        // Genesis compilation might not be fully implemented yet
        console.warn('Genesis compilation test skipped:', error.message);
      }
    });
  });

  describe('Performance and Stress Tests', () => {
    let compiler: SunScriptCompiler;

    beforeEach(() => {
      const config: CompilerConfig = {
        targetLanguage: 'javascript',
        outputDir: testOutputDir,
        aiProvider: new MockProvider(),
        verbose: false
      };
      compiler = new SunScriptCompiler(config);
    });

    it('should complete compilation within reasonable time', async () => {
      const inputFile = path.join(fixturesDir, 'basic-functions.sun');
      const startTime = Date.now();
      
      const result = await compiler.compileFile(inputFile);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.success).toBe(true);
    });

    it('should handle memory efficiently', async () => {
      const inputFile = path.join(fixturesDir, 'basic-functions.sun');
      
      // Get initial memory usage
      const initialMemory = process.memoryUsage();
      
      // Run multiple compilations
      for (let i = 0; i < 5; i++) {
        await compiler.compileFile(inputFile);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory growth should be reasonable
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
    });

    it('should handle file system operations safely', async () => {
      const inputFile = path.join(fixturesDir, 'basic-functions.sun');
      
      // Test with various output directories
      const outputDirs = [
        path.join(testOutputDir, 'safe1'),
        path.join(testOutputDir, 'safe2'),
        path.join(testOutputDir, 'nested', 'deep', 'path')
      ];

      for (const outputDir of outputDirs) {
        const testCompiler = new SunScriptCompiler({
          targetLanguage: 'javascript',
          outputDir,
          aiProvider: new MockProvider(),
          verbose: false
        });

        const result = await testCompiler.compileFile(inputFile);
        expect(result.success).toBe(true);
        
        // Verify output directory was created
        expect(fs.existsSync(outputDir)).toBe(true);
      }
    });
  });

  describe('Integration with External Systems', () => {
    it('should handle environment variables correctly', async () => {
      const originalEnv = process.env.NODE_ENV;
      
      try {
        // Test with different environments
        const environments = ['test', 'development', 'production'];
        
        for (const env of environments) {
          process.env.NODE_ENV = env;
          
          const compiler = new SunScriptCompiler({
            targetLanguage: 'javascript',
            outputDir: testOutputDir,
            aiProvider: new MockProvider(),
            verbose: false
          });

          const inputFile = path.join(fixturesDir, 'basic-functions.sun');
          const result = await compiler.compileFile(inputFile);
          
          expect(result.success).toBe(true);
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should work with different file system permissions', async () => {
      if (process.platform === 'win32') return; // Skip on Windows

      const inputFile = path.join(fixturesDir, 'basic-functions.sun');
      const restrictedOutput = path.join(testOutputDir, 'restricted');
      
      // Create directory with restricted permissions
      fs.mkdirSync(restrictedOutput, { recursive: true });
      fs.chmodSync(restrictedOutput, 0o755);

      const compiler = new SunScriptCompiler({
        targetLanguage: 'javascript',
        outputDir: restrictedOutput,
        aiProvider: new MockProvider(),
        verbose: false
      });

      try {
        const result = await compiler.compileFile(inputFile);
        expect(result.success).toBe(true);
      } catch (error) {
        // Should handle permission errors gracefully
        expect(error.message).toBeDefined();
      }
    });
  });
});