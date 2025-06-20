/**
 * Handles extraction of structural elements (functions, classes, interfaces, types)
 * from code for different programming languages
 */

import { 
  FunctionAnalysis, 
  ClassAnalysis, 
  InterfaceAnalysis, 
  TypeAnalysis, 
  ParameterInfo, 
  PropertyInfo 
} from '../types/AnalysisTypes';

export class StructuralAnalyzer {
  
  // JavaScript/TypeScript Functions
  extractJSFunctions(content: string): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];
    
    // Regular function declarations
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*{/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const [, name, params, returnType] = match;
      
      functions.push({
        name,
        signature: match[0].replace('{', ''),
        parameters: this.parseJSParameters(params),
        returnType: returnType?.trim(),
        isAsync: match[0].includes('async'),
        isExported: match[0].includes('export'),
        visibility: 'public',
        complexity: this.estimateFunctionComplexity(content, name),
        purpose: `Function ${name}`,
        dependencies: this.extractFunctionDependencies(content, name),
        sideEffects: this.detectSideEffects(content, name),
        pureFunction: this.isPureFunction(content, name),
        testable: true
      });
    }
    
    // Arrow functions
    const arrowFunctionRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)(?:\s*:\s*([^=]+))?\s*=>/g;
    
    while ((match = arrowFunctionRegex.exec(content)) !== null) {
      const [, name, params, returnType] = match;
      
      functions.push({
        name,
        signature: match[0].replace(/\s*=>.*$/, ''),
        parameters: this.parseJSParameters(params),
        returnType: returnType?.trim(),
        isAsync: match[0].includes('async'),
        isExported: match[0].includes('export'),
        visibility: 'public',
        complexity: this.estimateFunctionComplexity(content, name),
        purpose: `Arrow function ${name}`,
        dependencies: this.extractFunctionDependencies(content, name),
        sideEffects: this.detectSideEffects(content, name),
        pureFunction: this.isPureFunction(content, name),
        testable: true
      });
    }
    
    return functions;
  }

  // JavaScript/TypeScript Classes
  extractJSClasses(content: string): ClassAnalysis[] {
    const classes: ClassAnalysis[] = [];
    
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*{/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const [, name, extendsClass, implementsClause] = match;
      
      classes.push({
        name,
        type: match[0].includes('abstract') ? 'abstract' : 'class',
        extends: extendsClass,
        implements: implementsClause ? implementsClause.split(',').map(i => i.trim()) : [],
        methods: this.extractClassMethods(content, name),
        properties: this.extractClassProperties(content, name),
        constructor: this.extractConstructor(content, name),
        isExported: match[0].includes('export'),
        purpose: `Class ${name}`,
        responsibilities: this.analyzeClassResponsibilities(content, name),
        patterns: this.detectClassPatterns(content, name)
      });
    }
    
    return classes;
  }

  // TypeScript Interfaces
  extractTSInterfaces(content: string): InterfaceAnalysis[] {
    const interfaces: InterfaceAnalysis[] = [];
    
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*{([^}]*)}/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      const [, name, extendsClause, body] = match;
      
      interfaces.push({
        name,
        methods: this.parseInterfaceMethods(body),
        properties: this.parseInterfaceProperties(body),
        extends: extendsClause ? extendsClause.split(',').map(e => e.trim()) : [],
        purpose: `Interface ${name}`,
        usage: this.findInterfaceUsage(content, name)
      });
    }
    
    return interfaces;
  }

  // TypeScript Types
  extractTSTypes(content: string): TypeAnalysis[] {
    const types: TypeAnalysis[] = [];
    
    const typeRegex = /(?:export\s+)?type\s+(\w+)\s*=\s*([^;]+);?/g;
    let match;
    
    while ((match = typeRegex.exec(content)) !== null) {
      const [, name, definition] = match;
      
      types.push({
        name,
        kind: this.determineTypeKind(definition),
        definition: definition.trim(),
        usage: this.findTypeUsage(content, name),
        purpose: `Type ${name}`
      });
    }
    
    return types;
  }

  // Python Functions
  extractPythonFunctions(content: string): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];
    
    const functionRegex = /(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?\s*:/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const [, name, params, returnType] = match;
      
      functions.push({
        name,
        signature: match[0].replace(':', ''),
        parameters: this.parsePythonParameters(params),
        returnType: returnType?.trim(),
        isAsync: match[0].includes('async'),
        isExported: !name.startsWith('_'),
        visibility: name.startsWith('__') ? 'private' : name.startsWith('_') ? 'protected' : 'public',
        complexity: this.estimateFunctionComplexity(content, name),
        purpose: `Function ${name}`,
        dependencies: this.extractFunctionDependencies(content, name),
        sideEffects: this.detectSideEffects(content, name),
        pureFunction: this.isPureFunction(content, name),
        testable: true
      });
    }
    
    return functions;
  }

  // Python Classes
  extractPythonClasses(content: string): ClassAnalysis[] {
    const classes: ClassAnalysis[] = [];
    
    const classRegex = /class\s+(\w+)(?:\(([^)]*)\))?\s*:/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const [, name, baseClasses] = match;
      
      classes.push({
        name,
        type: 'class',
        extends: baseClasses?.split(',')[0]?.trim(),
        implements: baseClasses ? baseClasses.split(',').slice(1).map(c => c.trim()) : [],
        methods: this.extractClassMethods(content, name),
        properties: this.extractClassProperties(content, name),
        constructor: this.extractPythonConstructor(content, name),
        isExported: !name.startsWith('_'),
        purpose: `Class ${name}`,
        responsibilities: this.analyzeClassResponsibilities(content, name),
        patterns: this.detectClassPatterns(content, name)
      });
    }
    
    return classes;
  }

  // Helper methods
  private parseJSParameters(params: string): ParameterInfo[] {
    if (!params.trim()) return [];
    
    return params.split(',').map(param => {
      const trimmed = param.trim();
      const [nameWithType, defaultValue] = trimmed.split('=');
      const [name, type] = nameWithType.split(':').map(s => s.trim());
      
      return {
        name: name.replace('?', ''),
        type: type,
        optional: name.includes('?'),
        defaultValue: defaultValue?.trim(),
        description: `Parameter ${name}`
      };
    });
  }

  private parsePythonParameters(params: string): ParameterInfo[] {
    if (!params.trim()) return [];
    
    return params.split(',').map(param => {
      const trimmed = param.trim();
      if (trimmed === 'self' || trimmed === 'cls') return null;
      
      const [nameWithType, defaultValue] = trimmed.split('=');
      const [name, type] = nameWithType.split(':').map(s => s.trim());
      
      return {
        name,
        type: type,
        optional: defaultValue !== undefined,
        defaultValue: defaultValue?.trim(),
        description: `Parameter ${name}`
      };
    }).filter(Boolean) as ParameterInfo[];
  }

  private estimateFunctionComplexity(content: string, functionName: string): number {
    // Simple complexity estimation based on control flow statements
    const lines = content.split('\n');
    let complexity = 1; // Base complexity
    let inFunction = false;
    let braceCount = 0;
    
    for (const line of lines) {
      if (line.includes(`function ${functionName}`) || line.includes(`def ${functionName}`)) {
        inFunction = true;
        continue;
      }
      
      if (inFunction) {
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) {
          braceCount--;
          if (braceCount < 0) break;
        }
        
        // Count complexity-increasing statements
        if (/(if|else|elif|while|for|case|catch|switch|\?|&&|\|\|)/.test(line)) {
          complexity++;
        }
      }
    }
    
    return complexity;
  }

  private extractFunctionDependencies(content: string, functionName: string): string[] {
    // Extract function calls within the function
    const dependencies: string[] = [];
    const functionMatch = content.match(new RegExp(`function\\s+${functionName}[^}]*}`, 's'));
    
    if (functionMatch) {
      const functionBody = functionMatch[0];
      const callMatches = functionBody.match(/(\w+)\s*\(/g);
      
      if (callMatches) {
        dependencies.push(...callMatches.map(call => call.replace('(', '')));
      }
    }
    
    return [...new Set(dependencies)];
  }

  private detectSideEffects(content: string, functionName: string): string[] {
    const sideEffects: string[] = [];
    const functionMatch = content.match(new RegExp(`function\\s+${functionName}[^}]*}`, 's'));
    
    if (functionMatch) {
      const functionBody = functionMatch[0];
      
      if (/console\.|console\.log|print/.test(functionBody)) {
        sideEffects.push('Logging/Output');
      }
      if (/fetch|xhr|ajax|http/.test(functionBody)) {
        sideEffects.push('Network Requests');
      }
      if (/localStorage|sessionStorage/.test(functionBody)) {
        sideEffects.push('Local Storage');
      }
      if (/document\.|window\.|global/.test(functionBody)) {
        sideEffects.push('DOM/Global Modification');
      }
    }
    
    return sideEffects;
  }

  private isPureFunction(content: string, functionName: string): boolean {
    const sideEffects = this.detectSideEffects(content, functionName);
    return sideEffects.length === 0;
  }

  private extractClassMethods(content: string, className: string): FunctionAnalysis[] {
    // This would extract methods from a specific class
    // Implementation would be similar to extractJSFunctions but scoped to the class
    return [];
  }

  private extractClassProperties(content: string, className: string): PropertyInfo[] {
    // Extract class properties
    return [];
  }

  private extractConstructor(content: string, className: string): FunctionAnalysis | undefined {
    // Extract constructor information
    return undefined;
  }

  private extractPythonConstructor(content: string, className: string): FunctionAnalysis | undefined {
    // Extract Python __init__ method
    return undefined;
  }

  private analyzeClassResponsibilities(content: string, className: string): string[] {
    // Analyze what the class is responsible for
    return [`Manages ${className} functionality`];
  }

  private detectClassPatterns(content: string, className: string): string[] {
    // Detect design patterns used in the class
    return [];
  }

  private parseInterfaceMethods(body: string): any[] {
    // Parse interface method signatures
    return [];
  }

  private parseInterfaceProperties(body: string): any[] {
    // Parse interface property signatures
    return [];
  }

  private findInterfaceUsage(content: string, interfaceName: string): string[] {
    // Find where the interface is used
    return [];
  }

  private determineTypeKind(definition: string): 'type' | 'enum' | 'union' | 'intersection' {
    if (definition.includes('|')) return 'union';
    if (definition.includes('&')) return 'intersection';
    if (definition.includes('enum')) return 'enum';
    return 'type';
  }

  private findTypeUsage(content: string, typeName: string): string[] {
    // Find where the type is used
    return [];
  }
}