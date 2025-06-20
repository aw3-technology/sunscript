import { AIProvider } from '../ai/AIProvider';
import { CodeAnalysis, FunctionAnalysis, ClassAnalysis } from './CodeAnalyzer';
import { ProjectStructure } from './ReverseCompiler';

export interface GenerationOptions {
  analysis: CodeAnalysis;
  originalPath: string;
  projectStructure: ProjectStructure;
  includeComments: boolean;
}

export class SunScriptGenerator {
  constructor(private aiProvider: AIProvider) {}

  async generateSunScript(options: GenerationOptions): Promise<string> {
    const { analysis, originalPath, projectStructure, includeComments } = options;

    let sunscript = '';

    // Add header comment
    if (includeComments) {
      sunscript += this.generateHeader(analysis, originalPath);
    }

    // Add context based on project type
    sunscript += this.generateContext(analysis, projectStructure);

    // Generate functions
    for (const func of analysis.functions) {
      sunscript += await this.generateFunction(func, analysis.language);
      sunscript += '\n\n';
    }

    // Generate classes as components
    for (const cls of analysis.classes) {
      sunscript += await this.generateComponent(cls, analysis.language);
      sunscript += '\n\n';
    }

    // Add AI questions for clarification
    sunscript += this.generateAIQuestions(analysis);

    return sunscript.trim();
  }

  private generateHeader(analysis: CodeAnalysis, originalPath: string): string {
    return `# Generated from: ${originalPath}
# Original language: ${analysis.language}
# Purpose: ${analysis.purpose}
# Complexity: ${analysis.complexity}

`;
  }

  private generateContext(analysis: CodeAnalysis, projectStructure: ProjectStructure): string {
    // Determine context based on project type and analysis
    let context = '@context ';
    
    if (projectStructure.type === 'library') {
      context += 'library development';
    } else if (projectStructure.type === 'component') {
      context += 'component development';
    } else {
      context += 'application development';
    }

    // Add specific domain if detectable
    const patterns = analysis.patterns.join(' ').toLowerCase();
    if (patterns.includes('web') || patterns.includes('api')) {
      context += ' web';
    } else if (patterns.includes('data') || patterns.includes('database')) {
      context += ' data processing';
    } else if (patterns.includes('ui') || patterns.includes('component')) {
      context += ' user interface';
    }

    return context + '\n\n';
  }

  private async generateFunction(func: FunctionAnalysis, language: string): Promise<string> {
    const prompt = `
    Convert this ${language} function to natural language SunScript:

    Function: ${func.name}
    Parameters: ${func.parameters.map(p => `${p.name}${p.type ? `: ${p.type}` : ''}`).join(', ')}
    Is Async: ${func.isAsync}
    Purpose: ${func.purpose}
    Body: ${func.body}

    Generate a SunScript function that describes what this function does in natural language.
    Use this format:

    function ${func.name} {
        [natural language description of what the function does]
        [step by step logic in plain English]
    }

    Make it clear and descriptive. Include parameter handling and return behavior.
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'sunscript',
        maxTokens: 300,
        context: 'Convert code to natural language'
      });

      return this.cleanSunScriptCode(response.code);
    } catch (error) {
      // Fallback generation
      return this.generateFunctionFallback(func);
    }
  }

  private async generateComponent(cls: ClassAnalysis, language: string): Promise<string> {
    const prompt = `
    Convert this ${language} class to a SunScript component:

    Class: ${cls.name}
    Purpose: ${cls.purpose}
    Methods: ${cls.methods.map(m => m.name).join(', ')}
    Properties: ${cls.properties.map(p => p.name).join(', ')}

    Generate a SunScript component that describes what this class does.
    Use this format:

    component ${cls.name} {
        [natural language description of the component's purpose]
        [describe its main responsibilities]
        [list key behaviors and methods]
    }
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'sunscript',
        maxTokens: 400,
        context: 'Convert class to component'
      });

      return this.cleanSunScriptCode(response.code);
    } catch (error) {
      // Fallback generation
      return this.generateComponentFallback(cls);
    }
  }

  private generateFunctionFallback(func: FunctionAnalysis): string {
    let description = `function ${func.name} {\n`;
    description += `    ${func.purpose || `perform ${func.name} operation`}\n`;
    
    if (func.parameters.length > 0) {
      description += `    accept parameters: ${func.parameters.map(p => p.name).join(', ')}\n`;
    }
    
    if (func.isAsync) {
      description += `    handle asynchronous operations\n`;
    }
    
    description += `    return the result of the operation\n`;
    description += `}`;
    
    return description;
  }

  private generateComponentFallback(cls: ClassAnalysis): string {
    let description = `component ${cls.name} {\n`;
    description += `    ${cls.purpose || `manage ${cls.name} functionality`}\n`;
    
    if (cls.properties.length > 0) {
      description += `    maintain properties: ${cls.properties.map(p => p.name).join(', ')}\n`;
    }
    
    if (cls.methods.length > 0) {
      description += `    provide methods: ${cls.methods.map(m => m.name).join(', ')}\n`;
    }
    
    description += `    handle all ${cls.name.toLowerCase()} related operations\n`;
    description += `}`;
    
    return description;
  }

  private generateAIQuestions(analysis: CodeAnalysis): string {
    const questions: string[] = [];

    // Add questions based on complexity
    if (analysis.complexity === 'high') {
      questions.push('?? should we break this down into smaller, more manageable functions?');
    }

    // Add questions based on patterns
    if (analysis.patterns.includes('async')) {
      questions.push('?? should we add error handling for async operations?');
    }

    if (analysis.dependencies.length > 5) {
      questions.push('?? should we reduce the number of dependencies?');
    }

    if (analysis.functions.length > 10) {
      questions.push('?? should this module be split into multiple files?');
    }

    // Add questions based on missing information
    const hasTests = analysis.dependencies.some(dep => 
      dep.includes('test') || dep.includes('jest') || dep.includes('mocha')
    );
    
    if (!hasTests) {
      questions.push('?? should we add unit tests for these functions?');
    }

    if (questions.length === 0) {
      questions.push('?? are there any edge cases we should handle?');
    }

    return questions.length > 0 ? '\n' + questions.join('\n') : '';
  }

  private cleanSunScriptCode(code: string): string {
    // Remove markdown code blocks if present
    code = code.replace(/```[\w]*\n?/g, '');
    
    // Remove extra whitespace
    code = code.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Ensure proper indentation
    const lines = code.split('\n');
    const cleaned = lines.map(line => {
      if (line.trim().startsWith('function') || line.trim().startsWith('component')) {
        return line.trim();
      } else if (line.trim() && !line.trim().startsWith('??')) {
        return line.startsWith('    ') ? line : '    ' + line.trim();
      }
      return line;
    });

    return cleaned.join('\n');
  }
}