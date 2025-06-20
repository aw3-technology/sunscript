/**
 * Handles quality metrics analysis including maintainability,
 * testability, documentation coverage, and complexity metrics
 */

import { ComplexityMetrics, EnhancedCodeAnalysis } from '../types/AnalysisTypes';

export class QualityAnalyzer {

  // Calculate JavaScript/TypeScript complexity
  calculateJSComplexity(content: string, analysis: EnhancedCodeAnalysis): ComplexityMetrics {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    return {
      cyclomaticComplexity: this.calculateCyclomaticComplexity(content),
      linesOfCode: nonEmptyLines.length,
      maintainabilityIndex: this.calculateMaintainabilityIndex(content, analysis),
      cognitiveComplexity: this.calculateCognitiveComplexity(content),
      nestingDepth: this.calculateMaxNestingDepth(content),
      fanOut: analysis.imports.length,
      fanIn: this.estimateFanIn(content, analysis)
    };
  }

  // Calculate Python complexity
  calculatePythonComplexity(content: string, analysis: EnhancedCodeAnalysis): ComplexityMetrics {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0 && !line.trim().startsWith('#'));
    
    return {
      cyclomaticComplexity: this.calculateCyclomaticComplexity(content),
      linesOfCode: nonEmptyLines.length,
      maintainabilityIndex: this.calculateMaintainabilityIndex(content, analysis),
      cognitiveComplexity: this.calculateCognitiveComplexity(content),
      nestingDepth: this.calculatePythonNestingDepth(content),
      fanOut: analysis.imports.length,
      fanIn: this.estimateFanIn(content, analysis)
    };
  }

  // Calculate overall quality metrics
  calculateQualityMetrics(analysis: EnhancedCodeAnalysis, content: string): EnhancedCodeAnalysis {
    analysis.maintainability = this.calculateMaintainabilityScore(content, analysis);
    analysis.testability = this.calculateTestabilityScore(content, analysis);
    analysis.documentation = this.calculateDocumentationScore(content);
    
    return analysis;
  }

  // Calculate cyclomatic complexity
  private calculateCyclomaticComplexity(content: string): number {
    let complexity = 1; // Base complexity
    
    // Count decision points
    const decisionPatterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\belif\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\band\b/g,
      /\bor\b/g,
      /&&/g,
      /\|\|/g,
      /\?/g // Ternary operator
    ];
    
    for (const pattern of decisionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  // Calculate cognitive complexity (more human-oriented than cyclomatic)
  private calculateCognitiveComplexity(content: string): number {
    let complexity = 0;
    let nestingLevel = 0;
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Track nesting level
      if (/{/.test(trimmed)) nestingLevel++;
      if (/}/.test(trimmed)) nestingLevel = Math.max(0, nestingLevel - 1);
      
      // Add complexity based on constructs
      if (/\b(if|while|for)\b/.test(trimmed)) {
        complexity += 1 + nestingLevel;
      }
      
      if (/\b(else|elif|catch)\b/.test(trimmed)) {
        complexity += 1;
      }
      
      if (/\b(switch|case)\b/.test(trimmed)) {
        complexity += 1;
      }
      
      // Boolean operators add to cognitive load
      if (/(&&|\|\|)/.test(trimmed)) {
        complexity += 1;
      }
      
      // Recursive calls increase cognitive complexity
      if (this.isRecursiveCall(trimmed, content)) {
        complexity += 1;
      }
    }
    
    return complexity;
  }

  // Calculate maximum nesting depth
  private calculateMaxNestingDepth(content: string): number {
    let currentDepth = 0;
    let maxDepth = 0;
    
    for (const char of content) {
      if (char === '{' || char === '(') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}' || char === ')') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }
    
    return maxDepth;
  }

  // Calculate Python-specific nesting depth (indentation-based)
  private calculatePythonNestingDepth(content: string): number {
    const lines = content.split('\n');
    let maxDepth = 0;
    
    for (const line of lines) {
      if (line.trim().length === 0) continue;
      
      const indentation = line.length - line.trimStart().length;
      const depth = Math.floor(indentation / 4); // Assuming 4-space indentation
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return maxDepth;
  }

  // Calculate maintainability index (0-100 scale)
  private calculateMaintainabilityIndex(content: string, analysis: EnhancedCodeAnalysis): number {
    const halsteadVolume = this.calculateHalsteadVolume(content);
    const cyclomaticComplexity = analysis.complexity?.cyclomaticComplexity || 1;
    const linesOfCode = content.split('\n').length;
    
    // Simplified maintainability index calculation
    const mi = Math.max(0, 
      (171 - 5.2 * Math.log(halsteadVolume) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(linesOfCode)) * 100 / 171
    );
    
    return Math.round(mi);
  }

  // Calculate Halstead volume (approximation)
  private calculateHalsteadVolume(content: string): number {
    // Simplified Halstead metrics
    const operators = content.match(/[+\-*/=<>!&|?:;,(){}[\]]/g) || [];
    const operands = content.match(/\b[a-zA-Z_]\w*\b/g) || [];
    
    const uniqueOperators = new Set(operators).size;
    const uniqueOperands = new Set(operands).size;
    
    const vocabulary = uniqueOperators + uniqueOperands;
    const length = operators.length + operands.length;
    
    return length * Math.log2(vocabulary || 1);
  }

  // Calculate maintainability score (0-100)
  private calculateMaintainabilityScore(content: string, analysis: EnhancedCodeAnalysis): number {
    let score = 100;
    
    // Penalize high complexity
    const complexity = analysis.complexity?.cyclomaticComplexity || 1;
    if (complexity > 10) score -= (complexity - 10) * 5;
    if (complexity > 20) score -= (complexity - 20) * 10;
    
    // Penalize large functions
    const avgFunctionSize = this.calculateAverageFunctionSize(content, analysis);
    if (avgFunctionSize > 50) score -= (avgFunctionSize - 50) * 0.5;
    
    // Penalize deep nesting
    const nestingDepth = analysis.complexity?.nestingDepth || 0;
    if (nestingDepth > 4) score -= (nestingDepth - 4) * 10;
    
    // Bonus for good patterns
    if (analysis.patterns.some(p => p.confidence > 80)) score += 5;
    
    // Bonus for pure functions
    const pureFunctions = analysis.functions.filter(f => f.pureFunction).length;
    if (pureFunctions > 0) score += Math.min(10, pureFunctions * 2);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Calculate testability score (0-100)
  private calculateTestabilityScore(content: string, analysis: EnhancedCodeAnalysis): number {
    let score = 50; // Base score
    
    // Bonus for pure functions
    const pureFunctions = analysis.functions.filter(f => f.pureFunction).length;
    const totalFunctions = analysis.functions.length || 1;
    score += (pureFunctions / totalFunctions) * 30;
    
    // Bonus for dependency injection patterns
    if (content.includes('inject') || content.includes('@Injectable')) {
      score += 15;
    }
    
    // Penalize global state usage
    if (content.includes('global') || content.includes('window.')) {
      score -= 15;
    }
    
    // Penalize high complexity functions
    const complexFunctions = analysis.functions.filter(f => f.complexity > 10).length;
    score -= complexFunctions * 5;
    
    // Bonus for existing tests
    if (content.includes('test') || content.includes('spec') || content.includes('describe')) {
      score += 20;
    }
    
    // Penalize side effects
    const functionsWithSideEffects = analysis.functions.filter(f => f.sideEffects.length > 0).length;
    score -= (functionsWithSideEffects / totalFunctions) * 20;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Calculate documentation score (0-100)
  private calculateDocumentationScore(content: string): number {
    const lines = content.split('\n');
    const codeLines = lines.filter(line => line.trim().length > 0 && !this.isComment(line)).length;
    const commentLines = lines.filter(line => this.isComment(line)).length;
    
    if (codeLines === 0) return 0;
    
    const commentRatio = commentLines / codeLines;
    let score = Math.min(100, commentRatio * 300); // 33% comments = 100% score
    
    // Bonus for JSDoc/docstrings
    if (content.includes('/**') || content.includes('"""')) {
      score += 10;
    }
    
    // Bonus for README or documentation files
    if (content.includes('README') || content.includes('@param') || content.includes('@return')) {
      score += 15;
    }
    
    return Math.round(score);
  }

  // Helper methods
  private estimateFanIn(content: string, analysis: EnhancedCodeAnalysis): number {
    // Estimate how many modules depend on this one
    // This is a simplified heuristic
    return analysis.exports.length;
  }

  private calculateAverageFunctionSize(content: string, analysis: EnhancedCodeAnalysis): number {
    if (analysis.functions.length === 0) return 0;
    
    const totalLines = content.split('\n').length;
    return totalLines / analysis.functions.length;
  }

  private isComment(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || 
           trimmed.startsWith('/*') || 
           trimmed.startsWith('*') || 
           trimmed.startsWith('#') ||
           trimmed.startsWith('"""') ||
           trimmed.startsWith("'''");
  }

  private isRecursiveCall(line: string, content: string): boolean {
    // Simple heuristic: look for function name calling itself
    const functionMatch = content.match(/function\s+(\w+)/);
    if (functionMatch) {
      const functionName = functionMatch[1];
      return line.includes(`${functionName}(`);
    }
    return false;
  }
}