import { AIProvider } from '../ai/AIProvider';
import { Program, CompilationResult, AIContext, ComponentDeclaration, APIDeclaration, FunctionDeclaration } from '../types';
import { SunScriptError, ErrorCode } from '../errors/SunScriptError';
import { globalLogger } from '../errors/Logger';

export interface ComponentGenerationPlan {
  id: string;
  name: string;
  type: 'component' | 'api' | 'function' | 'page' | 'service';
  dependencies: string[];
  priority: number;
  description: string;
  context: string;
}

export interface GenerationContext {
  globalContext: AIContext;
  generatedComponents: Map<string, string>;
  componentPlans: ComponentGenerationPlan[];
  sharedInterfaces: string[];
  currentPhase: 'planning' | 'foundation' | 'components' | 'integration' | 'finalization';
}

export interface MultiPromptResult extends CompilationResult {
  generationPlan: ComponentGenerationPlan[];
  phases: {
    planning: { duration: number; decisions: string[] };
    foundation: { duration: number; generated: string[] };
    components: { duration: number; generated: string[] };
    integration: { duration: number; connections: string[] };
    finalization: { duration: number; optimizations: string[] };
  };
}

/**
 * Multi-prompt generator for large-scale application development
 * Breaks down complex applications into manageable, coordinated prompts
 */
export class MultiPromptGenerator {
  constructor(
    private aiProvider: AIProvider,
    private config: any = {}
  ) {}

  async generate(ast: Program, context: AIContext): Promise<MultiPromptResult> {
    const startTime = Date.now();
    
    globalLogger.info('Starting multi-prompt generation', {
      type: 'multi-prompt',
      targetLanguage: context.targetLanguage,
      nodeCount: ast.body.length
    });

    const generationContext: GenerationContext = {
      globalContext: context,
      generatedComponents: new Map(),
      componentPlans: [],
      sharedInterfaces: [],
      currentPhase: 'planning'
    };

    const result: MultiPromptResult = {
      code: {},
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        targetLanguage: context.targetLanguage,
        optimizations: [],
        warnings: []
      },
      success: true,
      errors: [],
      generationPlan: [],
      phases: {
        planning: { duration: 0, decisions: [] },
        foundation: { duration: 0, generated: [] },
        components: { duration: 0, generated: [] },
        integration: { duration: 0, connections: [] },
        finalization: { duration: 0, optimizations: [] }
      }
    };

