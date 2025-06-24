import { ConfigValidator } from '../../../src/validation/ConfigValidator';
import { CompilerConfig, TargetLanguage, AIContext, GenerationOptions } from '../../../src/types';
import { MockProvider } from '../../../src/ai/providers/MockProvider';

describe('ConfigValidator', () => {
  describe('Compiler Configuration Validation', () => {
    it('should validate valid compiler config', () => {
      const validConfig: CompilerConfig = {
        targetLanguage: 'javascript' as TargetLanguage,
        outputDir: './dist',
        aiProvider: new MockProvider(),
        verbose: false
      };

      const result = ConfigValidator.validateCompilerConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid target language', () => {
      const invalidConfig = {
        targetLanguage: 'invalid-language',
        outputDir: './dist',
        aiProvider: new MockProvider()
      };

      const result = ConfigValidator.validateCompilerConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.field === 'targetLanguage')).toBe(true);
    });

    it('should reject missing required fields', () => {
      const incompleteConfig = {
        outputDir: './dist'
        // Missing targetLanguage and aiProvider
      };

      const result = ConfigValidator.validateCompilerConfig(incompleteConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.field === 'targetLanguage')).toBe(true);
      expect(result.errors.some(err => err.field === 'aiProvider')).toBe(true);
    });

    it('should validate all supported target languages', () => {
      const languages: TargetLanguage[] = ['javascript', 'typescript', 'python', 'html'];
      
      for (const language of languages) {
        const config = {
          targetLanguage: language,
          outputDir: './dist',
          aiProvider: new MockProvider()
        };

        const result = ConfigValidator.validateCompilerConfig(config);
        expect(result.valid).toBe(true);
      }
    });

    it('should validate output directory paths', () => {
      const validPaths = ['./dist', '/absolute/path', 'relative/path'];
      const invalidPaths = ['../../../etc/passwd', '/invalid/\0/null', ''];

      for (const path of validPaths) {
        const config = {
          targetLanguage: 'javascript' as TargetLanguage,
          outputDir: path,
          aiProvider: new MockProvider()
        };

        const result = ConfigValidator.validateCompilerConfig(config);
        expect(result.valid).toBe(true);
      }

      for (const path of invalidPaths) {
        const config = {
          targetLanguage: 'javascript' as TargetLanguage,
          outputDir: path,
          aiProvider: new MockProvider()
        };

        const result = ConfigValidator.validateCompilerConfig(config);
        expect(result.valid).toBe(false);
      }
    });

    it('should handle unknown fields when not allowed', () => {
      const configWithUnknown = {
        targetLanguage: 'javascript' as TargetLanguage,
        outputDir: './dist',
        aiProvider: new MockProvider(),
        unknownField: 'should-be-rejected'
      };

      const result = ConfigValidator.validateCompilerConfig(configWithUnknown, {
        allowUnknownFields: false
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.field === 'unknownField')).toBe(true);
    });

    it('should allow unknown fields when permitted', () => {
      const configWithUnknown = {
        targetLanguage: 'javascript' as TargetLanguage,
        outputDir: './dist',
        aiProvider: new MockProvider(),
        customField: 'should-be-allowed'
      };

      const result = ConfigValidator.validateCompilerConfig(configWithUnknown, {
        allowUnknownFields: true
      });
      
      expect(result.valid).toBe(true);
    });
  });

  describe('AI Provider Configuration Validation', () => {
    it('should validate valid AI provider config', () => {
      const validConfig = {
        apiKey: 'sk-test-key-1234567890',
        model: 'claude-sonnet-4-20250514',
        maxRetries: 3,
        timeout: 30000
      };

      const result = ConfigValidator.validateAIProviderConfig(validConfig);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid API key format', () => {
      const invalidConfigs = [
        { apiKey: '' }, // Empty key
        { apiKey: 'short' }, // Too short
        { apiKey: 'x'.repeat(250) }, // Too long
      ];

      for (const config of invalidConfigs) {
        const result = ConfigValidator.validateAIProviderConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some(err => err.field === 'apiKey')).toBe(true);
      }
    });

    it('should validate retry and timeout limits', () => {
      const validConfig = {
        maxRetries: 5,
        timeout: 60000
      };

      const result = ConfigValidator.validateAIProviderConfig(validConfig);
      expect(result.valid).toBe(true);

      // Test invalid retry count
      const invalidRetries = { maxRetries: 15 }; // Too high
      const retryResult = ConfigValidator.validateAIProviderConfig(invalidRetries);
      expect(retryResult.valid).toBe(false);

      // Test invalid timeout
      const invalidTimeout = { timeout: 500 }; // Too low
      const timeoutResult = ConfigValidator.validateAIProviderConfig(invalidTimeout);
      expect(timeoutResult.valid).toBe(false);
    });

    it('should validate model names', () => {
      const validModels = [
        'claude-sonnet-4-20250514',
        'gpt-4',
        'gpt-3.5-turbo',
        'llama-2-70b'
      ];

      const invalidModels = [
        '', // Empty
        'invalid/model/name', // Invalid characters
        'x'.repeat(150) // Too long
      ];

      for (const model of validModels) {
        const result = ConfigValidator.validateAIProviderConfig({ model });
        expect(result.valid).toBe(true);
      }

      for (const model of invalidModels) {
        const result = ConfigValidator.validateAIProviderConfig({ model });
        expect(result.valid).toBe(false);
      }
    });

    it('should validate endpoint URLs', () => {
      const validEndpoints = [
        'https://api.anthropic.com',
        'https://api.openai.com',
        'http://localhost:8080'
      ];

      const invalidEndpoints = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        ''
      ];

      for (const endpoint of validEndpoints) {
        const result = ConfigValidator.validateAIProviderConfig({ endpoint });
        expect(result.valid).toBe(true);
      }

      for (const endpoint of invalidEndpoints) {
        const result = ConfigValidator.validateAIProviderConfig({ endpoint });
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('AI Context Validation', () => {
    it('should validate valid AI context', () => {
      const validContext: AIContext = {
        targetLanguage: 'javascript',
        projectName: 'test-project',
        fileName: 'test.js',
        filePath: './src/test.sun',
        domain: 'web-development'
      };

      const result = ConfigValidator.validateAIContext(validContext);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid project names', () => {
      const invalidNames = [
        '', // Empty
        'x'.repeat(150), // Too long
        'invalid@#$%', // Invalid characters
        'project/with/slashes'
      ];

      for (const name of invalidNames) {
        const context = {
          targetLanguage: 'javascript',
          projectName: name,
          domain: 'test'
        };

        const result = ConfigValidator.validateAIContext(context);
        expect(result.valid).toBe(false);
        expect(result.errors.some(err => err.field === 'projectName')).toBe(true);
      }
    });

    it('should validate file paths', () => {
      const validPaths = [
        './src/test.sun',
        '/absolute/path/file.sun',
        'relative/path.sun'
      ];

      const invalidPaths = [
        '../../../etc/passwd',
        '/invalid/\0/null',
        'path/with/../traversal'
      ];

      for (const path of validPaths) {
        const context = {
          targetLanguage: 'javascript',
          projectName: 'test',
          filePath: path,
          domain: 'test'
        };

        const result = ConfigValidator.validateAIContext(context);
        expect(result.valid).toBe(true);
      }

      for (const path of invalidPaths) {
        const context = {
          targetLanguage: 'javascript',
          projectName: 'test',
          filePath: path,
          domain: 'test'
        };

        const result = ConfigValidator.validateAIContext(context);
        expect(result.valid).toBe(false);
      }
    });

    it('should validate requirements array', () => {
      const validRequirements = [
        ['Create a simple function'],
        ['Add error handling', 'Include logging'],
        []
      ];

      const invalidRequirements = [
        'not-an-array',
        [123, 456], // Non-string elements
        ['x'.repeat(600)], // Too long element
        [null, undefined] // Invalid elements
      ];

      for (const requirements of validRequirements) {
        const context = {
          targetLanguage: 'javascript',
          projectName: 'test',
          domain: 'test',
          requirements
        };

        const result = ConfigValidator.validateAIContext(context);
        expect(result.valid).toBe(true);
      }

      for (const requirements of invalidRequirements) {
        const context = {
          targetLanguage: 'javascript',
          projectName: 'test',
          domain: 'test',
          requirements
        };

        const result = ConfigValidator.validateAIContext(context);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('Generation Options Validation', () => {
    it('should validate valid generation options', () => {
      const validOptions: GenerationOptions = {
        temperature: 0.7,
        maxTokens: 4000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: -0.1
      };

      const result = ConfigValidator.validateGenerationOptions(validOptions);
      expect(result.valid).toBe(true);
    });

    it('should validate temperature range', () => {
      const validTemperatures = [0, 0.5, 1.0, 2.0];
      const invalidTemperatures = [-0.1, 2.1, 5.0];

      for (const temp of validTemperatures) {
        const result = ConfigValidator.validateGenerationOptions({ temperature: temp });
        expect(result.valid).toBe(true);
      }

      for (const temp of invalidTemperatures) {
        const result = ConfigValidator.validateGenerationOptions({ temperature: temp });
        expect(result.valid).toBe(false);
      }
    });

    it('should validate token limits', () => {
      const validTokens = [100, 4000, 16384, 100000];
      const invalidTokens = [0, -100, 100001];

      for (const tokens of validTokens) {
        const result = ConfigValidator.validateGenerationOptions({ maxTokens: tokens });
        expect(result.valid).toBe(true);
      }

      for (const tokens of invalidTokens) {
        const result = ConfigValidator.validateGenerationOptions({ maxTokens: tokens });
        expect(result.valid).toBe(false);
      }
    });

    it('should validate penalty ranges', () => {
      const validPenalties = [-2.0, -1.0, 0, 1.0, 2.0];
      const invalidPenalties = [-2.1, 2.1, 5.0];

      for (const penalty of validPenalties) {
        const freqResult = ConfigValidator.validateGenerationOptions({ frequencyPenalty: penalty });
        expect(freqResult.valid).toBe(true);

        const presResult = ConfigValidator.validateGenerationOptions({ presencePenalty: penalty });
        expect(presResult.valid).toBe(true);
      }

      for (const penalty of invalidPenalties) {
        const freqResult = ConfigValidator.validateGenerationOptions({ frequencyPenalty: penalty });
        expect(freqResult.valid).toBe(false);

        const presResult = ConfigValidator.validateGenerationOptions({ presencePenalty: penalty });
        expect(presResult.valid).toBe(false);
      }
    });
  });

  describe('CLI Configuration Validation', () => {
    it('should validate valid CLI config', () => {
      const validConfig = {
        command: 'compile',
        input: './test.sun',
        output: './dist',
        target: 'javascript',
        verbose: true
      };

      const result = ConfigValidator.validateCLIConfig(validConfig);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid commands', () => {
      const invalidCommands = ['invalid-command', '', 'compile-extra'];

      for (const command of invalidCommands) {
        const result = ConfigValidator.validateCLIConfig({ command });
        expect(result.valid).toBe(false);
        expect(result.errors.some(err => err.field === 'command')).toBe(true);
      }
    });

    it('should validate file paths in CLI config', () => {
      const validPaths = ['./test.sun', '/absolute/test.sun'];
      const invalidPaths = ['../../../etc/passwd', '/invalid\0null'];

      for (const path of validPaths) {
        const config = {
          command: 'compile',
          input: path
        };

        const result = ConfigValidator.validateCLIConfig(config);
        expect(result.valid).toBe(true);
      }

      for (const path of invalidPaths) {
        const config = {
          command: 'compile',
          input: path
        };

        const result = ConfigValidator.validateCLIConfig(config);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('Environment Variables Validation', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should validate required environment variables', () => {
      process.env = { NODE_ENV: 'test' };
      
      const result = ConfigValidator.validateEnvironmentVariables();
      expect(result.valid).toBe(true);
    });

    it('should reject missing required environment variables', () => {
      process.env = {}; // No NODE_ENV
      
      const result = ConfigValidator.validateEnvironmentVariables();
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.field === 'NODE_ENV')).toBe(true);
    });

    it('should validate API key formats', () => {
      // Valid API keys
      process.env = {
        NODE_ENV: 'test',
        OPENAI_API_KEY: 'sk-test1234567890abcdef',
        ANTHROPIC_API_KEY: 'sk-ant-test1234567890'
      };

      const result = ConfigValidator.validateEnvironmentVariables();
      expect(result.valid).toBe(true);

      // Invalid API keys
      process.env = {
        NODE_ENV: 'test',
        OPENAI_API_KEY: 'invalid-key',
        ANTHROPIC_API_KEY: 'also-invalid'
      };

      const invalidResult = ConfigValidator.validateEnvironmentVariables();
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate log level values', () => {
      const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
      const invalidLevels = ['INVALID', 'debug', '123'];

      for (const level of validLevels) {
        process.env = {
          NODE_ENV: 'test',
          SUNSCRIPT_LOG_LEVEL: level
        };

        const result = ConfigValidator.validateEnvironmentVariables();
        expect(result.valid).toBe(true);
      }

      for (const level of invalidLevels) {
        process.env = {
          NODE_ENV: 'test',
          SUNSCRIPT_LOG_LEVEL: level
        };

        const result = ConfigValidator.validateEnvironmentVariables();
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('validateAndSanitize Helper', () => {
    it('should return sanitized data on success', () => {
      const config = {
        targetLanguage: 'javascript',
        outputDir: './dist',
        aiProvider: new MockProvider()
      };

      const result = ConfigValidator.validateAndSanitize(
        config,
        ConfigValidator.validateCompilerConfig,
        'Test validation'
      );

      expect(result).toBeDefined();
      expect(result.targetLanguage).toBe('javascript');
    });

    it('should throw SunScriptError on validation failure', () => {
      const invalidConfig = {
        targetLanguage: 'invalid'
      };

      expect(() => {
        ConfigValidator.validateAndSanitize(
          invalidConfig,
          ConfigValidator.validateCompilerConfig,
          'Test validation'
        );
      }).toThrow();
    });
  });

  describe('Validation Rules Fallback', () => {
    it('should handle rule creation errors gracefully', () => {
      // This tests that our fallback rules work if InputValidator.createRules() fails
      const config = {
        targetLanguage: 'javascript',
        outputDir: './dist',
        aiProvider: new MockProvider()
      };

      // Should not throw even if there are rule initialization issues
      const result = ConfigValidator.validateCompilerConfig(config);
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });
  });
});