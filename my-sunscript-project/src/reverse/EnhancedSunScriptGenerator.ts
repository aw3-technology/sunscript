import { AIProvider } from '../ai/AIProvider';
import { EnhancedCodeAnalysis, FunctionAnalysis, ClassAnalysis } from './EnhancedCodeAnalyzer';
import { ProjectStructure } from './ReverseCompiler';
import { InputValidator } from '../validation';
import { globalLogger } from '../errors/Logger';

export interface EnhancedGenerationOptions {
  analysis: EnhancedCodeAnalysis;
  originalPath: string;
  projectStructure: ProjectStructure;
  includeComments: boolean;
  detailedAnalysis?: boolean;
}

export class EnhancedSunScriptGenerator {
  constructor(private aiProvider: AIProvider) {}

  async generateSunScript(options: EnhancedGenerationOptions): Promise<string> {
    const { analysis, originalPath, projectStructure, includeComments, detailedAnalysis = false } = options;

    let sunscript = '';

    // Add header comment with enhanced information
    if (includeComments) {
      sunscript += this.generateEnhancedHeader(analysis, originalPath);
    }

    // Add context based on project type and detected patterns
    sunscript += this.generateEnhancedContext(analysis, projectStructure);

    // Generate natural language description
    if (analysis.naturalLanguageDescription) {
      sunscript += `# ${analysis.naturalLanguageDescription}\n\n`;
    }

    // Generate functions with enhanced natural language
    for (const func of analysis.functions) {
      sunscript += await this.generateEnhancedFunction(func, analysis.language);
      sunscript += '\n\n';
    }

    // Generate classes as components with detailed analysis
    for (const cls of analysis.classes) {
      sunscript += await this.generateEnhancedComponent(cls, analysis.language);
      sunscript += '\n\n';
    }

    // Generate interfaces as contracts
    for (const interface_ of analysis.interfaces) {
      sunscript += this.generateInterfaceContract(interface_);
      sunscript += '\n\n';
    }

    // Generate types as definitions
    for (const type of analysis.types) {
      sunscript += this.generateTypeDefinition(type);
      sunscript += '\n\n';
    }

    // Add quality and improvement insights
    if (detailedAnalysis) {
      sunscript += this.generateQualityInsights(analysis);
    }

    // Add AI questions and suggestions for improvement
    sunscript += this.generateEnhancedAIQuestions(analysis);

    return sunscript.trim();
  }

  private generateEnhancedHeader(analysis: EnhancedCodeAnalysis, originalPath: string): string {
    return `# Generated from: ${originalPath}
# Original language: ${analysis.language}
# Purpose: ${analysis.purpose}
# Maintainability: ${analysis.maintainability}/100
# Testability: ${analysis.testability}/100
# Documentation: ${analysis.documentation}/100
# Complexity: ${analysis.complexity.cyclomaticComplexity} (lines: ${analysis.complexity.linesOfCode})

`;
  }

  private generateEnhancedContext(analysis: EnhancedCodeAnalysis, projectStructure: ProjectStructure): string {
    let context = '@context ';
    
    // Base context from project structure
    if (projectStructure.type === 'library') {
      context += 'library development';
    } else if (projectStructure.type === 'component') {
      context += 'component development';
    } else {
      context += 'application development';
    }

    // Add detected patterns and frameworks
    const frameworks = analysis.imports
      .filter(imp => imp.framework)
      .map(imp => imp.framework)
      .filter((fw, index, arr) => arr.indexOf(fw) === index);

    if (frameworks.length > 0) {
      context += ` ${frameworks.join(' ')}`;
    }

    // Add domain-specific context based on patterns
    const patternNames = analysis.patterns.map(p => p.name.toLowerCase());
    if (patternNames.some(p => p.includes('web') || p.includes('api') || p.includes('server'))) {
      context += ' web';
    } else if (patternNames.some(p => p.includes('data') || p.includes('database'))) {
      context += ' data processing';
    } else if (patternNames.some(p => p.includes('ui') || p.includes('component'))) {
      context += ' user interface';
    }

    return context + '\n\n';
  }

