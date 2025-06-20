import * as fs from 'fs/promises';
import * as path from 'path';
import { AIProvider } from '../ai/AIProvider';
import { InputValidator } from '../validation';
import { globalLogger } from '../errors/Logger';
import { LanguageDetector, LanguageInfo } from './LanguageDetector';

export interface EnhancedCodeAnalysis {
  // Basic information
  language: string;
  fileName: string;
  filePath: string;
  
  // Structural analysis
  functions: FunctionAnalysis[];
  classes: ClassAnalysis[];
  interfaces: InterfaceAnalysis[];
  types: TypeAnalysis[];
  
  // Dependency analysis
  imports: ImportAnalysis[];
  exports: ExportAnalysis[];
  dependencies: DependencyInfo[];
  
  // Content analysis
  purpose: string;
  functionality: string[];
  patterns: ArchitecturalPattern[];
  complexity: ComplexityMetrics;
  
  // Quality metrics
  maintainability: number; // 0-100
  testability: number; // 0-100
  documentation: number; // 0-100
  
  // AI insights
  suggestedImprovements: string[];
  securityConcerns: string[];
  performanceTips: string[];
  
  // SunScript conversion hints
  conversionNotes: string[];
  naturalLanguageDescription: string;
}

export interface FunctionAnalysis {
  name: string;
  signature: string;
  parameters: ParameterInfo[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  visibility: 'public' | 'private' | 'protected';
  complexity: number;
  purpose: string;
  dependencies: string[];
  sideEffects: string[];
  pureFunction: boolean;
  testable: boolean;
}

export interface ClassAnalysis {
  name: string;
  type: 'class' | 'abstract' | 'static';
  extends?: string;
  implements: string[];
  methods: FunctionAnalysis[];
  properties: PropertyInfo[];
  constructor?: FunctionAnalysis;
  isExported: boolean;
  purpose: string;
  responsibilities: string[];
  patterns: string[];
}

export interface InterfaceAnalysis {
  name: string;
  methods: MethodSignature[];
  properties: PropertySignature[];
  extends: string[];
  purpose: string;
  usage: string[];
}

export interface TypeAnalysis {
  name: string;
  kind: 'type' | 'enum' | 'union' | 'intersection';
  definition: string;
  usage: string[];
  purpose: string;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
  description?: string;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isReadonly: boolean;
  initialValue?: string;
}

export interface MethodSignature {
  name: string;
  parameters: ParameterInfo[];
  returnType?: string;
  optional: boolean;
}

export interface PropertySignature {
  name: string;
  type?: string;
  optional: boolean;
  readonly: boolean;
}

export interface ImportAnalysis {
  source: string;
  importType: 'default' | 'named' | 'namespace' | 'side-effect';
  imports: string[];
  alias?: string;
  isExternal: boolean;
  framework?: string;
}

export interface ExportAnalysis {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'default';
  isReExport: boolean;
  source?: string;
}

export interface DependencyInfo {
  name: string;
  version?: string;
  type: 'runtime' | 'development' | 'peer';
  purpose: string;
  critical: boolean;
}

export interface ArchitecturalPattern {
  name: string;
  confidence: number;
  evidence: string[];
  benefits: string[];
  concerns: string[];
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  fanOut: number; // Dependencies
  fanIn: number; // Dependents
}

export class EnhancedCodeAnalyzer {
  private languageDetector: LanguageDetector;

  constructor(private aiProvider: AIProvider) {
    this.languageDetector = new LanguageDetector();
  }

  async analyzeFile(filePath: string): Promise<EnhancedCodeAnalysis> {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    // Detect language
    const languageInfo = await this.languageDetector.detectFileLanguage(filePath);
    
    // Validate source code
    const sourceValidation = InputValidator.validateSunScriptSource(content, {
      maxFileSize: 50 * 1024 * 1024, // 50MB for analysis
      allowedConstructs: [],
      blockedPatterns: [],
      requireProjectStructure: false
    });

    if (!sourceValidation.valid) {
      globalLogger.warn('Source code validation issues during analysis', {
        type: 'reverse-compiler',
        filePath,
        issues: sourceValidation.errors
      });
    }

    let analysis: EnhancedCodeAnalysis = {
      language: languageInfo.language,
      fileName,
      filePath,
      functions: [],
      classes: [],
      interfaces: [],
      types: [],
      imports: [],
      exports: [],
      dependencies: [],
      purpose: '',
      functionality: [],
      patterns: [],
      complexity: this.initializeComplexityMetrics(),
      maintainability: 0,
      testability: 0,
      documentation: 0,
      suggestedImprovements: [],
      securityConcerns: [],
      performanceTips: [],
      conversionNotes: [],
      naturalLanguageDescription: ''
    };

    // Perform language-specific analysis
    switch (languageInfo.language) {
      case 'javascript':
      case 'typescript':
        analysis = await this.analyzeJavaScriptTypeScript(content, analysis, languageInfo);
        break;
      case 'python':
        analysis = await this.analyzePython(content, analysis);
        break;
      case 'java':
        analysis = await this.analyzeJava(content, analysis);
        break;
      case 'go':
        analysis = await this.analyzeGo(content, analysis);
        break;
      case 'rust':
        analysis = await this.analyzeRust(content, analysis);
        break;
      default:
        analysis = await this.analyzeGeneric(content, analysis);
    }

    // Enhance with AI analysis
    analysis = await this.enhanceWithAI(content, analysis);

    // Calculate quality metrics
    analysis = this.calculateQualityMetrics(analysis, content);

    // Generate conversion notes
    analysis.conversionNotes = this.generateConversionNotes(analysis);

    return analysis;
  }

