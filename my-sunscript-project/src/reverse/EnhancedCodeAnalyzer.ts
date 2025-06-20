/**
 * Main orchestrator for enhanced code analysis
 * Refactored to use specialized analyzer components
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AIProvider } from '../ai/AIProvider';
import { InputValidator } from '../validation';
import { globalLogger } from '../errors/Logger';
import { LanguageDetector, LanguageInfo } from './LanguageDetector';

// Import all the specialized analyzers
import { StructuralAnalyzer } from './analyzers/StructuralAnalyzer';
import { DependencyAnalyzer } from './analyzers/DependencyAnalyzer';
import { ContentAnalyzer } from './analyzers/ContentAnalyzer';
import { QualityAnalyzer } from './analyzers/QualityAnalyzer';

// Import types
import { EnhancedCodeAnalysis, ComplexityMetrics } from './types/AnalysisTypes';

export class EnhancedCodeAnalyzer {
  private languageDetector: LanguageDetector;
  private structuralAnalyzer: StructuralAnalyzer;
  private dependencyAnalyzer: DependencyAnalyzer;
  private contentAnalyzer: ContentAnalyzer;
  private qualityAnalyzer: QualityAnalyzer;

  constructor(private aiProvider: AIProvider) {
    this.languageDetector = new LanguageDetector();
    this.structuralAnalyzer = new StructuralAnalyzer();
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.contentAnalyzer = new ContentAnalyzer();
    this.qualityAnalyzer = new QualityAnalyzer();
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

    // Initialize analysis object
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
    analysis = await this.performLanguageSpecificAnalysis(content, analysis, languageInfo);

    // Enhance with AI analysis
    analysis = await this.enhanceWithAI(content, analysis);

    // Calculate quality metrics
    analysis = this.qualityAnalyzer.calculateQualityMetrics(analysis, content);

    // Generate conversion notes
    analysis.conversionNotes = this.generateConversionNotes(analysis);

    return analysis;
  }

  private async performLanguageSpecificAnalysis(
    content: string,
    analysis: EnhancedCodeAnalysis,
    languageInfo: LanguageInfo
  ): Promise<EnhancedCodeAnalysis> {
    
    switch (languageInfo.language) {
      case 'javascript':
      case 'typescript':
        return this.analyzeJavaScriptTypeScript(content, analysis, languageInfo);
      case 'python':
        return this.analyzePython(content, analysis);
      case 'java':
        return this.analyzeJava(content, analysis);
      case 'go':
        return this.analyzeGo(content, analysis);
      case 'rust':
        return this.analyzeRust(content, analysis);
      default:
        return this.analyzeGeneric(content, analysis);
    }
  }

  private async analyzeJavaScriptTypeScript(
    content: string,
    analysis: EnhancedCodeAnalysis,
    languageInfo: LanguageInfo
  ): Promise<EnhancedCodeAnalysis> {
    
    // Extract structural elements
    analysis.functions = this.structuralAnalyzer.extractJSFunctions(content);
    analysis.classes = this.structuralAnalyzer.extractJSClasses(content);
    
    if (languageInfo.language === 'typescript') {
      analysis.interfaces = this.structuralAnalyzer.extractTSInterfaces(content);
      analysis.types = this.structuralAnalyzer.extractTSTypes(content);
    }
    
    // Extract dependencies
    analysis.imports = this.dependencyAnalyzer.extractJSImports(content);
    analysis.exports = this.dependencyAnalyzer.extractJSExports(content);
    analysis.dependencies = this.dependencyAnalyzer.analyzeDependencies(analysis.imports, content);
    
    // Analyze content and patterns
    analysis.patterns = this.contentAnalyzer.detectJSPatterns(content);
    analysis.purpose = this.contentAnalyzer.analyzePurpose(content, analysis);
    analysis.functionality = this.contentAnalyzer.extractFunctionality(content, analysis);
    
    // Calculate complexity
    analysis.complexity = this.qualityAnalyzer.calculateJSComplexity(content, analysis);
    
    return analysis;
  }

  private async analyzePython(content: string, analysis: EnhancedCodeAnalysis): Promise<EnhancedCodeAnalysis> {
    // Extract structural elements
    analysis.functions = this.structuralAnalyzer.extractPythonFunctions(content);
    analysis.classes = this.structuralAnalyzer.extractPythonClasses(content);
    
    // Extract dependencies
    analysis.imports = this.dependencyAnalyzer.extractPythonImports(content);
    analysis.dependencies = this.dependencyAnalyzer.analyzeDependencies(analysis.imports, content);
    
    // Analyze content and patterns
    analysis.patterns = this.contentAnalyzer.detectPythonPatterns(content);
    analysis.purpose = this.contentAnalyzer.analyzePurpose(content, analysis);
    analysis.functionality = this.contentAnalyzer.extractFunctionality(content, analysis);
    
    // Calculate complexity
    analysis.complexity = this.qualityAnalyzer.calculatePythonComplexity(content, analysis);
    
    return analysis;
  }

  private async analyzeJava(content: string, analysis: EnhancedCodeAnalysis): Promise<EnhancedCodeAnalysis> {
    // Extract dependencies
    analysis.imports = this.dependencyAnalyzer.extractJavaImports(content);
    analysis.dependencies = this.dependencyAnalyzer.analyzeDependencies(analysis.imports, content);
    
    // Analyze patterns
    analysis.patterns = this.contentAnalyzer.detectJavaPatterns(content);
    analysis.purpose = this.contentAnalyzer.analyzePurpose(content, analysis);
    analysis.functionality = this.contentAnalyzer.extractFunctionality(content, analysis);
    
    return analysis;
  }

  private async analyzeGo(content: string, analysis: EnhancedCodeAnalysis): Promise<EnhancedCodeAnalysis> {
    // Extract dependencies
    analysis.imports = this.dependencyAnalyzer.extractGoImports(content);
    analysis.dependencies = this.dependencyAnalyzer.analyzeDependencies(analysis.imports, content);
    
    // Basic analysis
    analysis.purpose = this.contentAnalyzer.analyzePurpose(content, analysis);
    analysis.functionality = this.contentAnalyzer.extractFunctionality(content, analysis);
    
    return analysis;
  }

  private async analyzeRust(content: string, analysis: EnhancedCodeAnalysis): Promise<EnhancedCodeAnalysis> {
    // Extract dependencies
    analysis.imports = this.dependencyAnalyzer.extractRustImports(content);
    analysis.dependencies = this.dependencyAnalyzer.analyzeDependencies(analysis.imports, content);
    
    // Basic analysis
    analysis.purpose = this.contentAnalyzer.analyzePurpose(content, analysis);
    analysis.functionality = this.contentAnalyzer.extractFunctionality(content, analysis);
    
    return analysis;
  }

  private async analyzeGeneric(content: string, analysis: EnhancedCodeAnalysis): Promise<EnhancedCodeAnalysis> {
    // Basic pattern-based analysis for unknown languages
    const lines = content.split('\n');
    const functionKeywords = ['function', 'def', 'func', 'fn', 'method'];
    const classKeywords = ['class', 'struct', 'type', 'interface'];
    
    // Find functions using generic patterns
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
    
    // Basic purpose and functionality analysis
    analysis.purpose = this.contentAnalyzer.analyzePurpose(content, analysis);
    analysis.functionality = this.contentAnalyzer.extractFunctionality(content, analysis);
    
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
      
      analysis.purpose = aiAnalysis.purpose || analysis.purpose;
      analysis.functionality = [...analysis.functionality, ...(aiAnalysis.functionality || [])];
      analysis.suggestedImprovements = aiAnalysis.suggestedImprovements || [];
      analysis.securityConcerns = aiAnalysis.securityConcerns || [];
      analysis.performanceTips = aiAnalysis.performanceTips || [];
      analysis.naturalLanguageDescription = aiAnalysis.naturalLanguageDescription || 
        this.contentAnalyzer.generateBasicDescription(analysis);
      
      // Process AI-detected patterns
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
      analysis.naturalLanguageDescription = this.contentAnalyzer.generateBasicDescription(analysis);
    }

    return analysis;
  }

  private generateConversionNotes(analysis: EnhancedCodeAnalysis): string[] {
    const notes: string[] = [];
    
    // Language-specific conversion suggestions
    switch (analysis.language) {
      case 'javascript':
      case 'typescript':
        notes.push('Consider using SunScript function blocks for main logic');
        if (analysis.functions.length > 5) {
          notes.push('Break down into multiple SunScript components for better organization');
        }
        break;
      case 'python':
        notes.push('Python functions can be converted to SunScript natural language descriptions');
        if (analysis.classes.length > 0) {
          notes.push('Classes can become SunScript components with natural language behavior');
        }
        break;
    }
    
    // Pattern-based suggestions
    for (const pattern of analysis.patterns) {
      if (pattern.confidence > 80) {
        notes.push(`${pattern.name} detected - can be expressed as SunScript architectural directive`);
      }
    }
    
    // Complexity-based suggestions
    if (analysis.complexity.cyclomaticComplexity > 15) {
      notes.push('High complexity - consider breaking into multiple SunScript functions with natural language');
    }
    
    return notes;
  }

  private initializeComplexityMetrics(): ComplexityMetrics {
    return {
      cyclomaticComplexity: 1,
      linesOfCode: 0,
      maintainabilityIndex: 0,
      cognitiveComplexity: 0,
      nestingDepth: 0,
      fanOut: 0,
      fanIn: 0
    };
  }

  private isLineExported(line: string, content: string): boolean {
    return line.includes('export') || line.includes('public');
  }
}

// Re-export all types for backwards compatibility
export * from './types/AnalysisTypes';