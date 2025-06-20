import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseJS } from 'acorn';
import { parse as parseTS } from '@typescript-eslint/typescript-estree';
import { AIProvider } from '../ai/AIProvider';

export interface CodeAnalysis {
  language: string;
  moduleName: string;
  isPublic: boolean;
  functions: FunctionAnalysis[];
  classes: ClassAnalysis[];
  imports: ImportAnalysis[];
  exports: ExportAnalysis[];
  dependencies: string[];
  purpose: string;
  patterns: string[];
  complexity: 'low' | 'medium' | 'high';
}

export interface FunctionAnalysis {
  name: string;
  parameters: ParameterAnalysis[];
  returnType?: string;
  purpose: string;
  isAsync: boolean;
  isExported: boolean;
  complexity: 'low' | 'medium' | 'high';
  body: string;
}

export interface ClassAnalysis {
  name: string;
  methods: FunctionAnalysis[];
  properties: PropertyAnalysis[];
  constructor?: FunctionAnalysis;
  purpose: string;
  isExported: boolean;
}

export interface ParameterAnalysis {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface PropertyAnalysis {
  name: string;
  type?: string;
  isPrivate: boolean;
  isStatic: boolean;
}

export interface ImportAnalysis {
  source: string;
  imports: string[];
  isDefault: boolean;
}

export interface ExportAnalysis {
  name: string;
  type: 'function' | 'class' | 'variable' | 'default';
}

export class CodeAnalyzer {
  constructor(private aiProvider: AIProvider) {}

  async analyzeFile(filePath: string): Promise<CodeAnalysis> {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath);
    const fileName = path.basename(filePath, ext);

    let analysis: Partial<CodeAnalysis> = {
      language: this.detectLanguage(ext),
      moduleName: fileName,
      isPublic: await this.isPublicModule(filePath),
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      dependencies: [],
      patterns: [],
      complexity: 'medium'
    };

    // Parse based on language
    switch (analysis.language) {
      case 'javascript':
      case 'typescript':
        analysis = await this.analyzeJavaScript(content, analysis as CodeAnalysis);
        break;
      case 'python':
        analysis = await this.analyzePython(content, analysis as CodeAnalysis);
        break;
      default:
        analysis = await this.analyzeGeneric(content, analysis as CodeAnalysis);
    }

    // Use AI to enhance analysis
    analysis = await this.enhanceWithAI(content, analysis as CodeAnalysis);

    return analysis as CodeAnalysis;
  }

  private detectLanguage(ext: string): string {
    const langMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust'
    };
    
