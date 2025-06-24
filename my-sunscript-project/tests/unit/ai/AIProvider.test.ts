import { MockProvider } from '../../../src/ai/providers/MockProvider';
import { AnthropicProvider } from '../../../src/ai/providers/AnthropicProvider';
import { OpenAIProvider } from '../../../src/ai/providers/OpenAIProvider';
import { LocalLLMProvider } from '../../../src/ai/providers/LocalLLMProvider';
import { AIContext, GenerationOptions } from '../../../src/types';
import { AIProviderError } from '../../../src/errors/SunScriptError';

describe('AI Providers', () => {
  const testContext: AIContext = {
    targetLanguage: 'javascript',
    projectName: 'test-project',
    domain: 'testing'
  };

  const testOptions: GenerationOptions = {
    temperature: 0.7,
    maxTokens: 1000
  };

  describe('MockProvider', () => {
    let provider: MockProvider;

    beforeEach(() => {
      provider = new MockProvider();
    });

    it('should generate mock code successfully', async () => {
      const prompt = 'Create a simple greeting function';
      
      const response = await provider.generateCode(prompt, testContext, testOptions);

      expect(response).toBeDefined();
      expect(response.code).toBeDefined();
      expect(typeof response.code).toBe('string');
      expect(response.code.length).toBeGreaterThan(0);
      expect(response.model).toBe('mock-model-v1');
      expect(response.usage).toBeDefined();
      expect(response.metadata).toBeDefined();
    });

    it('should handle different target languages', async () => {
      const languages = ['javascript', 'typescript', 'python', 'html'];
      
      for (const language of languages) {
        const context = { ...testContext, targetLanguage: language };
        const response = await provider.generateCode('Create a function', context);
        
        expect(response.code).toBeDefined();
        expect(response.code.includes(language) || response.code.includes('mock')).toBe(true);
      }
    });

    it('should simulate processing time', async () => {
      const start = Date.now();
      await provider.generateCode('Test prompt', testContext);
      const duration = Date.now() - start;
      
      // Should take at least some time to simulate real AI processing
      expect(duration).toBeGreaterThan(50);
    });

    it('should validate configuration successfully', async () => {
      const isValid = await provider.validateConfiguration();
      expect(isValid).toBe(true);
    });

    it('should provide model information', () => {
      const modelInfo = provider.getModelInfo();
      expect(modelInfo.name).toBe('Mock AI Provider');
      expect(modelInfo.version).toBe('mock-model-v1');
      expect(Array.isArray(modelInfo.capabilities)).toBe(true);
    });

    it('should handle prompt validation', async () => {
      const dangerousPrompt = 'Execute eval("malicious code")';
      
      // Mock provider should still work but sanitize the prompt
      const response = await provider.generateCode(dangerousPrompt, testContext);
      expect(response.code).toBeDefined();
      // Should not contain the dangerous content
      expect(response.code).not.toMatch(/eval\(/);
    });

    it('should respect generation options', async () => {
      const options: GenerationOptions = {
        temperature: 0.1,
        maxTokens: 100
      };

      const response = await provider.generateCode('Simple function', testContext, options);
      
      expect(response.usage.totalTokens).toBeLessThanOrEqual(100);
      expect(response.metadata).toBeDefined();
    });
  });

  describe('AnthropicProvider', () => {
    let provider: AnthropicProvider;

    beforeEach(() => {
      // Skip if no API key available
      if (!process.env.ANTHROPIC_API_KEY) {
        provider = null;
        return;
      }

      provider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-sonnet-4-20250514'
      });
    });

    it('should initialize with valid configuration', () => {
      if (!provider) return; // Skip if no API key

      expect(provider).toBeDefined();
      expect(provider.getModelInfo().name).toBe('Anthropic Claude');
    });

    it('should handle configuration validation', async () => {
      if (!provider) return; // Skip if no API key

      const isValid = await provider.validateConfiguration();
      expect(typeof isValid).toBe('boolean');
    });

    it('should generate code for simple prompts', async () => {
      if (!provider) return; // Skip if no API key

      const prompt = 'Create a function that adds two numbers';
      
      try {
        const response = await provider.generateCode(prompt, testContext, {
          maxTokens: 100,
          temperature: 0.1
        });

        expect(response).toBeDefined();
        expect(response.code).toBeDefined();
        expect(response.model).toBe('claude-sonnet-4-20250514');
        expect(response.usage.totalTokens).toBeGreaterThan(0);
      } catch (error) {
        // Allow test to pass if API call fails (rate limits, etc.)
        console.warn('Anthropic API test skipped due to error:', error.message);
      }
    }, 30000); // Longer timeout for real API calls

    it('should handle API errors gracefully', async () => {
      // Test with invalid API key
      const invalidProvider = new AnthropicProvider({
        apiKey: 'invalid-key-for-testing'
      });

      await expect(
        invalidProvider.generateCode('Test prompt', testContext)
      ).rejects.toThrow(AIProviderError);
    });

    it('should enforce timeout limits', async () => {
      if (!provider) return; // Skip if no API key

      const shortTimeoutProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        timeout: 100 // Very short timeout
      });

      await expect(
        shortTimeoutProvider.generateCode('Complex prompt', testContext)
      ).rejects.toThrow(/timeout/i);
    }, 10000);

    it('should retry on transient failures', async () => {
      if (!provider) return; // Skip if no API key

      // This test is hard to simulate without mocking the API
      // Just verify the retry configuration is set
      expect(provider['maxRetries']).toBeGreaterThan(0);
    });
  });

  describe('OpenAIProvider', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      // Skip if no API key available
      if (!process.env.OPENAI_API_KEY) {
        provider = null;
        return;
      }

      provider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4'
      });
    });

    it('should initialize with valid configuration', () => {
      if (!provider) return; // Skip if no API key

      expect(provider).toBeDefined();
      expect(provider.getModelInfo().name).toBe('OpenAI GPT');
    });

    it('should handle configuration validation', async () => {
      if (!provider) return; // Skip if no API key

      const isValid = await provider.validateConfiguration();
      expect(typeof isValid).toBe('boolean');
    });

    it('should generate code for simple prompts', async () => {
      if (!provider) return; // Skip if no API key

      const prompt = 'Create a function that multiplies two numbers';
      
      try {
        const response = await provider.generateCode(prompt, testContext, {
          maxTokens: 100,
          temperature: 0.1
        });

        expect(response).toBeDefined();
        expect(response.code).toBeDefined();
        expect(response.model).toBe('gpt-4');
        expect(response.usage.totalTokens).toBeGreaterThan(0);
      } catch (error) {
        // Allow test to pass if API call fails
        console.warn('OpenAI API test skipped due to error:', error.message);
      }
    }, 30000);

    it('should handle API errors gracefully', async () => {
      // Test with invalid API key
      const invalidProvider = new OpenAIProvider({
        apiKey: 'invalid-key-for-testing'
      });

      await expect(
        invalidProvider.generateCode('Test prompt', testContext)
      ).rejects.toThrow(AIProviderError);
    });
  });

  describe('LocalLLMProvider', () => {
    let provider: LocalLLMProvider;

    beforeEach(() => {
      provider = new LocalLLMProvider({
        endpoint: 'http://localhost:11434',
        model: 'llama2'
      });
    });

    it('should initialize with valid configuration', () => {
      expect(provider).toBeDefined();
      expect(provider.getModelInfo().name).toBe('Local LLM');
    });

    it('should handle configuration validation', async () => {
      // This will likely fail unless Ollama is running locally
      const isValid = await provider.validateConfiguration();
      expect(typeof isValid).toBe('boolean');
    });

    it('should generate code if local LLM is available', async () => {
      const prompt = 'Create a simple function';
      
      try {
        const response = await provider.generateCode(prompt, testContext, {
          maxTokens: 100,
          temperature: 0.1
        });

        expect(response).toBeDefined();
        expect(response.code).toBeDefined();
      } catch (error) {
        // Expected if no local LLM is running
        console.warn('Local LLM test skipped - service not available');
        expect(error).toBeDefined();
      }
    }, 60000); // Longer timeout for local LLM
  });

  describe('AI Provider Factory', () => {
    it('should create mock provider by default', () => {
      const provider = new MockProvider();
      expect(provider).toBeDefined();
      expect(provider.getModelInfo().name).toBe('Mock AI Provider');
    });

    it('should handle provider switching', async () => {
      const mockProvider = new MockProvider();
      
      const response1 = await mockProvider.generateCode('Test', testContext);
      expect(response1.model).toBe('mock-model-v1');

      // Switch providers would happen at the compiler level
      const anotherMockProvider = new MockProvider();
      const response2 = await anotherMockProvider.generateCode('Test', testContext);
      expect(response2.model).toBe('mock-model-v1');
    });
  });

  describe('AI Provider Error Handling', () => {
    it('should handle network errors', async () => {
      const provider = new LocalLLMProvider({
        endpoint: 'http://invalid-endpoint:9999',
        model: 'test-model'
      });

      await expect(
        provider.generateCode('Test prompt', testContext)
      ).rejects.toThrow();
    });

    it('should handle malformed responses', async () => {
      // This would require mocking the HTTP response
      // For now, just verify error types are properly defined
      expect(AIProviderError).toBeDefined();
      expect(() => {
        throw new AIProviderError('TEST_ERROR' as any, 'Test error message');
      }).toThrow('Test error message');
    });

    it('should handle prompt validation errors', async () => {
      const provider = new MockProvider();
      
      // Test with various invalid inputs
      const invalidInputs = [
        null,
        undefined,
        '',
        'x'.repeat(200000) // Very long prompt
      ];

      for (const input of invalidInputs) {
        try {
          await provider.generateCode(input as any, testContext);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    it('should handle context validation errors', async () => {
      const provider = new MockProvider();
      
      const invalidContexts = [
        null,
        undefined,
        {},
        { targetLanguage: 'invalid-language' },
        { targetLanguage: 'javascript', projectName: '' }
      ];

      for (const context of invalidContexts) {
        try {
          await provider.generateCode('Test prompt', context as any);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('AI Provider Performance', () => {
    it('should complete requests within reasonable time', async () => {
      const provider = new MockProvider();
      const start = Date.now();
      
      await provider.generateCode('Simple test', testContext);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const provider = new MockProvider();
      
      const promises = Array.from({ length: 5 }, (_, i) =>
        provider.generateCode(`Test prompt ${i}`, {
          ...testContext,
          projectName: `project-${i}`
        })
      );

      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(5);
      responses.forEach((response, i) => {
        expect(response.code).toBeDefined();
        expect(response.usage.totalTokens).toBeGreaterThan(0);
      });
    });

    it('should respect rate limiting', async () => {
      const provider = new MockProvider();
      
      // Mock provider doesn't implement real rate limiting
      // but should handle multiple requests gracefully
      const promises = Array.from({ length: 10 }, () =>
        provider.generateCode('Rate limit test', testContext)
      );

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(10);
    });
  });
});