import * as fs from 'fs/promises';
import * as path from 'path';
import { AIProvider } from '../ai/AIProvider';
import { InputValidator } from '../validation';
import { globalLogger } from '../errors/Logger';
import { SunScriptError, ErrorCode } from '../errors/SunScriptError';

export interface DebugSession {
  id: string;
  sunScriptFile: string;
  targetFile: string;
  sourceMap: SourceMap;
  breakpoints: Breakpoint[];
  currentLine?: number;
  variables: VariableState[];
  stackTrace: StackFrame[];
  isRunning: boolean;
}

export interface SourceMap {
  version: number;
  sources: string[];
  names: string[];
  mappings: SourceMapping[];
  sunScriptContent: string;
  targetContent: string;
}

export interface SourceMapping {
  sunScriptLine: number;
  sunScriptColumn: number;
  targetLine: number;
  targetColumn: number;
  name?: string;
  context: string;
  naturalLanguageDescription: string;
}

export interface Breakpoint {
  id: string;
  sunScriptLine: number;
  naturalLanguageCondition?: string;
  enabled: boolean;
  hitCount: number;
  condition?: string; // Compiled condition
}

export interface VariableState {
  name: string;
  value: any;
  type: string;
  naturalLanguageDescription: string;
  scope: 'local' | 'global' | 'closure';
}

export interface StackFrame {
  functionName: string;
  naturalLanguageName: string;
  sunScriptLine: number;
  targetLine: number;
  fileName: string;
  variables: VariableState[];
}

export interface DebugError {
  message: string;
  naturalLanguageMessage: string;
  sunScriptLine: number;
  sunScriptColumn: number;
  targetLine?: number;
  targetColumn?: number;
  errorType: 'syntax' | 'runtime' | 'logic' | 'type' | 'ai-interpretation';
  suggestions: string[];
  codeContext: string;
  possibleFixes: DebugFix[];
}

export interface DebugFix {
  description: string;
  naturalLanguageDescription: string;
  sunScriptChange: string;
  confidence: number;
  automated: boolean;
}

export class SunScriptDebugger {
  private sessions: Map<string, DebugSession> = new Map();
  private aiProvider: AIProvider;

  constructor(aiProvider: AIProvider) {
    this.aiProvider = aiProvider;
  }

  /**
   * Start a new debugging session
   */
  async startDebugSession(
    sunScriptFile: string, 
    targetFile: string, 
    sourceMapFile?: string
  ): Promise<DebugSession> {
    const sessionId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Load source map or generate one
    let sourceMap: SourceMap;
    if (sourceMapFile && await this.fileExists(sourceMapFile)) {
      sourceMap = await this.loadSourceMap(sourceMapFile);
    } else {
      sourceMap = await this.generateSourceMap(sunScriptFile, targetFile);
    }

    const session: DebugSession = {
      id: sessionId,
      sunScriptFile,
      targetFile,
      sourceMap,
      breakpoints: [],
      variables: [],
      stackTrace: [],
      isRunning: false
    };

    this.sessions.set(sessionId, session);
    
    globalLogger.info('Debug session started', {
      type: 'debugger',
      sessionId,
      sunScriptFile,
      targetFile
    });

    return session;
  }

  /**
   * Generate source map between SunScript and target code
   */
  async generateSourceMap(sunScriptFile: string, targetFile: string): Promise<SourceMap> {
    const sunScriptContent = await fs.readFile(sunScriptFile, 'utf-8');
    const targetContent = await fs.readFile(targetFile, 'utf-8');

    const prompt = `
    Create a source mapping between this SunScript natural language code and its compiled target code.
    Map each meaningful line and provide natural language descriptions.

    SunScript (${sunScriptFile}):
    ${sunScriptContent}

    Target Code (${targetFile}):
    ${targetContent}

    Return JSON mapping in this format:
    {
      "mappings": [
        {
          "sunScriptLine": 1,
          "sunScriptColumn": 0,
          "targetLine": 1,
          "targetColumn": 0,
          "context": "function definition",
          "naturalLanguageDescription": "This function handles user authentication"
        }
      ]
    }
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'json',
        projectName: 'debug-mapping',
        domain: 'debugging'
      }, {
        maxTokens: 1000,
        temperature: 0.1
      });

      const mappingData = JSON.parse(response.code);
      
      return {
        version: 3,
        sources: [sunScriptFile],
        names: [],
        mappings: mappingData.mappings,
        sunScriptContent,
        targetContent
      };

    } catch (error) {
      globalLogger.warn('Failed to generate AI-powered source map, using fallback', {
        type: 'debugger',
        error: (error as Error).message
      });

      return this.generateFallbackSourceMap(sunScriptContent, targetContent, sunScriptFile);
    }
  }

  /**
   * Set a breakpoint in natural language
   */
  async setBreakpoint(
    sessionId: string, 
    sunScriptLine: number, 
    naturalLanguageCondition?: string
  ): Promise<Breakpoint> {
    const session = this.getSession(sessionId);
    
    const breakpointId = `bp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    let compiledCondition: string | undefined;
    if (naturalLanguageCondition) {
      compiledCondition = await this.compileCondition(naturalLanguageCondition);
    }

    const breakpoint: Breakpoint = {
      id: breakpointId,
      sunScriptLine,
      naturalLanguageCondition,
      condition: compiledCondition,
      enabled: true,
      hitCount: 0
    };

    session.breakpoints.push(breakpoint);
    
    globalLogger.info('Breakpoint set', {
      type: 'debugger',
      sessionId,
      line: sunScriptLine,
      condition: naturalLanguageCondition
    });

    return breakpoint;
  }

