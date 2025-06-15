import { AIProvider } from '../ai/AIProvider';
import { Program, CompilationResult, AIContext } from '../types';

export class CodeGenerator {
  constructor(
    private aiProvider: AIProvider,
    private config: any = {}
  ) {}

  async generate(ast: Program, context: AIContext): Promise<CompilationResult> {
    const result: CompilationResult = {
      code: {},
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        targetLanguage: context.targetLanguage,
        optimizations: [],
        warnings: []
      }
    };

    // Process each declaration
    for (const node of ast.body) {
      if (node.type === 'FunctionDeclaration') {
        const funcNode = node as any;
        const prompt = this.buildFunctionPrompt(funcNode, context);
        
        try {
          const response = await this.aiProvider.generateCode(prompt, context);
          result.code[funcNode.name] = response.code;
        } catch (error: any) {
          result.metadata.warnings.push({
            message: `Failed to generate ${funcNode.name}: ${error.message}`,
            severity: 'error'
          });
        }
      }
    }

    return result;
  }

  private buildFunctionPrompt(node: any, context: AIContext): string {
    let prompt = `Generate a ${context.targetLanguage} function named "${node.name}" that:\n\n`;
    
    // Add natural language requirements
    for (const expr of node.body) {
      if (expr.type === 'NaturalLanguageExpression') {
        prompt += `- ${expr.text}\n`;
      }
    }
    
    // Add AI questions as additional context
    if (node.metadata.aiQuestions && node.metadata.aiQuestions.length > 0) {
      prompt += '\nAdditional considerations:\n';
      for (const question of node.metadata.aiQuestions) {
        prompt += `- ${question}\n`;
      }
    }
    
    prompt += '\nGenerate only the function code, no explanations.';
    
    return prompt;
  }
}
