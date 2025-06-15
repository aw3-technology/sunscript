import { AIProvider } from '../ai/AIProvider';
import { Program, CompilationResult, AIContext } from '../types';
import { ValidatorFactory } from '../validator/ValidatorFactory';
import { Validator, ValidationResult } from '../validator/Validator';

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

    // Get validator for target language
    const validator = ValidatorFactory.getValidator(context.targetLanguage);

    // ADD THIS: Check if target language is HTML
    if (context.targetLanguage === 'html') {
      const htmlResult = await this.generateHTMLPage(ast, context, validator);
      result.code['index'] = htmlResult.code;
      result.metadata.warnings.push(...htmlResult.warnings);
      return result;
    }

    // For non-HTML languages, continue with the existing logic
    for (const node of ast.body) {
      if (node.type === 'FunctionDeclaration') {
        const funcNode = node as any;
        const prompt = this.buildFunctionPrompt(funcNode, context);
        
        try {
          const response = await this.aiProvider.generateCode(prompt, context);
          const cleanedCode = this.cleanGeneratedCode(response.code);
          
          // Validate the generated code
          const validationResult = await validator.validate(
            cleanedCode, 
            `${funcNode.name}.${context.targetLanguage}`
          );
          
          if (validationResult.valid) {
            result.code[funcNode.name] = cleanedCode;
            
            // Add any validation warnings
            if (validationResult.warnings.length > 0) {
              for (const warning of validationResult.warnings) {
                result.metadata.warnings.push({
                  message: `Validation warning in ${funcNode.name}: ${warning.message}`,
                  severity: 'warning'
                });
              }
            }
          } else {
            // Code has syntax errors - try to regenerate with error feedback
            console.log(`Syntax error detected, attempting to fix...`);
            
            const fixPrompt = `${prompt}\n\nThe previous attempt had syntax errors:\n${
              validationResult.errors.map(e => `- Line ${e.line}: ${e.message}`).join('\n')
            }\n\nPlease generate corrected code that fixes these syntax errors.`;
            
            const retryResponse = await this.aiProvider.generateCode(fixPrompt, context);
            const retryCleaned = this.cleanGeneratedCode(retryResponse.code);
            
            // Validate again
            const retryValidation = await validator.validate(
              retryCleaned,
              `${funcNode.name}.${context.targetLanguage}`
            );
            
            if (retryValidation.valid) {
              result.code[funcNode.name] = retryCleaned;
              result.metadata.warnings.push({
                message: `Code for ${funcNode.name} required regeneration due to syntax errors`,
                severity: 'info'
              });
            } else {
              // Still has errors - include the code but warn
              result.code[funcNode.name] = retryCleaned;
              result.metadata.warnings.push({
                message: `Generated code for ${funcNode.name} has syntax errors: ${
                  retryValidation.errors.map(e => e.message).join(', ')
                }`,
                severity: 'error'
              });
            }
          }
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

  // ADD THIS NEW METHOD for HTML generation
  private async generateHTMLPage(ast: Program, context: AIContext, validator: Validator): Promise<{ code: string; warnings: any[] }> {
    const warnings: any[] = [];
    
    // Build a comprehensive prompt for HTML generation
    let prompt = `Generate a complete HTML page that implements the following functionality. 
IMPORTANT: Return ONLY the HTML code starting with <!DOCTYPE html> and ending with </html>. 
Do not include any explanations, comments outside the code, or markdown formatting.

Requirements:\n\n`;
    
    for (const node of ast.body) {
      if (node.type === 'FunctionDeclaration') {
        const funcNode = node as any;
        prompt += `Function "${funcNode.name}":\n`;
        
        for (const expr of funcNode.body) {
          if (expr.type === 'NaturalLanguageExpression') {
            prompt += `- ${expr.text}\n`;
          }
        }
        
        if (funcNode.metadata.aiQuestions && funcNode.metadata.aiQuestions.length > 0) {
          prompt += 'Additional considerations:\n';
          for (const question of funcNode.metadata.aiQuestions) {
            prompt += `- ${question}\n`;
          }
        }
        prompt += '\n';
      }
    }
    
    prompt += `
Create a modern, responsive HTML page that:
1. Has a beautiful, professional design with embedded CSS
2. Implements all the functions with proper UI elements (buttons, forms, etc.)
3. Includes smooth animations and transitions
4. Is fully responsive and works on mobile devices
5. Has proper accessibility features
6. Shows the results in an elegant way on the page (not just console.log)
7. Uses embedded <script> tags for JavaScript functionality
8. Uses embedded <style> tags for CSS styling

Output only the complete HTML code, starting with <!DOCTYPE html>.`;

    try {
      const response = await this.aiProvider.generateCode(prompt, context);
      const cleanedCode = this.cleanGeneratedCode(response.code);
      
      // Validate the HTML
      const validationResult = await validator.validate(cleanedCode, 'index.html');
      
      if (!validationResult.valid) {
        warnings.push({
          message: `HTML validation warnings: ${validationResult.errors.map(e => e.message).join(', ')}`,
          severity: 'warning'
        });
      }
      
      return { code: cleanedCode, warnings };
    } catch (error: any) {
      warnings.push({
        message: `Failed to generate HTML: ${error.message}`,
        severity: 'error'
      });
      return { code: '', warnings };
    }
  }

  private cleanGeneratedCode(code: string): string {
    // First, try to extract code from markdown code blocks
    const codeBlockRegex = /```(?:html|javascript|typescript|python|js|ts|py)?\n([\s\S]*?)```/g;
    const matches = code.match(codeBlockRegex);
    
    if (matches) {
      // Extract code from the first code block
      const cleanedCode = matches[0]
        .replace(/```(?:html|javascript|typescript|python|js|ts|py)?\n/, '')
        .replace(/```$/, '')
        .trim();
      return cleanedCode;
    }
    
    // If no code blocks found, look for HTML tags
    // This handles cases where the AI returns HTML without code blocks
    const htmlMatch = code.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
    if (htmlMatch) {
      return htmlMatch[0].trim();
    }
    
    // If still no match, try to find content between first < and last >
    const tagMatch = code.match(/<[\s\S]*>/);
    if (tagMatch) {
      return tagMatch[0].trim();
    }
    
    // If no patterns found, return as is
    return code.trim();
  }

  private buildFunctionPrompt(node: any, context: AIContext): string {
    let prompt = `Generate a ${context.targetLanguage} function named "${node.name}" that:\n\n`;
    
    for (const expr of node.body) {
      if (expr.type === 'NaturalLanguageExpression') {
        prompt += `- ${expr.text}\n`;
      }
    }
    
    if (node.metadata.aiQuestions && node.metadata.aiQuestions.length > 0) {
      prompt += '\nAdditional considerations:\n';
      for (const question of node.metadata.aiQuestions) {
        prompt += `- ${question}\n`;
      }
    }
    
    prompt += '\nGenerate only the function code, no explanations or markdown formatting. Ensure the code is syntactically correct.';
    
    return prompt;
  }
}