  /**
   * Translate runtime errors to natural language
   */
  async translateError(
    sessionId: string,
    targetError: Error,
    targetLine: number,
    targetColumn: number
  ): Promise<DebugError> {
    const session = this.getSession(sessionId);
    
    // Find corresponding SunScript line
    const mapping = session.sourceMap.mappings.find(m => 
      m.targetLine === targetLine || Math.abs(m.targetLine - targetLine) <= 2
    );

    const sunScriptLine = mapping?.sunScriptLine || 1;
    const sunScriptColumn = mapping?.sunScriptColumn || 0;

    // Get code context
    const sunScriptLines = session.sourceMap.sunScriptContent.split('\n');
    const contextStart = Math.max(0, sunScriptLine - 3);
    const contextEnd = Math.min(sunScriptLines.length, sunScriptLine + 2);
    const codeContext = sunScriptLines.slice(contextStart, contextEnd).join('\n');

    const prompt = `
    Translate this technical error into natural language for a SunScript developer.
    
    Technical Error: ${targetError.message}
    Error Location: Line ${targetLine}, Column ${targetColumn}
    
    SunScript Context (around line ${sunScriptLine}):
    ${codeContext}
    
    SunScript Description: ${mapping?.naturalLanguageDescription || 'Code execution'}
    
    Provide a natural language explanation and suggest fixes in JSON format:
    {
      "naturalLanguageMessage": "Clear explanation of what went wrong",
      "errorType": "syntax|runtime|logic|type|ai-interpretation",
      "suggestions": ["suggestion1", "suggestion2"],
      "possibleFixes": [
        {
          "description": "Technical fix description",
          "naturalLanguageDescription": "Plain English fix explanation",
          "sunScriptChange": "Suggested change to SunScript code",
          "confidence": 85,
          "automated": true
        }
      ]
    }
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'json',
        projectName: 'error-translation',
        domain: 'debugging'
      }, {
        maxTokens: 600,
        temperature: 0.2
      });

      const errorData = JSON.parse(response.code);

      return {
        message: targetError.message,
        naturalLanguageMessage: errorData.naturalLanguageMessage,
        sunScriptLine,
        sunScriptColumn,
        targetLine,
        targetColumn,
        errorType: errorData.errorType,
        suggestions: errorData.suggestions || [],
        codeContext,
        possibleFixes: errorData.possibleFixes || []
      };

    } catch (error) {
      // Fallback error translation
      return {
        message: targetError.message,
        naturalLanguageMessage: `Something went wrong: ${targetError.message}`,
        sunScriptLine,
        sunScriptColumn,
        targetLine,
        targetColumn,
        errorType: 'runtime',
        suggestions: ['Check the logic in your SunScript code', 'Review the error context'],
        codeContext,
        possibleFixes: []
      };
    }
  }

  /**
   * Get variable state in natural language
   */
  async explainVariableState(
    sessionId: string,
    variableName: string,
    value: any,
    type: string
  ): Promise<VariableState> {
    const prompt = `
    Explain this variable's current state in natural language:
    
    Variable: ${variableName}
    Value: ${JSON.stringify(value)}
    Type: ${type}
    
    Provide a natural language description of what this variable represents and its current state.
    Keep it clear and non-technical.
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'text',
        projectName: 'variable-explanation',
        domain: 'debugging'
      }, {
        maxTokens: 150,
        temperature: 0.3
      });

      return {
        name: variableName,
        value,
        type,
        naturalLanguageDescription: response.code.trim(),
        scope: 'local' // Default, should be determined by debugger
      };

    } catch (error) {
      return {
        name: variableName,
        value,
        type,
        naturalLanguageDescription: `${variableName} contains ${type} value: ${value}`,
        scope: 'local'
      };
    }
  }

  /**
   * Generate debugging suggestions based on current state
   */
  async generateDebuggingSuggestions(
    sessionId: string,
    currentLine: number,
    variables: VariableState[]
  ): Promise<string[]> {
    const session = this.getSession(sessionId);
    
    const mapping = session.sourceMap.mappings.find(m => m.sunScriptLine === currentLine);
    const context = mapping?.naturalLanguageDescription || 'current execution point';
    
    const sunScriptLines = session.sourceMap.sunScriptContent.split('\n');
    const currentLineContent = sunScriptLines[currentLine - 1] || '';
    
    const prompt = `
    Provide debugging suggestions for this SunScript execution point:
    
    Current Line (${currentLine}): ${currentLineContent}
    Context: ${context}
    
    Variables:
    ${variables.map(v => `- ${v.name}: ${v.naturalLanguageDescription}`).join('\n')}
    
    Suggest 3-5 specific debugging actions a developer could take to understand or improve this code.
    Focus on natural language explanations and practical steps.
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'text',
        projectName: 'debug-suggestions',
        domain: 'debugging'
      }, {
        maxTokens: 300,
        temperature: 0.4
      });

      return response.code.split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 10);

    } catch (error) {
      return [
        'Check if all variables have expected values',
        'Verify the logic matches your intended behavior',
        'Consider adding more specific conditions',
        'Review the inputs to this section'
      ];
    }
  }

  /**
   * Interactive debugging REPL
   */
  async startInteractiveDebugger(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    
    console.log(`🐛 SunScript Interactive Debugger`);
    console.log(`📄 Debugging: ${session.sunScriptFile}`);
    console.log(`🎯 Target: ${session.targetFile}`);
    console.log(`📍 Breakpoints: ${session.breakpoints.length}`);
    console.log(`\nCommands:`);
    console.log(`  step - Step to next line`);
    console.log(`  continue - Continue execution`);
    console.log(`  break <line> [condition] - Set breakpoint`);
    console.log(`  vars - Show variables`);
    console.log(`  explain <variable> - Explain variable`);
    console.log(`  suggest - Get debugging suggestions`);
    console.log(`  fix - Get automated fix suggestions`);
    console.log(`  quit - Exit debugger\n`);
  }

  /**
   * Compile natural language condition to executable code
   */
  private async compileCondition(naturalLanguageCondition: string): Promise<string> {
    const prompt = `
    Convert this natural language condition to executable JavaScript:
    
    Natural Language: "${naturalLanguageCondition}"
    
    Return only the JavaScript boolean expression without explanation.
    Use variable names that would be available in the debugging context.
    
    Examples:
    "when user count is greater than 10" -> "userCount > 10"
    "if the result is empty" -> "result === null || result === undefined || result.length === 0"
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'javascript',
        projectName: 'condition-compilation',
        domain: 'debugging'
      }, {
        maxTokens: 100,
        temperature: 0.1
      });

      return response.code.trim().replace(/;$/, '');
    } catch (error) {
      // Fallback: return a safe default condition
      return 'true';
    }
  }

  /**
   * Generate fallback source map using simple line mapping
   */
  private generateFallbackSourceMap(
    sunScriptContent: string, 
    targetContent: string, 
    sunScriptFile: string
  ): SourceMap {
    const sunScriptLines = sunScriptContent.split('\n');
    const targetLines = targetContent.split('\n');
    
    const mappings: SourceMapping[] = [];
    
    // Simple 1:1 line mapping as fallback
    const maxLines = Math.min(sunScriptLines.length, targetLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const sunLine = sunScriptLines[i].trim();
      const targetLine = targetLines[i].trim();
      
      if (sunLine && targetLine) {
        mappings.push({
          sunScriptLine: i + 1,
          sunScriptColumn: 0,
          targetLine: i + 1,
          targetColumn: 0,
          context: 'code line',
          naturalLanguageDescription: sunLine
        });
      }
    }

    return {
      version: 3,
      sources: [sunScriptFile],
      names: [],
      mappings,
      sunScriptContent,
      targetContent
    };
  }

  private async loadSourceMap(sourceMapFile: string): Promise<SourceMap> {
    const content = await fs.readFile(sourceMapFile, 'utf-8');
    return JSON.parse(content);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private getSession(sessionId: string): DebugSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SunScriptError(
        ErrorCode.INVALID_CONFIG,
        `Debug session not found: ${sessionId}`,
        { suggestions: ['Start a new debug session first'] }
      );
    }
    return session;
  }

  /**
   * End debugging session and cleanup
   */
  async endDebugSession(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    this.sessions.delete(sessionId);
    
    globalLogger.info('Debug session ended', {
      type: 'debugger',
      sessionId,
      breakpointsHit: session.breakpoints.reduce((sum, bp) => sum + bp.hitCount, 0)
    });
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): DebugSession[] {
    return Array.from(this.sessions.values());
  }
}