    return langMap[ext] || 'unknown';
  }

  private async isPublicModule(filePath: string): Promise<boolean> {
    const dirName = path.dirname(filePath);
    const fileName = path.basename(filePath);
    
    // Check if it's in a public directory or has export statements
    const publicDirs = ['src', 'lib', 'public', 'api'];
    const isInPublicDir = publicDirs.some(dir => dirName.includes(dir));
    const isIndexFile = fileName.startsWith('index.');
    
    return isInPublicDir || isIndexFile;
  }

  private async analyzeJavaScript(content: string, analysis: CodeAnalysis): Promise<CodeAnalysis> {
    try {
      // Use acorn for basic parsing
      const ast = parseJS(content, {
        ecmaVersion: 2022,
        sourceType: 'module',
        allowImportExportEverywhere: true
      });

      // Extract imports
      analysis.imports = this.extractImports(content);
      analysis.exports = this.extractExports(content);
      analysis.dependencies = analysis.imports.map(imp => imp.source);

      // Extract functions using regex (simple approach)
      analysis.functions = this.extractFunctions(content);
      analysis.classes = this.extractClasses(content);

    } catch (error) {
      // Fall back to regex-based analysis if parsing fails
      analysis = await this.analyzeGeneric(content, analysis);
    }

    return analysis;
  }

  private async analyzePython(content: string, analysis: CodeAnalysis): Promise<CodeAnalysis> {
    // Python analysis using regex patterns
    analysis.imports = this.extractPythonImports(content);
    analysis.functions = this.extractPythonFunctions(content);
    analysis.classes = this.extractPythonClasses(content);
    analysis.dependencies = analysis.imports.map(imp => imp.source);

    return analysis;
  }

  private async analyzeGeneric(content: string, analysis: CodeAnalysis): Promise<CodeAnalysis> {
    // Generic analysis using pattern matching
    analysis.functions = this.extractFunctionsGeneric(content);
    analysis.complexity = this.calculateComplexity(content);
    
    return analysis;
  }

  private async enhanceWithAI(content: string, analysis: CodeAnalysis): Promise<CodeAnalysis> {
    const prompt = `
    Analyze this code and provide insights about its purpose and patterns:

    \`\`\`${analysis.language}
    ${content.slice(0, 2000)} // Truncated for analysis
    \`\`\`

    Please provide:
    1. The main purpose of this module
    2. Architectural patterns used (e.g., MVC, Observer, Factory, etc.)
    3. Overall complexity level (low/medium/high)

    Respond in JSON format:
    {
      "purpose": "description",
      "patterns": ["pattern1", "pattern2"],
      "complexity": "low|medium|high"
    }
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'json',
        maxTokens: 300
      });

      const aiAnalysis = JSON.parse(response.code);
      analysis.purpose = aiAnalysis.purpose;
      analysis.patterns = aiAnalysis.patterns || [];
      analysis.complexity = aiAnalysis.complexity || 'medium';

    } catch (error) {
      // Fallback analysis
      analysis.purpose = `${analysis.language} module with ${analysis.functions.length} functions`;
      analysis.patterns = [];
    }

    return analysis;
  }

  private extractImports(content: string): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];
    
    // ES6 imports
    const importRegex = /import\s+(?:(\w+)|{([^}]+)})\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [, defaultImport, namedImports, source] = match;
      
      imports.push({
        source,
        imports: defaultImport ? [defaultImport] : namedImports.split(',').map(i => i.trim()),
        isDefault: !!defaultImport
      });
    }

    return imports;
  }

  private extractExports(content: string): ExportAnalysis[] {
    const exports: ExportAnalysis[] = [];
    
    // Export function/class patterns
    const exportRegex = /export\s+(?:default\s+)?(function|class|const|let|var)\s+(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      const [, type, name] = match;
      exports.push({
        name,
        type: type === 'function' ? 'function' : type === 'class' ? 'class' : 'variable'
      });
    }

    return exports;
  }

  private extractFunctions(content: string): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];
    
    // Function declaration pattern
    const funcRegex = /(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      const [, asyncKeyword, name, params] = match;
      
      functions.push({
        name,
        parameters: this.parseParameters(params),
        isAsync: !!asyncKeyword,
        isExported: content.includes(`export`) && content.includes(name),
        complexity: 'medium',
        purpose: `Function ${name}`,
        body: this.extractFunctionBody(content, name)
      });
    }

    // Arrow function pattern
    const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>/g;
    while ((match = arrowRegex.exec(content)) !== null) {
      const [, name, asyncKeyword, params] = match;
      
      functions.push({
        name,
        parameters: this.parseParameters(params),
        isAsync: !!asyncKeyword,
        isExported: content.includes(`export`) && content.includes(name),
        complexity: 'medium',
        purpose: `Arrow function ${name}`,
        body: this.extractFunctionBody(content, name)
      });
    }

    return functions;
  }

  private extractClasses(content: string): ClassAnalysis[] {
    const classes: ClassAnalysis[] = [];
    
    const classRegex = /class\s+(\w+)(?:\s+extends\s+\w+)?\s*{/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const [, name] = match;
      
      classes.push({
        name,
        methods: [],
        properties: [],
        constructor: undefined,
        purpose: `Class ${name}`,
        isExported: content.includes(`export`) && content.includes(name)
      });
    }

    return classes;
  }

  private extractPythonImports(content: string): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];
    
    const importRegex = /(?:from\s+(\S+)\s+)?import\s+(.+)/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [, source, imports_] = match;
      
      imports.push({
        source: source || imports_.split(',')[0].trim(),
        imports: imports_.split(',').map(i => i.trim()),
        isDefault: false
      });
    }

    return imports;
  }

  private extractPythonFunctions(content: string): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];
    
    const funcRegex = /(async\s+)?def\s+(\w+)\s*\(([^)]*)\)/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      const [, asyncKeyword, name, params] = match;
      
      functions.push({
        name,
        parameters: this.parseParameters(params),
        isAsync: !!asyncKeyword,
        isExported: true, // Python modules export by default
        complexity: 'medium',
        purpose: `Function ${name}`,
        body: this.extractFunctionBody(content, name)
      });
    }

    return functions;
  }

  private extractPythonClasses(content: string): ClassAnalysis[] {
    const classes: ClassAnalysis[] = [];
    
    const classRegex = /class\s+(\w+)(?:\([^)]*\))?\s*:/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const [, name] = match;
      
      classes.push({
        name,
        methods: [],
        properties: [],
        constructor: undefined,
        purpose: `Class ${name}`,
        isExported: true
      });
    }

    return classes;
  }

  private extractFunctionsGeneric(content: string): FunctionAnalysis[] {
    // Generic function extraction for unknown languages
    const functions: FunctionAnalysis[] = [];
    
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('function') || line.includes('def ') || line.includes('func ')) {
        const match = line.match(/(?:function|def|func)\s+(\w+)/);
        if (match) {
          functions.push({
            name: match[1],
            parameters: [],
            isAsync: false,
            isExported: false,
            complexity: 'medium',
            purpose: `Function ${match[1]}`,
            body: line
          });
        }
      }
    });

    return functions;
  }

  private parseParameters(params: string): ParameterAnalysis[] {
    if (!params.trim()) return [];
    
    return params.split(',').map(param => {
      const trimmed = param.trim();
      const [name, defaultValue] = trimmed.split('=');
      
      return {
        name: name.trim(),
        optional: !!defaultValue,
        defaultValue: defaultValue?.trim()
      };
    });
  }

  private extractFunctionBody(content: string, functionName: string): string {
    // Simple extraction - just return the line containing the function
    const lines = content.split('\n');
    const functionLine = lines.find(line => line.includes(functionName));
    return functionLine?.trim() || '';
  }

  private calculateComplexity(content: string): 'low' | 'medium' | 'high' {
    const lines = content.split('\n').length;
    const complexKeywords = ['if', 'for', 'while', 'switch', 'try', 'catch'];
    const complexityScore = complexKeywords.reduce((score, keyword) => {
      return score + (content.match(new RegExp(keyword, 'g'))?.length || 0);
    }, 0);

    if (lines < 50 && complexityScore < 5) return 'low';
    if (lines < 200 && complexityScore < 15) return 'medium';
    return 'high';
  }
}