  private async analyzeJavaScriptTypeScript(
    content: string,
    analysis: EnhancedCodeAnalysis,
    languageInfo: LanguageInfo
  ): Promise<EnhancedCodeAnalysis> {
    // Extract imports
    analysis.imports = this.extractJSImports(content);
    
    // Extract exports
    analysis.exports = this.extractJSExports(content);
    
    // Extract functions
    analysis.functions = this.extractJSFunctions(content);
    
    // Extract classes
    analysis.classes = this.extractJSClasses(content);
    
    // TypeScript specific analysis
    if (languageInfo.language === 'typescript') {
      analysis.interfaces = this.extractTSInterfaces(content);
      analysis.types = this.extractTSTypes(content);
    }
    
    // Detect patterns
    analysis.patterns = this.detectJSPatterns(content);
    
    // Calculate complexity
    analysis.complexity = this.calculateJSComplexity(content, analysis);
    
    return analysis;
  }

  private async analyzePython(content: string, analysis: EnhancedCodeAnalysis): Promise<EnhancedCodeAnalysis> {
    // Extract imports
    analysis.imports = this.extractPythonImports(content);
    
    // Extract functions
    analysis.functions = this.extractPythonFunctions(content);
    
    // Extract classes
    analysis.classes = this.extractPythonClasses(content);
    
    // Detect patterns
    analysis.patterns = this.detectPythonPatterns(content);
    
    // Calculate complexity
    analysis.complexity = this.calculatePythonComplexity(content, analysis);
    
    return analysis;
  }

  private async analyzeJava(content: string, analysis: EnhancedCodeAnalysis): Promise<EnhancedCodeAnalysis> {
    // Extract imports
    analysis.imports = this.extractJavaImports(content);
    
    // Extract classes and interfaces
    analysis.classes = this.extractJavaClasses(content);
    analysis.interfaces = this.extractJavaInterfaces(content);
    
    // Detect patterns
    analysis.patterns = this.detectJavaPatterns(content);
    
    return analysis;
  }

  private async analyzeGo(content: string, analysis: EnhancedCodeAnalysis): Promise<EnhancedCodeAnalysis> {
    // Extract imports
    analysis.imports = this.extractGoImports(content);
    
    // Extract functions
    analysis.functions = this.extractGoFunctions(content);
    
    // Extract types and interfaces
    analysis.types = this.extractGoTypes(content);
    analysis.interfaces = this.extractGoInterfaces(content);
    
    return analysis;
  }

  private async analyzeRust(content: string, analysis: EnhancedCodeAnalysis): Promise<EnhancedCodeAnalysis> {
    // Extract imports (use statements)
    analysis.imports = this.extractRustImports(content);
    
    // Extract functions
    analysis.functions = this.extractRustFunctions(content);
    
    // Extract structs and traits
    analysis.classes = this.extractRustStructs(content);
    analysis.interfaces = this.extractRustTraits(content);
    
    return analysis;
  }

  private async analyzeGeneric(content: string, analysis: EnhancedCodeAnalysis): Promise<EnhancedCodeAnalysis> {
    // Basic pattern-based analysis for unknown languages
    const lines = content.split('\n');
    const functionKeywords = ['function', 'def', 'func', 'fn', 'method'];
    const classKeywords = ['class', 'struct', 'type', 'interface'];
    
    // Find functions
    lines.forEach((line, index) => {
      for (const keyword of functionKeywords) {
        const regex = new RegExp(`\\b${keyword}\\s+(\\w+)`, 'i');
        const match = line.match(regex);
        if (match) {
          analysis.functions.push({
            name: match[1],
            signature: line.trim(),
            parameters: [],
            isAsync: line.includes('async'),
            isExported: this.isLineExported(line, content),
            visibility: 'public',
            complexity: 1,
            purpose: `Function ${match[1]}`,
            dependencies: [],
            sideEffects: [],
            pureFunction: false,
            testable: true
          });
        }
      }
    });
    
    return analysis;
  }