    try {
      // Phase 1: Planning and Architecture Analysis
      await this.planningPhase(ast, generationContext, result);
      
      // Phase 2: Foundation (shared types, utilities, base components)
      await this.foundationPhase(generationContext, result);
      
      // Phase 3: Component Generation (parallel where possible)
      await this.componentGenerationPhase(generationContext, result);
      
      // Phase 4: Integration (connecting components, routing, state management)
      await this.integrationPhase(generationContext, result);
      
      // Phase 5: Finalization (optimization, testing, documentation)
      await this.finalizationPhase(generationContext, result);

      result.generationPlan = generationContext.componentPlans;
      
      globalLogger.info('Multi-prompt generation completed', {
        type: 'multi-prompt',
        duration: Date.now() - startTime,
        componentsGenerated: generationContext.generatedComponents.size,
        totalFiles: Object.keys(result.code).length
      });

      return result;

    } catch (error) {
      globalLogger.error('Multi-prompt generation failed', error as Error, {
        phase: generationContext.currentPhase
      });
      throw error;
    }
  }

  private async planningPhase(
    ast: Program, 
    context: GenerationContext, 
    result: MultiPromptResult
  ): Promise<void> {
    const phaseStart = Date.now();
    context.currentPhase = 'planning';

    globalLogger.info('Starting planning phase', { type: 'multi-prompt-planning' });

    // Analyze AST to identify components and their relationships
    const components = this.analyzeAST(ast);
    
    // Generate architectural plan
    const architecturalPrompt = this.buildArchitecturalPrompt(ast, context.globalContext, components);
    const architecturalResponse = await this.aiProvider.generateCode(architecturalPrompt, context.globalContext);
    
    // Parse the architectural response to create generation plans
    context.componentPlans = this.parseArchitecturalPlan(architecturalResponse.code, components);
    
    // Determine shared interfaces and types
    context.sharedInterfaces = await this.identifySharedInterfaces(context.componentPlans, context.globalContext);
    
    result.phases.planning = {
      duration: Date.now() - phaseStart,
      decisions: [
        `Identified ${context.componentPlans.length} components`,
        `Found ${context.sharedInterfaces.length} shared interfaces`,
        `Architecture: ${this.getArchitectureType(context.componentPlans)}`
      ]
    };

    globalLogger.info('Planning phase completed', {
      type: 'multi-prompt-planning',
      componentCount: context.componentPlans.length,
      duration: result.phases.planning.duration
    });
  }

  private async foundationPhase(
    context: GenerationContext,
    result: MultiPromptResult
  ): Promise<void> {
    const phaseStart = Date.now();
    context.currentPhase = 'foundation';

    globalLogger.info('Starting foundation phase', { type: 'multi-prompt-foundation' });

    const foundationComponents = ['types', 'utils', 'constants', 'config'];
    const generated: string[] = [];

    for (const componentType of foundationComponents) {
      if (this.needsFoundationComponent(componentType, context.componentPlans)) {
        const prompt = this.buildFoundationPrompt(componentType, context);
        const response = await this.aiProvider.generateCode(prompt, context.globalContext);
        
        const fileName = this.getFoundationFileName(componentType, context.globalContext.targetLanguage);
        result.code[fileName] = response.code;
        context.generatedComponents.set(componentType, response.code);
        generated.push(fileName);
      }
    }

    result.phases.foundation = {
      duration: Date.now() - phaseStart,
      generated
    };

    globalLogger.info('Foundation phase completed', {
      type: 'multi-prompt-foundation',
      generated: generated.length,
      duration: result.phases.foundation.duration
    });
  }

  private async componentGenerationPhase(
    context: GenerationContext,
    result: MultiPromptResult
  ): Promise<void> {
    const phaseStart = Date.now();
    context.currentPhase = 'components';

    globalLogger.info('Starting component generation phase', { type: 'multi-prompt-components' });

    // Sort components by priority and dependencies
    const sortedPlans = this.sortComponentsByDependencies(context.componentPlans);
    const generated: string[] = [];

    // Generate components in dependency order
    for (const plan of sortedPlans) {
      const prompt = this.buildComponentPrompt(plan, context);
      const response = await this.aiProvider.generateCode(prompt, context.globalContext);
      
      const fileName = this.getComponentFileName(plan, context.globalContext.targetLanguage);
      result.code[fileName] = response.code;
      context.generatedComponents.set(plan.id, response.code);
      generated.push(fileName);

      // Add small delay to prevent rate limiting
      await this.delay(100);
    }

    result.phases.components = {
      duration: Date.now() - phaseStart,
      generated
    };

    globalLogger.info('Component generation phase completed', {
      type: 'multi-prompt-components',
      generated: generated.length,
      duration: result.phases.components.duration
    });
  }

  private async integrationPhase(
    context: GenerationContext,
    result: MultiPromptResult
  ): Promise<void> {
    const phaseStart = Date.now();
    context.currentPhase = 'integration';

    globalLogger.info('Starting integration phase', { type: 'multi-prompt-integration' });

    const integrationComponents = ['router', 'store', 'api-client', 'app-root'];
    const connections: string[] = [];

    for (const integrationType of integrationComponents) {
      if (this.needsIntegrationComponent(integrationType, context.componentPlans)) {
        const prompt = this.buildIntegrationPrompt(integrationType, context);
        const response = await this.aiProvider.generateCode(prompt, context.globalContext);
        
        const fileName = this.getIntegrationFileName(integrationType, context.globalContext.targetLanguage);
        result.code[fileName] = response.code;
        connections.push(`${integrationType} -> ${this.getConnectedComponents(integrationType, context.componentPlans).join(', ')}`);
      }
    }

    result.phases.integration = {
      duration: Date.now() - phaseStart,
      connections
    };

    globalLogger.info('Integration phase completed', {
      type: 'multi-prompt-integration',
      connections: connections.length,
      duration: result.phases.integration.duration
    });
  }

  private async finalizationPhase(
    context: GenerationContext,
    result: MultiPromptResult
  ): Promise<void> {
    const phaseStart = Date.now();
    context.currentPhase = 'finalization';

    globalLogger.info('Starting finalization phase', { type: 'multi-prompt-finalization' });

    const optimizations: string[] = [];

    // Generate package.json, README, tests, etc.
    if (context.globalContext.targetLanguage === 'typescript' || context.globalContext.targetLanguage === 'javascript') {
      const packagePrompt = this.buildPackageConfigPrompt(context);
      const packageResponse = await this.aiProvider.generateCode(packagePrompt, context.globalContext);
      result.code['package.json'] = packageResponse.code;
      optimizations.push('Generated package.json with dependencies');
    }

    // Generate README
    const readmePrompt = this.buildReadmePrompt(context);
    const readmeResponse = await this.aiProvider.generateCode(readmePrompt, context.globalContext);
    result.code['README.md'] = readmeResponse.code;
    optimizations.push('Generated comprehensive README');

    // Generate build/deployment scripts if needed
    if (this.needsBuildConfig(context.componentPlans)) {
      const buildPrompt = this.buildConfigPrompt(context);
      const buildResponse = await this.aiProvider.generateCode(buildPrompt, context.globalContext);
      result.code[this.getBuildConfigFileName(context.globalContext.targetLanguage)] = buildResponse.code;
      optimizations.push('Generated build configuration');
    }

    result.phases.finalization = {
      duration: Date.now() - phaseStart,
      optimizations
    };

    globalLogger.info('Finalization phase completed', {
      type: 'multi-prompt-finalization',
      optimizations: optimizations.length,
      duration: result.phases.finalization.duration
    });
  }

  // Helper methods for AST analysis and prompt building
  private analyzeAST(ast: Program): Array<ComponentDeclaration | APIDeclaration | FunctionDeclaration> {
    const components: Array<ComponentDeclaration | APIDeclaration | FunctionDeclaration> = [];
    
    for (const node of ast.body) {
      if (node.type === 'ComponentDeclaration' || 
          node.type === 'APIDeclaration' || 
          node.type === 'FunctionDeclaration') {
        components.push(node as any);
      }
    }
    
    return components;
  }

  private buildArchitecturalPrompt(
    ast: Program, 
    context: AIContext, 
    components: Array<ComponentDeclaration | APIDeclaration | FunctionDeclaration>
  ): string {
    const componentList = components.map(c => `- ${c.type}: ${c.name}`).join('\n');
    
    return `Analyze this ${context.targetLanguage} application architecture and create a generation plan.

Components identified:
${componentList}

Target: ${context.targetLanguage}
Syntax Mode: ${ast.metadata.syntaxMode}

Create a detailed architectural plan including:
1. Component dependencies and relationships
2. Shared interfaces and types needed
3. Generation order and priorities
4. Integration points between components
5. Required foundation files (utils, types, etc.)

Return a JSON structure with the architectural decisions and component relationships.`;
  }

  private parseArchitecturalPlan(
    architecturalResponse: string, 
    components: Array<ComponentDeclaration | APIDeclaration | FunctionDeclaration>
  ): ComponentGenerationPlan[] {
    // Parse the AI response and create component generation plans
    // This is a simplified implementation - in practice, you'd parse JSON from the AI response
    
    return components.map((comp, index) => ({
      id: comp.name,
      name: comp.name,
      type: this.mapASTTypeToComponentType(comp.type),
      dependencies: [], // Would be extracted from AI analysis
      priority: index + 1,
      description: this.getComponentDescription(comp),
      context: this.buildComponentContext(comp)
    }));
  }

  private mapASTTypeToComponentType(astType: string): 'component' | 'api' | 'function' | 'page' | 'service' {
    switch (astType) {
      case 'ComponentDeclaration': return 'component';
      case 'APIDeclaration': return 'api';
      case 'FunctionDeclaration': return 'function';
      default: return 'function';
    }
  }

  private getComponentDescription(comp: ComponentDeclaration | APIDeclaration | FunctionDeclaration): string {
    if ('metadata' in comp && comp.metadata && 'description' in comp.metadata) {
      return comp.metadata.description || `${comp.type} ${comp.name}`;
    }
    return `${comp.type} ${comp.name}`;
  }

  private buildComponentContext(comp: ComponentDeclaration | APIDeclaration | FunctionDeclaration): string {
    // Extract natural language expressions from the component body
    const expressions: string[] = [];
    
    if ('body' in comp && Array.isArray(comp.body)) {
      for (const stmt of comp.body) {
        if (stmt.type === 'ExpressionStatement' && 'expression' in stmt) {
          const expr = (stmt as any).expression;
          if (expr.type === 'NaturalLanguageExpression') {
            expressions.push(expr.text);
          }
        }
      }
    }
    
    return expressions.join('\n');
  }

  // Additional helper methods (simplified for space)
  private async identifySharedInterfaces(plans: ComponentGenerationPlan[], context: AIContext): Promise<string[]> {
    // Analyze component plans to identify shared interfaces
    return ['CommonTypes', 'ApiResponse', 'UserData']; // Simplified
  }

  private getArchitectureType(plans: ComponentGenerationPlan[]): string {
    const hasComponents = plans.some(p => p.type === 'component');
    const hasAPIs = plans.some(p => p.type === 'api');
    
    if (hasComponents && hasAPIs) return 'Full-stack application';
    if (hasComponents) return 'Frontend application';
    if (hasAPIs) return 'Backend API';
    return 'Function library';
  }

  private needsFoundationComponent(type: string, plans: ComponentGenerationPlan[]): boolean {
    return plans.length > 2; // Need foundation for complex apps
  }

  private buildFoundationPrompt(componentType: string, context: GenerationContext): string {
    return `Generate ${componentType} foundation file for ${context.globalContext.targetLanguage} application.

Application components: ${context.componentPlans.map(p => p.name).join(', ')}

Create comprehensive ${componentType} that will be shared across the application.`;
  }

  private getFoundationFileName(type: string, targetLanguage: string): string {
    const ext = targetLanguage === 'typescript' ? 'ts' : 
                targetLanguage === 'javascript' ? 'js' : 
                targetLanguage === 'python' ? 'py' : targetLanguage;
    return `${type}.${ext}`;
  }

  private sortComponentsByDependencies(plans: ComponentGenerationPlan[]): ComponentGenerationPlan[] {
    // Topological sort based on dependencies
    return plans.sort((a, b) => a.priority - b.priority);
  }

  private buildComponentPrompt(plan: ComponentGenerationPlan, context: GenerationContext): string {
    const dependencies = plan.dependencies
      .map(dep => context.generatedComponents.get(dep))
      .filter(Boolean)
      .join('\n\n');

    return `Generate ${plan.type} "${plan.name}" for ${context.globalContext.targetLanguage} application.

Description: ${plan.description}
Requirements:
${plan.context}

Available dependencies:
${dependencies}

Shared interfaces: ${context.sharedInterfaces.join(', ')}

Generate complete, production-ready code.`;
  }

  private getComponentFileName(plan: ComponentGenerationPlan, targetLanguage: string): string {
    const ext = targetLanguage === 'typescript' ? 'ts' : 
                targetLanguage === 'javascript' ? 'js' : 
                targetLanguage === 'python' ? 'py' : targetLanguage;
    return `${plan.name}.${ext}`;
  }

  private needsIntegrationComponent(type: string, plans: ComponentGenerationPlan[]): boolean {
    return plans.length > 1; // Need integration for multi-component apps
  }

  private buildIntegrationPrompt(type: string, context: GenerationContext): string {
    return `Generate ${type} integration layer for ${context.globalContext.targetLanguage} application.

Components to integrate: ${context.componentPlans.map(p => p.name).join(', ')}

Create the ${type} that connects all components together.`;
  }

  private getIntegrationFileName(type: string, targetLanguage: string): string {
    const ext = targetLanguage === 'typescript' ? 'ts' : 
                targetLanguage === 'javascript' ? 'js' : 
                targetLanguage === 'python' ? 'py' : targetLanguage;
    return `${type}.${ext}`;
  }

  private getConnectedComponents(type: string, plans: ComponentGenerationPlan[]): string[] {
    return plans.map(p => p.name); // Simplified
  }

  private buildPackageConfigPrompt(context: GenerationContext): string {
    return `Generate package.json for ${context.globalContext.targetLanguage} application.

Components: ${context.componentPlans.map(p => p.name).join(', ')}
Target: ${context.globalContext.targetLanguage}

Include all necessary dependencies, scripts, and configuration.`;
  }

  private buildReadmePrompt(context: GenerationContext): string {
    return `Generate comprehensive README.md for the application.

Project: ${context.globalContext.projectName}
Components: ${context.componentPlans.map(p => p.name).join(', ')}
Target: ${context.globalContext.targetLanguage}

Include setup instructions, usage examples, and API documentation.`;
  }

  private needsBuildConfig(plans: ComponentGenerationPlan[]): boolean {
    return plans.length > 3; // Complex apps need build config
  }

  private buildConfigPrompt(context: GenerationContext): string {
    return `Generate build configuration for ${context.globalContext.targetLanguage} application.

Components: ${context.componentPlans.map(p => p.name).join(', ')}

Include bundling, optimization, and deployment configuration.`;
  }

  private getBuildConfigFileName(targetLanguage: string): string {
    return targetLanguage === 'typescript' ? 'tsconfig.json' : 
           targetLanguage === 'javascript' ? 'webpack.config.js' : 
           'build.config';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}