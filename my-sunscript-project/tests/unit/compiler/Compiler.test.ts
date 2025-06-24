import { SunScriptCompiler } from '../../../src/compiler/Compiler';
import { MockProvider } from '../../../src/ai/providers/MockProvider';
import { CompilerConfig, TargetLanguage } from '../../../src/types';
import * as fs from 'fs';
import * as path from 'path';

describe('SunScriptCompiler', () => {
  let compiler: SunScriptCompiler;
  let mockAIProvider: MockProvider;
  let config: CompilerConfig;

  beforeEach(() => {
    mockAIProvider = new MockProvider();
    config = {
      targetLanguage: 'javascript' as TargetLanguage,
      outputDir: './tests/output',
      aiProvider: mockAIProvider,
      verbose: false
    };
    compiler = new SunScriptCompiler(config);
  });

  afterEach(() => {
    // Clean up test output directory
    const outputDir = './tests/output';
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  describe('Configuration Validation', () => {
    it('should throw error when AI provider is missing', () => {
      const invalidConfig = {
        targetLanguage: 'javascript' as TargetLanguage,
        outputDir: './tests/output'
        // Missing aiProvider
      } as CompilerConfig;

      expect(() => new SunScriptCompiler(invalidConfig)).toThrow('AI Provider is required');
    });

    it('should validate target language', () => {
      const invalidConfig = {
        targetLanguage: 'invalid' as TargetLanguage,
        outputDir: './tests/output',
        aiProvider: mockAIProvider
      } as CompilerConfig;

      expect(() => new SunScriptCompiler(invalidConfig)).toThrow();
    });

    it('should validate output directory', () => {
      const invalidConfig = {
        targetLanguage: 'javascript' as TargetLanguage,
        outputDir: '', // Empty output dir
        aiProvider: mockAIProvider
      } as CompilerConfig;

      expect(() => new SunScriptCompiler(invalidConfig)).toThrow();
    });
  });

  describe('Source Code Compilation', () => {
    it('should compile basic function successfully', async () => {
      const source = `function greetUser {
        Create a simple greeting function that takes a name parameter.
        Return a greeting message saying "Hello, [name]!"
      }`;

      const result = await compiler.compile(source, {
        fileName: 'test',
        projectName: 'test-project'
      });

      expect(result).toBeDefined();
      expect(result.code).toBeDefined();
      expect(typeof result.code).toBe('object');
      expect(result.success).toBe(true);
    });

    it('should handle empty source code', async () => {
      await expect(compiler.compile('', { fileName: 'test' }))
        .rejects.toThrow('Source file is empty');
    });

    it('should handle invalid source code', async () => {
      await expect(compiler.compile(null as any, { fileName: 'test' }))
        .rejects.toThrow('Invalid source code: must be a non-empty string');
    });

    it('should validate source code for security issues', async () => {
      const maliciousSource = `function dangerous {
        Execute eval("malicious code").
        Access process.env secrets.
      }`;

      // This should either reject with security error or sanitize the code
      const result = await compiler.compile(maliciousSource, {
        fileName: 'test',
        projectName: 'test-project'
      });

      // Check that dangerous patterns are not in the output
      const codeValues = Object.values(result.code);
      for (const code of codeValues) {
        expect(code).not.toMatch(/eval\(/);
        expect(code).not.toMatch(/process\.env/);
      }
    });
  });

  describe('File Compilation', () => {
    const fixturesDir = path.join(__dirname, '../../fixtures');

    it('should compile file with basic functions', async () => {
      const filePath = path.join(fixturesDir, 'basic-functions.sun');
      
      const result = await compiler.compileFile(filePath);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(Object.keys(result.code).length).toBeGreaterThan(0);
    });

    it('should handle non-existent file', async () => {
      const filePath = path.join(fixturesDir, 'non-existent.sun');
      
      await expect(compiler.compileFile(filePath))
        .rejects.toThrow('File not found');
    });

    it('should validate .sun extension', async () => {
      const filePath = path.join(fixturesDir, 'invalid.txt');
      
      // Create a temporary invalid file
      fs.writeFileSync(filePath, 'test content');
      
      try {
        await expect(compiler.compileFile(filePath))
          .rejects.toThrow('File must have .sun extension');
      } finally {
        // Clean up
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });
  });

  describe('Target Language Support', () => {
    it('should compile to JavaScript', async () => {
      const jsCompiler = new SunScriptCompiler({
        ...config,
        targetLanguage: 'javascript'
      });

      const source = 'function test { Create a simple test function. }';
      const result = await jsCompiler.compile(source, { fileName: 'test' });

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    it('should compile to TypeScript', async () => {
      const tsCompiler = new SunScriptCompiler({
        ...config,
        targetLanguage: 'typescript'
      });

      const source = 'function test { Create a simple test function. }';
      const result = await tsCompiler.compile(source, { fileName: 'test' });

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    it('should compile to HTML', async () => {
      const htmlCompiler = new SunScriptCompiler({
        ...config,
        targetLanguage: 'html'
      });

      const source = `@targets html
      function createPage { Build a simple HTML page with a title. }`;
      const result = await htmlCompiler.compile(source, { fileName: 'test' });

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    it('should compile to Python', async () => {
      const pyCompiler = new SunScriptCompiler({
        ...config,
        targetLanguage: 'python'
      });

      const source = 'function test { Create a simple test function. }';
      const result = await pyCompiler.compile(source, { fileName: 'test' });

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });
  });

  describe('Syntax Mode Support', () => {
    it('should handle flex syntax mode', async () => {
      const source = `@syntax flex

      Create a simple calculator that can add and subtract numbers.
      The calculator should have buttons for numbers 0-9.`;

      const result = await compiler.compile(source, {
        fileName: 'flex-test',
        projectName: 'test-project'
      });

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    it('should handle standard syntax mode', async () => {
      const source = `function calculator {
        Create a calculator with add and subtract functions.
        Include number input validation.
      }`;

      const result = await compiler.compile(source, {
        fileName: 'standard-test',
        projectName: 'test-project'
      });

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle lexer errors gracefully', async () => {
      const source = 'function { invalid syntax here }';
      
      // Should not throw but may produce warnings
      const result = await compiler.compile(source, {
        fileName: 'error-test',
        projectName: 'test-project'
      });

      // Should still attempt compilation even with parsing errors
      expect(result).toBeDefined();
    });

    it('should handle parser errors gracefully', async () => {
      const source = 'invalid sunscript syntax @@@ !!!';
      
      // Should not throw but may produce warnings
      const result = await compiler.compile(source, {
        fileName: 'parse-error-test',
        projectName: 'test-project'
      });

      // Should still attempt compilation even with parsing errors
      expect(result).toBeDefined();
    });

    it('should emit compilation events', async () => {
      const events: string[] = [];
      
      compiler.on('compile:start', () => events.push('start'));
      compiler.on('compile:success', () => events.push('success'));
      compiler.on('compilation:warnings', () => events.push('warnings'));

      const filePath = path.join(__dirname, '../../fixtures/basic-functions.sun');
      await compiler.compileFile(filePath);

      expect(events).toContain('start');
      expect(events).toContain('success');
    });
  });

  describe('Output Generation', () => {
    it('should create output files in correct directory', async () => {
      const filePath = path.join(__dirname, '../../fixtures/basic-functions.sun');
      
      await compiler.compileFile(filePath);

      // Check that output directory was created
      expect(fs.existsSync('./tests/output')).toBe(true);
      
      // Check that some output files were created
      const outputFiles = fs.readdirSync('./tests/output');
      expect(outputFiles.length).toBeGreaterThan(0);
    });

    it('should generate correct file extensions', async () => {
      const jsCompiler = new SunScriptCompiler({
        ...config,
        targetLanguage: 'javascript'
      });

      const filePath = path.join(__dirname, '../../fixtures/basic-functions.sun');
      await jsCompiler.compileFile(filePath);

      const outputFiles = fs.readdirSync('./tests/output');
      const jsFiles = outputFiles.filter(file => file.endsWith('.js'));
      expect(jsFiles.length).toBeGreaterThan(0);
    });

    it('should handle HTML output correctly', async () => {
      const htmlCompiler = new SunScriptCompiler({
        ...config,
        targetLanguage: 'html'
      });

      const filePath = path.join(__dirname, '../../fixtures/html-page.sun');
      await htmlCompiler.compileFile(filePath);

      const outputFiles = fs.readdirSync('./tests/output');
      const htmlFiles = outputFiles.filter(file => file.endsWith('.html'));
      expect(htmlFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Limits', () => {
    it('should handle large source files', async () => {
      // Create a large source file (but not too large for tests)
      const largeFunctions = Array.from({ length: 50 }, (_, i) => 
        `function func${i} { Create function number ${i}. }`
      ).join('\n\n');

      const result = await compiler.compile(largeFunctions, {
        fileName: 'large-test',
        projectName: 'test-project'
      });

      expect(result.success).toBe(true);
      expect(Object.keys(result.code).length).toBeGreaterThan(1);
    });

    it('should enforce file size limits', async () => {
      // Create a very large source file (10MB+)
      const hugeSource = 'function test {\n' + 'Create a simple function.\n'.repeat(500000) + '}';

      await expect(compiler.compile(hugeSource, {
        fileName: 'huge-test',
        projectName: 'test-project'
      })).rejects.toThrow(/exceeds maximum size/);
    });
  });
});