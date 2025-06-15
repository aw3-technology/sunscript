export function createMockAIProvider() {
  return {
    generateCode: jest.fn().mockResolvedValue({
      code: 'console.log("Hello, World!");',
      model: 'mock',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    }),
    validateConfiguration: jest.fn().mockResolvedValue(true),
    getModelInfo: jest.fn().mockReturnValue({
      name: 'Mock',
      version: '1.0',
      capabilities: ['test']
    })
  };
}
