/**
 * Core types and interfaces for enhanced code analysis
 * Extracted from EnhancedCodeAnalyzer for better organization
 */

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