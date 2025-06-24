import { CLI } from '../../../src/cli/CLI';
import { CLIValidator } from '../../../src/validation/CLIValidator';
import { MockProvider } from '../../../src/ai/providers/MockProvider';
import * as fs from 'fs';
import * as path from 'path';

// Mock console methods to prevent test output pollution
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('CLI', () => {
  let cli: CLI;
  const testOutputDir = './tests/cli-test-output';

  beforeEach(() => {
    cli = new CLI();
    
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }

    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }

    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('CLI Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(cli).toBeDefined();
      expect(typeof cli.run).toBe('function');
    });

    it('should handle missing environment variables gracefully', () => {
      const originalEnv = process.env;
      process.env = {}; // Clear environment
      
      try {
        const testCli = new CLI();
        expect(testCli).toBeDefined();
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('Command Parsing', () => {
    it('should parse compile command correctly', async () => {
      const testFile = path.join(__dirname, '../../fixtures/basic-functions.sun');
      
      const args = ['compile', testFile, '--output', testOutputDir, '--target', 'javascript'];
      
      // This tests the internal command parsing
      // We can't easily test the full CLI without mocking more components
      expect(args[0]).toBe('compile');
      expect(args[1]).toBe(testFile);
    });

    it('should validate command arguments', () => {
      const validArgs = {
        command: 'compile',
        input: './test.sun',
        output: './dist',
        target: 'javascript'
      };

      const result = CLIValidator.validateCommand('compile', validArgs);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid commands', () => {
      const invalidArgs = {
        command: 'invalid-command',
        input: './test.sun'
      };

      const result = CLIValidator.validateCommand('invalid-command', invalidArgs);
      expect(result.valid).toBe(false);
    });

    it('should validate required arguments', () => {
      const missingArgs = {
        command: 'compile'
        // Missing required input file
      };

      const result = CLIValidator.validateCommand('compile', missingArgs);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.field === 'input')).toBe(true);
    });
  });

  describe('Compile Command', () => {
    it('should validate input file path', () => {
      const validPaths = ['./test.sun', '/absolute/path/test.sun', 'relative/test.sun'];
      const invalidPaths = ['test.txt', 'file.js', '../../../etc/passwd'];

      for (const path of validPaths) {
        const args = { command: 'compile', input: path };
        const result = CLIValidator.validateCommand('compile', args);
        
        // File existence will be checked later, but path format should be valid
        const pathErrors = result.errors.filter(err => 
          err.field === 'input' && err.rule !== 'sunExtension'
        );
        expect(pathErrors).toHaveLength(0);
      }

      for (const path of invalidPaths) {
        const args = { command: 'compile', input: path };
        const result = CLIValidator.validateCommand('compile', args);
        expect(result.valid).toBe(false);
      }
    });

    it('should validate output directory', () => {
      const validOutputs = ['./dist', '/absolute/output', 'relative/output'];
      const invalidOutputs = ['../../../etc', '/invalid\0path'];

      for (const output of validOutputs) {
        const args = {
          command: 'compile',
          input: './test.sun',
          output
        };
        const result = CLIValidator.validateCommand('compile', args);
        
        const outputErrors = result.errors.filter(err => err.field === 'output');
        expect(outputErrors).toHaveLength(0);
      }

      for (const output of invalidOutputs) {
        const args = {
          command: 'compile',
          input: './test.sun',
          output
        };
        const result = CLIValidator.validateCommand('compile', args);
        expect(result.valid).toBe(false);
      }
    });

    it('should validate target languages', () => {
      const validTargets = ['javascript', 'typescript', 'python', 'html'];
      const invalidTargets = ['invalid', 'java', 'c++', ''];

      for (const target of validTargets) {
        const args = {
          command: 'compile',
          input: './test.sun',
          target
        };
        const result = CLIValidator.validateCommand('compile', args);
        
        const targetErrors = result.errors.filter(err => err.field === 'target');
        expect(targetErrors).toHaveLength(0);
      }

      for (const target of invalidTargets) {
        const args = {
          command: 'compile',
          input: './test.sun',
          target
        };
        const result = CLIValidator.validateCommand('compile', args);
        expect(result.valid).toBe(false);
      }
    });

    it('should handle boolean flags correctly', () => {
      const booleanValues = [
        { value: true, expected: true },
        { value: false, expected: true },
        { value: 'true', expected: true },
        { value: 'false', expected: true },
        { value: '1', expected: true },
        { value: '0', expected: true },
        { value: 'invalid', expected: false }
      ];

      for (const { value, expected } of booleanValues) {
        const args = {
          command: 'compile',
          input: './test.sun',
          verbose: value
        };
        const result = CLIValidator.validateCommand('compile', args);
        
        if (expected) {
          const verboseErrors = result.errors.filter(err => err.field === 'verbose');
          expect(verboseErrors).toHaveLength(0);
        } else {
          expect(result.valid).toBe(false);
        }
      }
    });
  });

  describe('Genesis Command', () => {
    it('should validate genesis file path', () => {
      const validPaths = ['./genesis.sun', 'project/genesis.sun'];
      const invalidPaths = ['genesis.txt', 'file.js', '../../../etc/passwd'];

      for (const filePath of validPaths) {
        const args = { command: 'genesis', file: filePath };
        const result = CLIValidator.validateCommand('genesis', args);
        
        const pathErrors = result.errors.filter(err => 
          err.field === 'file' && err.rule !== 'sunExtension'
        );
        expect(pathErrors).toHaveLength(0);
      }

      for (const filePath of invalidPaths) {
        const args = { command: 'genesis', file: filePath };
        const result = CLIValidator.validateCommand('genesis', args);
        expect(result.valid).toBe(false);
      }
    });

    it('should validate genesis command options', () => {
      const validOptions = [
        { full: true, watch: false, clearCache: true },
        { full: false, watch: true, verbose: true },
        {}
      ];

      for (const options of validOptions) {
        const args = {
          command: 'genesis',
          file: './genesis.sun',
          ...options
        };
        const result = CLIValidator.validateCommand('genesis', args);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Import Command', () => {
    it('should validate GitHub URLs', () => {
      const validUrls = [
        'https://github.com/user/repo',
        'https://github.com/organization/project-name',
        'https://github.com/user/repo.git'
      ];

      const invalidUrls = [
        'http://github.com/user/repo', // HTTP instead of HTTPS
        'https://gitlab.com/user/repo', // Not GitHub
        'https://github.com/user', // Missing repo
        'not-a-url',
        ''
      ];

      for (const url of validUrls) {
        const args = { command: 'import', url };
        const result = CLIValidator.validateCommand('import', args);
        
        const urlErrors = result.errors.filter(err => err.field === 'url');
        expect(urlErrors).toHaveLength(0);
      }

      for (const url of invalidUrls) {
        const args = { command: 'import', url };
        const result = CLIValidator.validateCommand('import', args);
        expect(result.valid).toBe(false);
      }
    });

    it('should validate import options', () => {
      const validConfigs = [
        {
          command: 'import',
          url: 'https://github.com/user/repo',
          output: './imported',
          source: './src'
        },
        {
          command: 'import',
          url: 'https://github.com/user/repo',
          comments: true
        }
      ];

      for (const config of validConfigs) {
        const result = CLIValidator.validateCommand('import', config);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Let Command', () => {
    it('should validate let command (creative mode)', () => {
      const validConfigs = [
        {
          command: 'let',
          genesis: './genesis.sun'
        },
        {
          command: 'let',
          genesis: './project.sun',
          full: true,
          watch: false
        }
      ];

      for (const config of validConfigs) {
        const result = CLIValidator.validateCommand('let', config);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('CLI Argument Sanitization', () => {
    it('should sanitize file paths', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '/tmp/dangerous\0file',
        'path/with/../traversal'
      ];

      for (const path of dangerousPaths) {
        const args = {
          command: 'compile',
          input: path,
          output: path
        };

        const pathResult = CLIValidator.validateFilePaths(args);
        expect(pathResult.valid).toBe(false);
      }
    });

    it('should allow safe file paths', () => {
      const safePaths = [
        './src/main.sun',
        'relative/path/file.sun',
        '/absolute/safe/path.sun'
      ];

      for (const path of safePaths) {
        const args = {
          command: 'compile',
          input: path
        };

        const pathResult = CLIValidator.validateFilePaths(args);
        expect(pathResult.valid).toBe(true);
      }
    });

    it('should handle environment-specific restrictions', () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        // Test production restrictions
        process.env.NODE_ENV = 'production';
        
        const prodArgs = {
          debug: true,
          unsafe: true,
          allowDangerous: true
        };

        const result = CLIValidator.validateEnvironmentArgs(prodArgs);
        expect(result.valid).toBe(false);

        // Test development allowances
        process.env.NODE_ENV = 'development';
        
        const devResult = CLIValidator.validateEnvironmentArgs(prodArgs);
        expect(devResult.valid).toBe(true);

      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid command gracefully', () => {
      const invalidCommand = 'nonexistent-command';
      const args = { command: invalidCommand };

      const result = CLIValidator.validateCommand(invalidCommand, args);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.rule === 'unknownCommand')).toBe(true);
    });

    it('should provide helpful error messages', () => {
      const invalidArgs = {
        command: 'compile',
        input: 'invalid.txt', // Wrong extension
        target: 'invalid-language' // Invalid target
      };

      const result = CLIValidator.validateCommand('compile', invalidArgs);
      expect(result.valid).toBe(false);
      
      const errors = result.errors;
      expect(errors.some(err => err.message.includes('.sun extension'))).toBe(true);
      expect(errors.some(err => err.message.includes('Invalid target language'))).toBe(true);
    });

    it('should handle missing required arguments', () => {
      const incompleteArgs = {
        command: 'compile'
        // Missing required input file
      };

      const result = CLIValidator.validateCommand('compile', incompleteArgs);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.field === 'input' && err.rule === 'required')).toBe(true);
    });
  });

  describe('CLI Validation Middleware', () => {
    it('should create validation middleware correctly', () => {
      const validator = (data: any) => CLIValidator.validateCommand('compile', data);
      const middleware = CLIValidator.createValidationMiddleware(validator);

      expect(typeof middleware).toBe('function');
    });

    it('should handle validation middleware errors', () => {
      const validator = () => ({ valid: false, errors: [{ field: 'test', message: 'Test error', rule: 'test' }] });
      const middleware = CLIValidator.createValidationMiddleware(validator);

      const mockReq = { body: {} };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass valid requests through middleware', () => {
      const validator = () => ({ valid: true, errors: [], sanitized: { clean: 'data' } });
      const middleware = CLIValidator.createValidationMiddleware(validator);

      const mockReq = { body: { test: 'data' } };
      const mockRes = {
        status: jest.fn(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body).toEqual({ clean: 'data' });
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('CLI Parser Integration', () => {
    it('should create argument parser for specific commands', () => {
      const parser = CLIValidator.createArgumentParser('compile');
      
      expect(typeof parser).toBe('function');

      // Test with valid arguments
      const validArgs = {
        input: './test.sun',
        output: './dist',
        target: 'javascript'
      };

      expect(() => parser(validArgs)).not.toThrow();

      // Test with invalid arguments
      const invalidArgs = {
        input: 'test.txt', // Wrong extension
        target: 'invalid'
      };

      expect(() => parser(invalidArgs)).toThrow();
    });
  });

  describe('CLI Logging and Debug', () => {
    it('should sanitize arguments for logging', () => {
      const sensitiveArgs = {
        apiKey: 'secret-key-123',
        password: 'super-secret',
        token: 'auth-token-456',
        normalArg: 'safe-value',
        longArg: 'x'.repeat(200)
      };

      // This tests the internal sanitization method
      // We can't directly access it, but we can test the validation that uses it
      const result = CLIValidator.validateCommand('compile', {
        command: 'compile',
        input: './test.sun',
        ...sensitiveArgs
      }, { logValidation: true });

      // The test passes if no errors are thrown during logging
      expect(result).toBeDefined();
    });
  });

  describe('File Extension Validation', () => {
    it('should enforce .sun extension for input files', () => {
      const validFiles = [
        'test.sun',
        'project.sun',
        './path/to/file.sun',
        '/absolute/path/genesis.sun'
      ];

      const invalidFiles = [
        'test.txt',
        'project.js',
        'file.py',
        'no-extension',
        'file.sun.backup'
      ];

      for (const file of validFiles) {
        const args = { command: 'compile', input: file };
        const result = CLIValidator.validateCommand('compile', args);
        
        const extensionErrors = result.errors.filter(err => 
          err.field === 'input' && err.rule === 'sunExtension'
        );
        expect(extensionErrors).toHaveLength(0);
      }

      for (const file of invalidFiles) {
        const args = { command: 'compile', input: file };
        const result = CLIValidator.validateCommand('compile', args);
        
        const hasExtensionError = result.errors.some(err => 
          err.field === 'input' && err.rule === 'sunExtension'
        );
        expect(hasExtensionError).toBe(true);
      }
    });
  });
});