  private async generateEnhancedFunction(func: FunctionAnalysis, language: string): Promise<string> {
    const prompt = `
    Convert this ${language} function to natural language SunScript with enhanced understanding:

    Function: ${func.name}
    Signature: ${func.signature}
    Parameters: ${func.parameters.map(p => `${p.name}${p.type ? `: ${p.type}` : ''}${p.optional ? '?' : ''}${p.defaultValue ? ` = ${p.defaultValue}` : ''}`).join(', ')}
    Return Type: ${func.returnType || 'void'}
    Is Async: ${func.isAsync}
    Visibility: ${func.visibility}
    Purpose: ${func.purpose}
    Pure Function: ${func.pureFunction}
    Side Effects: ${func.sideEffects.join(', ')}
    Dependencies: ${func.dependencies.join(', ')}
    Testable: ${func.testable}

    Generate a SunScript function that describes what this function does in clear, natural language.
    Focus on the business logic and user intent rather than technical implementation.
    Use this format:

    function ${func.name} {
        [Clear description of what this function accomplishes]
        [Step by step logic in plain English, focusing on the 'why' not the 'how']
        [Mention any important side effects or dependencies]
        ${func.isAsync ? '[Handle this as an asynchronous operation]' : ''}
        [Return meaningful result to the caller]
    }

    Make it clear, descriptive, and focused on business value.
    `;

    // Validate prompt before sending to AI
    const promptValidation = InputValidator.validateAIPrompt(prompt, {
      maxLength: 2000,
      allowCodeBlocks: true,
      blockDangerousPatterns: true
    });

    if (!promptValidation.valid) {
      globalLogger.warn('AI prompt validation failed for function generation', {
        type: 'reverse-compiler',
        function: func.name,
        errors: promptValidation.errors
      });
      return this.generateEnhancedFunctionFallback(func);
    }

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'sunscript',
        projectName: 'reverse-compilation',
        domain: 'natural-language-programming'
      }, {
        maxTokens: 400,
        temperature: 0.3
      });

      return this.cleanSunScriptCode(response.code);
    } catch (error) {
      globalLogger.warn('AI function generation failed, using fallback', {
        type: 'reverse-compiler',
        function: func.name,
        error: (error as Error).message
      });
      
      return this.generateEnhancedFunctionFallback(func);
    }
  }

  private async generateEnhancedComponent(cls: ClassAnalysis, language: string): Promise<string> {
    const prompt = `
    Convert this ${language} class to a SunScript component with enhanced understanding:

    Class: ${cls.name}
    Type: ${cls.type}
    Extends: ${cls.extends || 'none'}
    Implements: ${cls.implements.join(', ') || 'none'}
    Purpose: ${cls.purpose}
    Responsibilities: ${cls.responsibilities.join(', ')}
    Methods: ${cls.methods.map(m => m.name).join(', ')}
    Properties: ${cls.properties.map(p => p.name).join(', ')}
    Patterns: ${cls.patterns.join(', ')}

    Generate a SunScript component that describes what this class does in natural language.
    Focus on the component's role and responsibilities in the system.
    Use this format:

    component ${cls.name} {
        [Clear description of this component's purpose and role]
        [Describe its main responsibilities and what it manages]
        [Explain key behaviors and how it interacts with other components]
        [Mention important properties and their purposes]
        [Describe main methods and what they accomplish]
    }
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'sunscript',
        projectName: 'reverse-compilation',
        domain: 'component-architecture'
      }, {
        maxTokens: 500,
        temperature: 0.3
      });

      return this.cleanSunScriptCode(response.code);
    } catch (error) {
      return this.generateEnhancedComponentFallback(cls);
    }
  }

  private generateInterfaceContract(interface_: any): string {
    let contract = `contract ${interface_.name} {\n`;
    contract += `    ${interface_.purpose || `define ${interface_.name} contract`}\n`;
    
    if (interface_.methods.length > 0) {
      contract += `    require methods: ${interface_.methods.map((m: any) => m.name).join(', ')}\n`;
    }
    
    if (interface_.properties.length > 0) {
      contract += `    require properties: ${interface_.properties.map((p: any) => p.name).join(', ')}\n`;
    }
    
    if (interface_.extends.length > 0) {
      contract += `    extend contracts: ${interface_.extends.join(', ')}\n`;
    }
    
    contract += `    ensure all requirements are met\n`;
    contract += `}`;
    
    return contract;
  }

  private generateTypeDefinition(type: any): string {
    let definition = `define ${type.name} {\n`;
    definition += `    ${type.purpose || `define ${type.name} type`}\n`;
    definition += `    structure: ${type.definition}\n`;
    
    if (type.usage.length > 0) {
      definition += `    used for: ${type.usage.join(', ')}\n`;
    }
    
    definition += `}`;
    
    return definition;
  }

  private generateQualityInsights(analysis: EnhancedCodeAnalysis): string {
    let insights = '\n# Quality Analysis\n\n';
    
    insights += `## Metrics\n`;
    insights += `- Maintainability: ${analysis.maintainability}/100\n`;
    insights += `- Testability: ${analysis.testability}/100\n`;
    insights += `- Documentation: ${analysis.documentation}/100\n`;
    insights += `- Cyclomatic Complexity: ${analysis.complexity.cyclomaticComplexity}\n`;
    insights += `- Lines of Code: ${analysis.complexity.linesOfCode}\n\n`;
    
    if (analysis.patterns.length > 0) {
      insights += `## Architectural Patterns\n`;
      analysis.patterns.forEach(pattern => {
        insights += `- ${pattern.name} (${pattern.confidence}% confidence)\n`;
        if (pattern.benefits.length > 0) {
          insights += `  Benefits: ${pattern.benefits.join(', ')}\n`;
        }
        if (pattern.concerns.length > 0) {
          insights += `  Concerns: ${pattern.concerns.join(', ')}\n`;
        }
      });
      insights += '\n';
    }
    
    if (analysis.suggestedImprovements.length > 0) {
      insights += `## Suggested Improvements\n`;
      analysis.suggestedImprovements.forEach(improvement => {
        insights += `- ${improvement}\n`;
      });
      insights += '\n';
    }
    
    if (analysis.securityConcerns.length > 0) {
      insights += `## Security Concerns\n`;
      analysis.securityConcerns.forEach(concern => {
        insights += `- ${concern}\n`;
      });
      insights += '\n';
    }
    
    if (analysis.performanceTips.length > 0) {
      insights += `## Performance Tips\n`;
      analysis.performanceTips.forEach(tip => {
        insights += `- ${tip}\n`;
      });
      insights += '\n';
    }
    
    return insights;
  }

  private generateEnhancedAIQuestions(analysis: EnhancedCodeAnalysis): string {
    const questions: string[] = [];

    // Quality-based questions
    if (analysis.maintainability < 60) {
      questions.push('?? How can we improve the maintainability of this code?');
    }
    
    if (analysis.testability < 70) {
      questions.push('?? What would make this code easier to test?');
    }
    
    if (analysis.documentation < 50) {
      questions.push('?? Should we add more documentation to explain the business logic?');
    }

    // Complexity-based questions
    if (analysis.complexity.cyclomaticComplexity > 15) {
      questions.push('?? Should we break this down into smaller, more focused functions?');
    }
    
    if (analysis.complexity.nestingDepth > 4) {
      questions.push('?? Can we reduce the nesting depth to make the logic clearer?');
    }

    // Pattern-based questions
    const hasAsyncFunctions = analysis.functions.some(f => f.isAsync);
    if (hasAsyncFunctions) {
      questions.push('?? How should we handle errors in asynchronous operations?');
    }

    // Security-based questions
    if (analysis.securityConcerns.length > 0) {
      questions.push('?? How can we address the identified security concerns?');
    }

    // Conversion-specific questions
    if (analysis.conversionNotes.length > 0) {
      questions.push('?? Are there any domain-specific considerations for this conversion?');
    }

    // Dependency questions
    if (analysis.dependencies.length > 10) {
      questions.push('?? Should we consider reducing the number of dependencies?');
    }

    // Default question if none others apply
    if (questions.length === 0) {
      questions.push('?? What business rules or constraints should be considered?');
    }

    return questions.length > 0 ? '\n' + questions.join('\n') + '\n' : '';
  }

  private generateEnhancedFunctionFallback(func: FunctionAnalysis): string {
    let description = `function ${func.name} {\n`;
    description += `    ${func.purpose || `perform ${func.name} operation`}\n`;
    
    if (func.parameters.length > 0) {
      const paramDesc = func.parameters.map(p => 
        `${p.name}${p.type ? ` (${p.type})` : ''}${p.optional ? ' [optional]' : ''}`
      ).join(', ');
      description += `    accept parameters: ${paramDesc}\n`;
    }
    
    if (func.isAsync) {
      description += `    handle asynchronous operations\n`;
    }
    
    if (func.sideEffects.length > 0) {
      description += `    note: ${func.sideEffects.join(', ')}\n`;
    }
    
    if (!func.pureFunction) {
      description += `    may have side effects\n`;
    }
    
    description += `    return ${func.returnType || 'the result'}\n`;
    description += `}`;
    
    return description;
  }

  private generateEnhancedComponentFallback(cls: ClassAnalysis): string {
    let description = `component ${cls.name} {\n`;
    description += `    ${cls.purpose || `manage ${cls.name} functionality`}\n`;
    
    if (cls.responsibilities.length > 0) {
      description += `    responsibilities: ${cls.responsibilities.join(', ')}\n`;
    }
    
    if (cls.properties.length > 0) {
      description += `    maintain properties: ${cls.properties.map(p => p.name).join(', ')}\n`;
    }
    
    if (cls.methods.length > 0) {
      description += `    provide methods: ${cls.methods.map(m => m.name).join(', ')}\n`;
    }
    
    if (cls.extends) {
      description += `    extend ${cls.extends} capabilities\n`;
    }
    
    if (cls.implements.length > 0) {
      description += `    implement ${cls.implements.join(', ')} contracts\n`;
    }
    
    description += `    handle all ${cls.name.toLowerCase()} related operations\n`;
    description += `}`;
    
    return description;
  }

  private cleanSunScriptCode(code: string): string {
    // Remove markdown code blocks if present
    code = code.replace(/```[^\n]*\n?/g, '');
    
    // Remove extra whitespace
    code = code.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Ensure proper indentation
    const lines = code.split('\n');
    const cleaned = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('function') || 
          trimmed.startsWith('component') || 
          trimmed.startsWith('contract') || 
          trimmed.startsWith('define')) {
        return trimmed;
      } else if (trimmed && !trimmed.startsWith('??') && !trimmed.startsWith('#')) {
        return line.startsWith('    ') ? line : '    ' + trimmed;
      }
      return line;
    });

    return cleaned.join('\n');
  }
}