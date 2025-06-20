/**
 * Handles analysis of code content including purpose, functionality,
 * architectural patterns, and generates natural language descriptions
 */

import { ArchitecturalPattern, EnhancedCodeAnalysis } from '../types/AnalysisTypes';

export class ContentAnalyzer {

  // Detect JavaScript/TypeScript Patterns
  detectJSPatterns(content: string): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];
    
    // Module Pattern
    if (this.hasModulePattern(content)) {
      patterns.push({
        name: 'Module Pattern',
        confidence: 85,
        evidence: ['IIFE usage', 'Private variables', 'Exported interface'],
        benefits: ['Encapsulation', 'Namespace pollution prevention'],
        concerns: ['Testing complexity']
      });
    }
    
    // Observer Pattern
    if (this.hasObserverPattern(content)) {
      patterns.push({
        name: 'Observer Pattern',
        confidence: 75,
        evidence: ['Event listeners', 'Callback functions', 'State changes'],
        benefits: ['Loose coupling', 'Dynamic relationships'],
        concerns: ['Memory leaks potential']
      });
    }
    
    // Singleton Pattern
    if (this.hasSingletonPattern(content)) {
      patterns.push({
        name: 'Singleton Pattern',
        confidence: 80,
        evidence: ['Single instance check', 'Static methods'],
        benefits: ['Resource control', 'Global access'],
        concerns: ['Testing difficulties', 'Hidden dependencies']
      });
    }
    
    // Factory Pattern
    if (this.hasFactoryPattern(content)) {
      patterns.push({
        name: 'Factory Pattern',
        confidence: 70,
        evidence: ['Object creation methods', 'Type-based instantiation'],
        benefits: ['Flexible object creation', 'Decoupling'],
        concerns: ['Complexity increase']
      });
    }
    
    return patterns;
  }

  // Detect Python Patterns
  detectPythonPatterns(content: string): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];
    
    // Decorator Pattern
    if (content.includes('@') && content.includes('def ')) {
      patterns.push({
        name: 'Decorator Pattern',
        confidence: 90,
        evidence: ['@decorator syntax', 'Function wrapping'],
        benefits: ['Behavior modification', 'Code reuse'],
        concerns: ['Debugging complexity']
      });
    }
    
    // Context Manager Pattern
    if (content.includes('with ') && content.includes('__enter__')) {
      patterns.push({
        name: 'Context Manager Pattern',
        confidence: 85,
        evidence: ['with statements', '__enter__/__exit__ methods'],
        benefits: ['Resource management', 'Exception safety'],
        concerns: ['Learning curve']
      });
    }
    
    // MVC Pattern
    if (this.hasMVCPattern(content)) {
      patterns.push({
        name: 'Model-View-Controller (MVC)',
        confidence: 75,
        evidence: ['Model classes', 'View functions', 'Controller logic'],
        benefits: ['Separation of concerns', 'Maintainability'],
        concerns: ['Complexity for small apps']
      });
    }
    
    return patterns;
  }

  // Detect Java Patterns
  detectJavaPatterns(content: string): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];
    
    // Spring Framework Patterns
    if (content.includes('@Service') || content.includes('@Component')) {
      patterns.push({
        name: 'Dependency Injection',
        confidence: 95,
        evidence: ['@Service annotations', '@Autowired usage'],
        benefits: ['Loose coupling', 'Testability'],
        concerns: ['Configuration complexity']
      });
    }
    
    // Builder Pattern
    if (this.hasBuilderPattern(content)) {
      patterns.push({
        name: 'Builder Pattern',
        confidence: 80,
        evidence: ['Builder class', 'Method chaining', 'build() method'],
        benefits: ['Readable object construction', 'Parameter validation'],
        concerns: ['Code verbosity']
      });
    }
    
    return patterns;
  }

  // Generate natural language descriptions
  generateBasicDescription(analysis: EnhancedCodeAnalysis): string {
    const parts: string[] = [];
    
    // Basic file info
    parts.push(`This is a ${analysis.language} file`);
    
    // Structure description
    if (analysis.functions.length > 0) {
      parts.push(`containing ${analysis.functions.length} function(s)`);
    }
    
    if (analysis.classes.length > 0) {
      parts.push(`and ${analysis.classes.length} class(es)`);
    }
    
    if (analysis.interfaces.length > 0) {
      parts.push(`with ${analysis.interfaces.length} interface(s)`);
    }
    
    // Functionality description
    if (analysis.functionality.length > 0) {
      parts.push(`The main functionality includes: ${analysis.functionality.slice(0, 3).join(', ')}`);
    }
    
    // Pattern description
    if (analysis.patterns.length > 0) {
      const mainPatterns = analysis.patterns
        .filter(p => p.confidence > 70)
        .map(p => p.name)
        .slice(0, 2);
      
      if (mainPatterns.length > 0) {
        parts.push(`It implements ${mainPatterns.join(' and ')} design pattern(s)`);
      }
    }
    
    // Dependencies
    if (analysis.dependencies.length > 0) {
      const criticalDeps = analysis.dependencies
        .filter(d => d.critical)
        .map(d => d.name)
        .slice(0, 2);
      
      if (criticalDeps.length > 0) {
        parts.push(`and relies heavily on ${criticalDeps.join(' and ')}`);
      }
    }
    
    return parts.join(' ') + '.';
  }

  // Analyze code purpose based on patterns and structure
  analyzePurpose(content: string, analysis: EnhancedCodeAnalysis): string {
    const indicators: string[] = [];
    
    // File name analysis
    const fileName = analysis.fileName.toLowerCase();
    if (fileName.includes('test')) return 'Testing utilities and test cases';
    if (fileName.includes('config')) return 'Configuration management';
    if (fileName.includes('util') || fileName.includes('helper')) return 'Utility functions and helper methods';
    if (fileName.includes('service')) return 'Service layer implementation';
    if (fileName.includes('controller')) return 'Request handling and routing';
    if (fileName.includes('model')) return 'Data models and business logic';
    if (fileName.includes('view')) return 'User interface and presentation logic';
    
    // Content-based analysis
    if (content.includes('fetch') || content.includes('axios') || content.includes('request')) {
      indicators.push('API communication');
    }
    
    if (content.includes('useState') || content.includes('state')) {
      indicators.push('State management');
    }
    
    if (content.includes('router') || content.includes('route')) {
      indicators.push('Routing logic');
    }
    
    if (content.includes('database') || content.includes('db') || content.includes('query')) {
      indicators.push('Database operations');
    }
    
    if (content.includes('validate') || content.includes('check')) {
      indicators.push('Data validation');
    }
    
    // Default purpose based on structure
    if (indicators.length > 0) {
      return `Handles ${indicators.slice(0, 3).join(', ')}`;
    }
    
    if (analysis.functions.length > analysis.classes.length) {
      return 'Provides utility functions and procedural logic';
    } else if (analysis.classes.length > 0) {
      return 'Implements object-oriented business logic';
    }
    
    return 'General purpose code module';
  }

  // Extract functionality list
  extractFunctionality(content: string, analysis: EnhancedCodeAnalysis): string[] {
    const functionality: string[] = [];
    
    // Based on function names
    for (const func of analysis.functions) {
      const name = func.name.toLowerCase();
      
      if (name.includes('create') || name.includes('add')) {
        functionality.push('Data creation');
      }
      if (name.includes('update') || name.includes('edit') || name.includes('modify')) {
        functionality.push('Data modification');
      }
      if (name.includes('delete') || name.includes('remove')) {
        functionality.push('Data deletion');
      }
      if (name.includes('get') || name.includes('fetch') || name.includes('find')) {
        functionality.push('Data retrieval');
      }
      if (name.includes('validate') || name.includes('check')) {
        functionality.push('Data validation');
      }
      if (name.includes('render') || name.includes('display')) {
        functionality.push('UI rendering');
      }
      if (name.includes('handle') || name.includes('process')) {
        functionality.push('Event handling');
      }
    }
    
    // Based on imports and dependencies
    for (const imp of analysis.imports) {
      if (imp.framework === 'React') {
        functionality.push('React component development');
      }
      if (imp.framework === 'Express.js') {
        functionality.push('Web server functionality');
      }
      if (imp.framework === 'Database' || imp.source.includes('db')) {
        functionality.push('Database integration');
      }
    }
    
    // Remove duplicates and return
    return [...new Set(functionality)];
  }

  // Pattern detection helper methods
  private hasModulePattern(content: string): boolean {
    return content.includes('(function()') || 
           content.includes('(function ') ||
           (content.includes('module.exports') && content.includes('function'));
  }

  private hasObserverPattern(content: string): boolean {
    return content.includes('addEventListener') ||
           content.includes('on(') ||
           content.includes('subscribe') ||
           content.includes('notify');
  }

  private hasSingletonPattern(content: string): boolean {
    return content.includes('getInstance') ||
           (content.includes('static') && content.includes('instance'));
  }

  private hasFactoryPattern(content: string): boolean {
    return content.includes('createInstance') ||
           content.includes('factory') ||
           content.includes('create') && content.includes('switch');
  }

  private hasMVCPattern(content: string): boolean {
    const hasModel = content.includes('class') && content.includes('Model');
    const hasView = content.includes('View') || content.includes('template');
    const hasController = content.includes('Controller') || content.includes('handler');
    
    return (hasModel && hasView) || (hasModel && hasController) || (hasView && hasController);
  }

  private hasBuilderPattern(content: string): boolean {
    return content.includes('Builder') &&
           content.includes('build()') &&
           content.includes('return this');
  }
}