  private async enhanceWithAI(content: string, analysis: EnhancedCodeAnalysis): Promise<EnhancedCodeAnalysis> {
    // Validate AI prompt
    const truncatedContent = content.slice(0, 3000); // Limit content for AI analysis
    
    const promptValidation = InputValidator.validateAIPrompt(
      `Analyze this ${analysis.language} code for purpose, patterns, and improvements`,
      {
        maxLength: 1000,
        allowCodeBlocks: false,
        blockDangerousPatterns: true
      }
    );

    if (!promptValidation.valid) {
      globalLogger.warn('AI prompt validation failed for code analysis', {
        type: 'reverse-compiler',
        errors: promptValidation.errors
      });
      return analysis;
    }

    const prompt = `
    Analyze this ${analysis.language} code and provide insights:

    \`\`\`${analysis.language}
    ${truncatedContent}
    \`\`\`

    Provide analysis in JSON format:
    {
      "purpose": "Main purpose of this code",
      "functionality": ["feature1", "feature2"],
      "patterns": [{"name": "pattern", "confidence": 85, "evidence": ["evidence1"]}],
      "suggestedImprovements": ["improvement1", "improvement2"],
      "securityConcerns": ["concern1", "concern2"],
      "performanceTips": ["tip1", "tip2"],
      "naturalLanguageDescription": "Plain English description of what this code does"
    }
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'json',
        projectName: 'code-analysis',
        domain: 'software-analysis'
      }, {
        maxTokens: 800,
        temperature: 0.3
      });

      const aiAnalysis = JSON.parse(response.code);
      
      analysis.purpose = aiAnalysis.purpose || 'Unknown purpose';
      analysis.functionality = aiAnalysis.functionality || [];
      analysis.suggestedImprovements = aiAnalysis.suggestedImprovements || [];
      analysis.securityConcerns = aiAnalysis.securityConcerns || [];
      analysis.performanceTips = aiAnalysis.performanceTips || [];
      analysis.naturalLanguageDescription = aiAnalysis.naturalLanguageDescription || '';
      
      // Process patterns
      if (aiAnalysis.patterns && Array.isArray(aiAnalysis.patterns)) {
        analysis.patterns.push(...aiAnalysis.patterns.map((p: any) => ({
          name: p.name || 'Unknown',
          confidence: p.confidence || 50,
          evidence: p.evidence || [],
          benefits: [],
          concerns: []
        })));
      }

    } catch (error) {
      globalLogger.warn('AI analysis failed, using fallback', {
        type: 'reverse-compiler',
        error: (error as Error).message,
        filePath: analysis.filePath
      });
      
      // Fallback analysis
      analysis.purpose = `${analysis.language} module with ${analysis.functions.length} functions and ${analysis.classes.length} classes`;
      analysis.naturalLanguageDescription = this.generateBasicDescription(analysis);
    }

    return analysis;
  }

  // Language-specific extraction methods
  private extractJSImports(content: string): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];
    
    // ES6 imports
    const importRegex = /import\s+(?:(\w+)|{([^}]+)}|(\*\s+as\s+\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [, defaultImport, namedImports, namespaceImport, source] = match;
      
      let importType: 'default' | 'named' | 'namespace' | 'side-effect' = 'side-effect';
      let imports_: string[] = [];
      
      if (defaultImport) {
        importType = 'default';
        imports_ = [defaultImport];
      } else if (namedImports) {
        importType = 'named';
        imports_ = namedImports.split(',').map(i => i.trim());
      } else if (namespaceImport) {
        importType = 'namespace';
        imports_ = [namespaceImport.replace('*', '').replace('as', '').trim()];
      }
      
      imports.push({
        source,
        importType,
        imports: imports_,
        isExternal: !source.startsWith('.'),
        framework: this.detectFrameworkFromImport(source)
      });
    }

    // CommonJS requires
    const requireRegex = /(?:const|let|var)\s+({[^}]+}|\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const [, imported, source] = match;
      
      imports.push({
        source,
        importType: imported.startsWith('{') ? 'named' : 'default',
        imports: imported.startsWith('{') ? 
          imported.slice(1, -1).split(',').map(i => i.trim()) : 
          [imported],
        isExternal: !source.startsWith('.'),
        framework: this.detectFrameworkFromImport(source)
      });
    }
    
    return imports;
  }

  private extractJSExports(content: string): ExportAnalysis[] {
    const exports: ExportAnalysis[] = [];
    
    // Named exports
    const namedExportRegex = /export\s+(?:(?:const|let|var|function|class)\s+(\w+)|{([^}]+)})/g;
    let match;
    
    while ((match = namedExportRegex.exec(content)) !== null) {
      const [, single, multiple] = match;
      
      if (single) {
        exports.push({
          name: single,
          type: this.determineExportType(content, single),
          isReExport: false
        });
      } else if (multiple) {
        const names = multiple.split(',').map(n => n.trim());
        names.forEach(name => {
          exports.push({
            name,
            type: this.determineExportType(content, name),
            isReExport: false
          });
        });
      }
    }
    
    // Default exports
    const defaultExportRegex = /export\s+default\s+(\w+)/g;
    while ((match = defaultExportRegex.exec(content)) !== null) {
      exports.push({
        name: match[1] || 'default',
        type: 'default',
        isReExport: false
      });
    }
    
    return exports;
  }

  private extractJSFunctions(content: string): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];
    
    // Function declarations
    const funcRegex = /(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      const [fullMatch, exported, asyncKeyword, name, params] = match;
      
      functions.push({
        name,
        signature: fullMatch,
        parameters: this.parseJSParameters(params),
        isAsync: !!asyncKeyword,
        isExported: !!exported,
        visibility: 'public',
        complexity: this.calculateFunctionComplexity(content, name),
        purpose: `Function ${name}`,
        dependencies: this.extractFunctionDependencies(content, name),
        sideEffects: this.detectSideEffects(content, name),
        pureFunction: this.isPureFunction(content, name),
        testable: true
      });
    }
    
    // Arrow functions
    const arrowRegex = /(export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>/g;
    while ((match = arrowRegex.exec(content)) !== null) {
      const [fullMatch, exported, name, asyncKeyword, params] = match;
      
      functions.push({
        name,
        signature: fullMatch,
        parameters: this.parseJSParameters(params),
        isAsync: !!asyncKeyword,
        isExported: !!exported,
        visibility: 'public',
        complexity: this.calculateFunctionComplexity(content, name),
        purpose: `Arrow function ${name}`,
        dependencies: [],
        sideEffects: [],
        pureFunction: false,
        testable: true
      });
    }
    
    return functions;
  }

  private extractJSClasses(content: string): ClassAnalysis[] {
    const classes: ClassAnalysis[] = [];
    
    const classRegex = /(export\s+)?(abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*{/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const [, exported, abstract, name, extends_, implements_] = match;
      
      classes.push({
        name,
        type: abstract ? 'abstract' : 'class',
        extends: extends_,
        implements: implements_ ? implements_.split(',').map(i => i.trim()) : [],
        methods: this.extractClassMethods(content, name),
        properties: this.extractClassProperties(content, name),
        isExported: !!exported,
        purpose: `Class ${name}`,
        responsibilities: [],
        patterns: []
      });
    }
    
    return classes;
  }

  private extractTSInterfaces(content: string): InterfaceAnalysis[] {
    const interfaces: InterfaceAnalysis[] = [];
    
    const interfaceRegex = /(export\s+)?interface\s+(\w+)(?:\s+extends\s+([\w,\s]+))?\s*{([^}]*)}/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      const [, exported, name, extends_, body] = match;
      
      interfaces.push({
        name,
        methods: this.parseInterfaceMethods(body),
        properties: this.parseInterfaceProperties(body),
        extends: extends_ ? extends_.split(',').map(e => e.trim()) : [],
        purpose: `Interface ${name}`,
        usage: []
      });
    }
    
    return interfaces;
  }

  private extractTSTypes(content: string): TypeAnalysis[] {
    const types: TypeAnalysis[] = [];
    
    const typeRegex = /(export\s+)?type\s+(\w+)\s*=\s*([^;]+);/g;
    let match;
    
    while ((match = typeRegex.exec(content)) !== null) {
      const [, exported, name, definition] = match;
      
      types.push({
        name,
        kind: this.determineTypeKind(definition),
        definition: definition.trim(),
        usage: [],
        purpose: `Type ${name}`
      });
    }
    
    return types;
  }

  // Python-specific extraction methods
  private extractPythonImports(content: string): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];
    
    const importRegex = /(?:from\s+([\w.]+)\s+)?import\s+([\w\s,*]+)(?:\s+as\s+(\w+))?/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [, from, imports_, alias] = match;
      
      imports.push({
        source: from || imports_.split(',')[0].trim(),
        importType: from ? 'named' : 'default',
        imports: imports_.split(',').map(i => i.trim()),
        alias,
        isExternal: !from?.startsWith('.') && !imports_.startsWith('.'),
        framework: this.detectPythonFramework(from || imports_)
      });
    }
    
    return imports;
  }

  private extractPythonFunctions(content: string): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];
    
    const funcRegex = /(async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      const [fullMatch, asyncKeyword, name, params, returnType] = match;
      
      functions.push({
        name,
        signature: fullMatch,
        parameters: this.parsePythonParameters(params),
        returnType,
        isAsync: !!asyncKeyword,
        isExported: !name.startsWith('_'),
        visibility: name.startsWith('__') ? 'private' : name.startsWith('_') ? 'protected' : 'public',
        complexity: this.calculateFunctionComplexity(content, name),
        purpose: `Function ${name}`,
        dependencies: [],
        sideEffects: [],
        pureFunction: false,
        testable: true
      });
    }
    
    return functions;
  }

  private extractPythonClasses(content: string): ClassAnalysis[] {
    const classes: ClassAnalysis[] = [];
    
    const classRegex = /class\s+(\w+)(?:\(([^)]*)\))?:/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const [, name, parents] = match;
      
      classes.push({
        name,
        type: 'class',
        extends: parents?.split(',')[0]?.trim(),
        implements: [],
        methods: this.extractPythonClassMethods(content, name),
        properties: [],
        isExported: !name.startsWith('_'),
        purpose: `Class ${name}`,
        responsibilities: [],
        patterns: []
      });
    }
    
    return classes;
  }

  // Helper methods for pattern detection
  private detectJSPatterns(content: string): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];
    
    // React patterns
    if (content.includes('React') || content.includes('jsx') || content.includes('useState')) {
      patterns.push({
        name: 'React Component',
        confidence: 85,
        evidence: ['React imports', 'JSX usage', 'Hooks'],
        benefits: ['Component reusability', 'Virtual DOM'],
        concerns: ['Learning curve', 'Bundle size']
      });
    }
    
    // Express patterns
    if (content.includes('express') && content.includes('app.')) {
      patterns.push({
        name: 'Express.js Server',
        confidence: 90,
        evidence: ['Express imports', 'Route handlers'],
        benefits: ['Simple routing', 'Middleware support'],
        concerns: ['Callback complexity', 'Error handling']
      });
    }
    
    return patterns;
  }

  private detectPythonPatterns(content: string): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];
    
    // Django patterns
    if (content.includes('django') || content.includes('models.Model')) {
      patterns.push({
        name: 'Django Framework',
        confidence: 85,
        evidence: ['Django imports', 'Model classes'],
        benefits: ['ORM', 'Admin interface'],
        concerns: ['Monolithic', 'Learning curve']
      });
    }
    
    return patterns;
  }

  // Complexity calculation methods
  private calculateJSComplexity(content: string, analysis: EnhancedCodeAnalysis): ComplexityMetrics {
    const lines = content.split('\n');
    const linesOfCode = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
    
    return {
      cyclomaticComplexity: this.calculateCyclomaticComplexity(content),
      linesOfCode,
      maintainabilityIndex: this.calculateMaintainabilityIndex(content, analysis),
      cognitiveComplexity: this.calculateCognitiveComplexity(content),
      nestingDepth: this.calculateNestingDepth(content),
      fanOut: analysis.imports.length,
      fanIn: 0 // Would need project-wide analysis
    };
  }

  private calculatePythonComplexity(content: string, analysis: EnhancedCodeAnalysis): ComplexityMetrics {
    const lines = content.split('\n');
    const linesOfCode = lines.filter(line => line.trim() && !line.trim().startsWith('#')).length;
    
    return {
      cyclomaticComplexity: this.calculateCyclomaticComplexity(content),
      linesOfCode,
      maintainabilityIndex: this.calculateMaintainabilityIndex(content, analysis),
      cognitiveComplexity: this.calculateCognitiveComplexity(content),
      nestingDepth: this.calculateNestingDepth(content),
      fanOut: analysis.imports.length,
      fanIn: 0
    };
  }

  // Quality metrics calculation
  private calculateQualityMetrics(analysis: EnhancedCodeAnalysis, content: string): EnhancedCodeAnalysis {
    // Maintainability (0-100)
    analysis.maintainability = Math.max(0, Math.min(100, 
      100 - (analysis.complexity.cyclomaticComplexity * 2) - 
      (analysis.complexity.linesOfCode / 10) +
      (analysis.functions.filter(f => f.pureFunction).length * 5)
    ));
    
    // Testability (0-100)
    analysis.testability = Math.max(0, Math.min(100,
      80 - (analysis.complexity.cyclomaticComplexity) +
      (analysis.functions.filter(f => f.testable).length * 5) -
      (analysis.functions.filter(f => f.sideEffects.length > 0).length * 10)
    ));
    
    // Documentation (0-100)
    const commentLines = content.split('\n').filter(line => 
      line.trim().startsWith('//') || 
      line.trim().startsWith('#') || 
      line.includes('/**') ||
      line.includes('"""')
    ).length;
    analysis.documentation = Math.min(100, (commentLines / analysis.complexity.linesOfCode) * 200);
    
    return analysis;
  }

  // Utility methods
  private generateConversionNotes(analysis: EnhancedCodeAnalysis): string[] {
    const notes: string[] = [];
    
    if (analysis.complexity.cyclomaticComplexity > 10) {
      notes.push('Consider breaking down complex functions into smaller, more focused functions');
    }
    
    if (analysis.functions.some(f => f.sideEffects.length > 0)) {
      notes.push('Functions with side effects should be clearly documented in SunScript');
    }
    
    if (analysis.classes.length > 5) {
      notes.push('Multiple classes suggest this module could be split into separate SunScript files');
    }
    
    return notes;
  }

  private generateBasicDescription(analysis: EnhancedCodeAnalysis): string {
    let description = `This ${analysis.language} module`;
    
    if (analysis.functions.length > 0) {
      description += ` contains ${analysis.functions.length} function(s)`;
    }
    
    if (analysis.classes.length > 0) {
      description += ` and ${analysis.classes.length} class(es)`;
    }
    
    description += '. ';
    
    if (analysis.imports.length > 0) {
      description += `It depends on ${analysis.imports.length} external module(s). `;
    }
    
    return description;
  }

  // Initialize default values
  private initializeComplexityMetrics(): ComplexityMetrics {
    return {
      cyclomaticComplexity: 1,
      linesOfCode: 0,
      maintainabilityIndex: 100,
      cognitiveComplexity: 1,
      nestingDepth: 1,
      fanOut: 0,
      fanIn: 0
    };
  }

  // Placeholder implementations for complex analysis methods
  private calculateCyclomaticComplexity(content: string): number {
    const complexityKeywords = ['if', 'else', 'for', 'while', 'case', 'catch', '&&', '||'];
    let complexity = 1; // Base complexity
    
    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  private calculateMaintainabilityIndex(content: string, analysis: EnhancedCodeAnalysis): number {
    // Simplified maintainability index calculation
    const loc = analysis.complexity.linesOfCode;
    const complexity = analysis.complexity.cyclomaticComplexity;
    const functionCount = analysis.functions.length;
    
    return Math.max(0, Math.min(100, 
      171 - 5.2 * Math.log(loc) - 0.23 * complexity - 16.2 * Math.log(functionCount || 1)
    ));
  }

  private calculateCognitiveComplexity(content: string): number {
    // Simplified cognitive complexity
    return this.calculateCyclomaticComplexity(content);
  }

  private calculateNestingDepth(content: string): number {
    const lines = content.split('\n');
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const line of lines) {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      
      currentDepth += openBraces - closeBraces;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
    
    return Math.max(1, maxDepth);
  }

  private calculateFunctionComplexity(content: string, functionName: string): number {
    // Find the function and calculate its complexity
    const functionStart = content.indexOf(functionName);
    if (functionStart === -1) return 1;
    
    // Extract function body (simplified)
    const functionBody = this.extractFunctionBody(content, functionName);
    return this.calculateCyclomaticComplexity(functionBody);
  }

  private extractFunctionBody(content: string, functionName: string): string {
    // Simplified function body extraction
    const lines = content.split('\n');
    const functionLine = lines.findIndex(line => line.includes(functionName));
    
    if (functionLine === -1) return '';
    
    // Return a few lines around the function (simplified)
    return lines.slice(functionLine, functionLine + 10).join('\n');
  }

  // More placeholder implementations
  private parseJSParameters(params: string): ParameterInfo[] {
    if (!params.trim()) return [];
    
    return params.split(',').map(param => {
      const trimmed = param.trim();
      const [name, defaultValue] = trimmed.split('=');
      const [paramName, type] = name.split(':');
      
      return {
        name: paramName.trim(),
        type: type?.trim(),
        optional: !!defaultValue,
        defaultValue: defaultValue?.trim()
      };
    });
  }

  private parsePythonParameters(params: string): ParameterInfo[] {
    if (!params.trim()) return [];
    
    return params.split(',').map(param => {
      const trimmed = param.trim();
      const [name, defaultValue] = trimmed.split('=');
      const [paramName, type] = name.split(':');
      
      return {
        name: paramName.trim(),
        type: type?.trim(),
        optional: !!defaultValue,
        defaultValue: defaultValue?.trim()
      };
    });
  }

  private determineExportType(content: string, name: string): ExportAnalysis['type'] {
    if (content.includes(`function ${name}`)) return 'function';
    if (content.includes(`class ${name}`)) return 'class';
    if (content.includes(`interface ${name}`)) return 'interface';
    if (content.includes(`type ${name}`)) return 'type';
    return 'variable';
  }

  private determineTypeKind(definition: string): TypeAnalysis['kind'] {
    if (definition.includes('|')) return 'union';
    if (definition.includes('&')) return 'intersection';
    if (definition.includes('enum')) return 'enum';
    return 'type';
  }

  private detectFrameworkFromImport(source: string): string | undefined {
    const frameworks = ['react', 'vue', 'angular', 'express', 'fastify', 'koa'];
    return frameworks.find(fw => source.includes(fw));
  }

  private detectPythonFramework(source: string): string | undefined {
    const frameworks = ['django', 'flask', 'fastapi', 'tornado'];
    return frameworks.find(fw => source.includes(fw));
  }

  private isLineExported(line: string, content: string): boolean {
    return line.includes('export') || content.includes(`export ${line.split(/\s+/)[1]}`);
  }

  private extractFunctionDependencies(content: string, functionName: string): string[] {
    // Simplified dependency extraction
    return [];
  }

  private detectSideEffects(content: string, functionName: string): string[] {
    // Simplified side effect detection
    const sideEffects: string[] = [];
    const functionBody = this.extractFunctionBody(content, functionName);
    
    if (functionBody.includes('console.')) sideEffects.push('console output');
    if (functionBody.includes('fetch') || functionBody.includes('axios')) sideEffects.push('network calls');
    if (functionBody.includes('localStorage') || functionBody.includes('sessionStorage')) sideEffects.push('local storage');
    
    return sideEffects;
  }

  private isPureFunction(content: string, functionName: string): boolean {
    const sideEffects = this.detectSideEffects(content, functionName);
    return sideEffects.length === 0;
  }

  // Placeholder methods for class analysis
  private extractClassMethods(content: string, className: string): FunctionAnalysis[] {
    return []; // Simplified implementation
  }

  private extractClassProperties(content: string, className: string): PropertyInfo[] {
    return []; // Simplified implementation
  }

  private parseInterfaceMethods(body: string): MethodSignature[] {
    return []; // Simplified implementation
  }

  private parseInterfaceProperties(body: string): PropertySignature[] {
    return []; // Simplified implementation
  }

  private extractPythonClassMethods(content: string, className: string): FunctionAnalysis[] {
    return []; // Simplified implementation
  }

  // Java-specific extraction methods
  private extractJavaImports(content: string): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];
    const importRegex = /import\s+(?:static\s+)?((?:[\w.]+\.)?[\w*]+)\s*;/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const [, importPath] = match;
      imports.push({
        source: importPath,
        importType: 'default',
        imports: [importPath.split('.').pop() || importPath],
        isExternal: !importPath.startsWith('com.yourcompany'),
        framework: this.detectJavaFramework(importPath)
      });
    }
    return imports;
  }

  private extractJavaClasses(content: string): ClassAnalysis[] {
    const classes: ClassAnalysis[] = [];
    const classRegex = /(public\s+)?(abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*{/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const [, isPublic, isAbstract, name, extends_, implements_] = match;
      classes.push({
        name,
        type: isAbstract ? 'abstract' : 'class',
        extends: extends_,
        implements: implements_ ? implements_.split(',').map(i => i.trim()) : [],
        methods: [],
        properties: [],
        isExported: !!isPublic,
        purpose: `Java class ${name}`,
        responsibilities: [],
        patterns: []
      });
    }
    return classes;
  }

  private extractJavaInterfaces(content: string): InterfaceAnalysis[] {
    const interfaces: InterfaceAnalysis[] = [];
    const interfaceRegex = /(public\s+)?interface\s+(\w+)(?:\s+extends\s+([\w,\s]+))?\s*{([^}]*)}/g;
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      const [, isPublic, name, extends_, body] = match;
      interfaces.push({
        name,
        methods: [],
        properties: [],
        extends: extends_ ? extends_.split(',').map(e => e.trim()) : [],
        purpose: `Java interface ${name}`,
        usage: []
      });
    }
    return interfaces;
  }

  private detectJavaPatterns(content: string): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];
    
    if (content.includes('@SpringBootApplication') || content.includes('springframework')) {
      patterns.push({
        name: 'Spring Boot',
        confidence: 90,
        evidence: ['Spring annotations', 'Spring imports'],
        benefits: ['Dependency injection', 'Auto-configuration'],
        concerns: ['Framework complexity', 'Magic behavior']
      });
    }

    if (content.includes('@Entity') || content.includes('javax.persistence')) {
      patterns.push({
        name: 'JPA/Hibernate',
        confidence: 85,
        evidence: ['JPA annotations', 'Entity classes'],
        benefits: ['ORM mapping', 'Database abstraction'],
        concerns: ['N+1 queries', 'Lazy loading issues']
      });
    }

    return patterns;
  }

  // Go-specific extraction methods
  private extractGoImports(content: string): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];
    const importRegex = /import\s+(?:([\w]+)\s+)?["']([^"']+)["']/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const [, alias, path] = match;
      imports.push({
        source: path,
        importType: 'default',
        imports: [alias || path.split('/').pop() || path],
        alias,
        isExternal: !path.startsWith('.'),
        framework: this.detectGoFramework(path)
      });
    }
    return imports;
  }

  private extractGoFunctions(content: string): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];
    const funcRegex = /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*\(([^)]*)\))?(?:\s+(\w+))?/g;
    let match;

    while ((match = funcRegex.exec(content)) !== null) {
      const [fullMatch, name, params, returnParams, returnType] = match;
      functions.push({
        name,
        signature: fullMatch,
        parameters: this.parseGoParameters(params),
        returnType: returnType || returnParams,
        isAsync: false,
        isExported: name[0] === name[0].toUpperCase(),
        visibility: name[0] === name[0].toUpperCase() ? 'public' : 'private',
        complexity: 1,
        purpose: `Go function ${name}`,
        dependencies: [],
        sideEffects: [],
        pureFunction: false,
        testable: true
      });
    }
    return functions;
  }

  private extractGoTypes(content: string): TypeAnalysis[] {
    const types: TypeAnalysis[] = [];
    const typeRegex = /type\s+(\w+)\s+([^\n]+)/g;
    let match;

    while ((match = typeRegex.exec(content)) !== null) {
      const [, name, definition] = match;
      types.push({
        name,
        kind: definition.includes('struct') ? 'type' : 'type',
        definition: definition.trim(),
        usage: [],
        purpose: `Go type ${name}`
      });
    }
    return types;
  }

  private extractGoInterfaces(content: string): InterfaceAnalysis[] {
    const interfaces: InterfaceAnalysis[] = [];
    const interfaceRegex = /type\s+(\w+)\s+interface\s*{([^}]*)}/g;
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      const [, name, body] = match;
      interfaces.push({
        name,
        methods: [],
        properties: [],
        extends: [],
        purpose: `Go interface ${name}`,
        usage: []
      });
    }
    return interfaces;
  }

  // Rust-specific extraction methods
  private extractRustImports(content: string): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];
    const useRegex = /use\s+([^;]+);/g;
    let match;

    while ((match = useRegex.exec(content)) !== null) {
      const [, path] = match;
      imports.push({
        source: path,
        importType: 'named',
        imports: [path.split('::').pop() || path],
        isExternal: !path.startsWith('crate') && !path.startsWith('self'),
        framework: this.detectRustFramework(path)
      });
    }
    return imports;
  }

  private extractRustFunctions(content: string): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];
    const fnRegex = /(pub\s+)?(async\s+)?fn\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?/g;
    let match;

    while ((match = fnRegex.exec(content)) !== null) {
      const [fullMatch, isPublic, isAsync, name, params, returnType] = match;
      functions.push({
        name,
        signature: fullMatch,
        parameters: this.parseRustParameters(params),
        returnType,
        isAsync: !!isAsync,
        isExported: !!isPublic,
        visibility: isPublic ? 'public' : 'private',
        complexity: 1,
        purpose: `Rust function ${name}`,
        dependencies: [],
        sideEffects: [],
        pureFunction: false,
        testable: true
      });
    }
    return functions;
  }

  private extractRustStructs(content: string): ClassAnalysis[] {
    const structs: ClassAnalysis[] = [];
    const structRegex = /(pub\s+)?struct\s+(\w+)(?:<[^>]*>)?\s*{([^}]*)}/g;
    let match;

    while ((match = structRegex.exec(content)) !== null) {
      const [, isPublic, name, body] = match;
      structs.push({
        name,
        type: 'class',
        implements: [],
        methods: [],
        properties: [],
        isExported: !!isPublic,
        purpose: `Rust struct ${name}`,
        responsibilities: [],
        patterns: []
      });
    }
    return structs;
  }

  private extractRustTraits(content: string): InterfaceAnalysis[] {
    const traits: InterfaceAnalysis[] = [];
    const traitRegex = /(pub\s+)?trait\s+(\w+)\s*{([^}]*)}/g;
    let match;

    while ((match = traitRegex.exec(content)) !== null) {
      const [, isPublic, name, body] = match;
      traits.push({
        name,
        methods: [],
        properties: [],
        extends: [],
        purpose: `Rust trait ${name}`,
        usage: []
      });
    }
    return traits;
  }

  // Framework detection helpers
  private detectJavaFramework(importPath: string): string | undefined {
    if (importPath.includes('springframework')) return 'spring';
    if (importPath.includes('javax.persistence')) return 'jpa';
    if (importPath.includes('junit')) return 'junit';
    return undefined;
  }

  private detectGoFramework(path: string): string | undefined {
    if (path.includes('gin-gonic/gin')) return 'gin';
    if (path.includes('echo')) return 'echo';
    if (path.includes('fiber')) return 'fiber';
    return undefined;
  }

  private detectRustFramework(path: string): string | undefined {
    if (path.includes('tokio')) return 'tokio';
    if (path.includes('actix')) return 'actix';
    if (path.includes('rocket')) return 'rocket';
    return undefined;
  }

  // Parameter parsing helpers
  private parseGoParameters(params: string): ParameterInfo[] {
    if (!params.trim()) return [];
    return params.split(',').map(param => {
      const parts = param.trim().split(' ');
      return {
        name: parts[0],
        type: parts[1],
        optional: false
      };
    });
  }

  private parseRustParameters(params: string): ParameterInfo[] {
    if (!params.trim()) return [];
    return params.split(',').map(param => {
      const [name, type] = param.trim().split(':');
      return {
        name: name?.trim() || '',
        type: type?.trim(),
        optional: false
      };
    });
  }
}