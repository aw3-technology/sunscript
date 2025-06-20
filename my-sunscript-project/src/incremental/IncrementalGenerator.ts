import * as fs from 'fs/promises';
import * as path from 'path';
import { CodeGenerator } from '../generator/CodeGenerator';
import { AIProvider } from '../ai/AIProvider';
import { FunctionDeclaration, ComponentDeclaration } from '../types/ast';
import { FileChange, ElementChange, ElementMetadata } from './ChangeDetector';
import { CompilationResult, AIContext } from '../types';

export interface IncrementalResult {
  modifiedFiles: string[];
  addedFiles: string[];
  deletedFiles: string[];
  affectedElements: string[];
  compilationTime: number;
}

export interface OutputFileSection {
  type: 'import' | 'function' | 'class' | 'export' | 'other';
  elementName?: string;
  startLine: number;
  endLine: number;
  content: string;
  hash: string;
}

export class IncrementalGenerator {
  private baseGenerator: CodeGenerator;
  private outputSections: Map<string, OutputFileSection[]> = new Map();

  constructor(aiProvider: AIProvider, private context: AIContext) {
    this.baseGenerator = new CodeGenerator(aiProvider, {
      targetLanguage: context.targetLanguage
    });
  }

  async generateIncremental(
    changes: FileChange[],
    dependentElements: Map<string, string[]>
  ): Promise<IncrementalResult> {
    const startTime = Date.now();
    const result: IncrementalResult = {
      modifiedFiles: [],
      addedFiles: [],
      deletedFiles: [],
      affectedElements: [],
      compilationTime: 0
    };

    // Process each changed file
    for (const change of changes) {
      switch (change.changeType) {
        case 'added':
          await this.handleNewFile(change, result);
          break;
        case 'modified':
          await this.handleModifiedFile(change, dependentElements, result);
          break;
        case 'deleted':
          await this.handleDeletedFile(change, result);
          break;
      }
    }

    result.compilationTime = Date.now() - startTime;
    return result;
  }

  private async handleNewFile(change: FileChange, result: IncrementalResult): Promise<void> {
    // Generate complete file for new SunScript file
    const outputPath = this.getOutputPath(change.filePath);
    
    console.log(`📄 Generating new file: ${outputPath}`);
    
    // Parse and generate the entire file
    const ast = await this.parseFile(change.filePath);
    const generatedCode = await this.baseGenerator.generate(ast, this.context);
    
    // Analyze the generated code into sections
    const sections = this.analyzeOutputSections(generatedCode.code);
    this.outputSections.set(outputPath, sections);
    
    // Write the output file
    await this.writeOutputFile(outputPath, generatedCode.code);
    
    result.addedFiles.push(outputPath);
    result.affectedElements.push(...change.changedElements.map(e => e.name));
  }

  private async handleModifiedFile(
    change: FileChange, 
    dependentElements: Map<string, string[]>,
    result: IncrementalResult
  ): Promise<void> {
    const outputPath = this.getOutputPath(change.filePath);
    
    console.log(`🔄 Updating modified elements in: ${outputPath}`);
    
    // Load existing output file sections
    await this.loadExistingOutputSections(outputPath);
    
    for (const elementChange of change.changedElements) {
      await this.updateElement(elementChange, outputPath, result);
      
      // Update dependent elements
      const dependents = dependentElements.get(elementChange.name) || [];
      for (const dependent of dependents) {
        await this.updateDependentElement(dependent, outputPath, result);
      }
    }
    
    // Rebuild the output file from updated sections
    await this.rebuildOutputFile(outputPath);
    result.modifiedFiles.push(outputPath);
  }

  private async handleDeletedFile(change: FileChange, result: IncrementalResult): Promise<void> {
    const outputPath = this.getOutputPath(change.filePath);
    
    console.log(`🗑️ Removing deleted file: ${outputPath}`);
    
    try {
      await fs.unlink(outputPath);
      this.outputSections.delete(outputPath);
      result.deletedFiles.push(outputPath);
    } catch (error) {
      // File might not exist in output, that's okay
    }
  }

  private async updateElement(
    elementChange: ElementChange, 
    outputPath: string, 
    result: IncrementalResult
  ): Promise<void> {
    const sections = this.outputSections.get(outputPath) || [];
    
    if (elementChange.changeType === 'deleted') {
      // Remove the element's section
      const filteredSections = sections.filter(s => s.elementName !== elementChange.name);
      this.outputSections.set(outputPath, filteredSections);
      
    } else if (elementChange.changeType === 'added' || elementChange.changeType === 'modified') {
      // Generate new code for the element
      const newCode = await this.generateElementCode(elementChange);
      
      // Find and replace the existing section, or add new one
      const existingIndex = sections.findIndex(s => s.elementName === elementChange.name);
      
      const newSection: OutputFileSection = {
        type: elementChange.type === 'function' ? 'function' : 'class',
        elementName: elementChange.name,
        startLine: 0, // Will be recalculated
        endLine: 0,   // Will be recalculated
        content: newCode,
        hash: elementChange.newHash
      };
      
      if (existingIndex >= 0) {
        sections[existingIndex] = newSection;
      } else {
        sections.push(newSection);
      }
      
      this.outputSections.set(outputPath, sections);
    }
    
    result.affectedElements.push(elementChange.name);
  }

  private async updateDependentElement(
    dependentName: string, 
    outputPath: string, 
    result: IncrementalResult
  ): Promise<void> {
    // Find the dependent element and regenerate it
    const sections = this.outputSections.get(outputPath) || [];
    const dependentSection = sections.find(s => s.elementName === dependentName);
    
    if (dependentSection) {
      console.log(`🔗 Updating dependent element: ${dependentName}`);
      
      // Regenerate the dependent element
      const elementChange: ElementChange = {
        type: dependentSection.type === 'function' ? 'function' : 'component',
        name: dependentName,
        changeType: 'modified',
        startLine: dependentSection.startLine,
        endLine: dependentSection.endLine,
        newHash: '', // Will be recalculated
        dependencies: []
      };
      
      await this.updateElement(elementChange, outputPath, result);
    }
  }

  private async generateElementCode(elementChange: ElementChange): Promise<string> {
    // This is a simplified version - in practice, you'd parse the specific element
    // and generate code just for that element
    
    if (elementChange.type === 'function') {
      return await this.generateFunctionCode(elementChange);
    } else if (elementChange.type === 'component') {
      return await this.generateComponentCode(elementChange);
    }
    
    return '';
  }

  private async generateFunctionCode(elementChange: ElementChange): Promise<string> {
    // Simulate generating code for a single function
    const prompt = `Generate ${this.context.targetLanguage} code for a function named ${elementChange.name}`;
    
    const response = await this.baseGenerator['aiProvider'].generateCode(prompt, {
      targetLanguage: this.context.targetLanguage,
      maxTokens: 200
    });
    
    return this.cleanGeneratedCode(response.code);
  }

  private async generateComponentCode(elementChange: ElementChange): Promise<string> {
    // Simulate generating code for a single component
    const prompt = `Generate ${this.context.targetLanguage} code for a component named ${elementChange.name}`;
    
    const response = await this.baseGenerator['aiProvider'].generateCode(prompt, {
      targetLanguage: this.context.targetLanguage,
      maxTokens: 300
    });
    
    return this.cleanGeneratedCode(response.code);
  }

  private cleanGeneratedCode(code: string): string {
    // Remove markdown code blocks and clean up
    return code
      .replace(/```[\w]*\n?/g, '')
      .replace(/^\s*\n/gm, '')
      .trim();
  }

  private async loadExistingOutputSections(outputPath: string): Promise<void> {
    if (this.outputSections.has(outputPath)) {
      return; // Already loaded
    }

    try {
      const content = await fs.readFile(outputPath, 'utf-8');
      const sections = this.analyzeOutputSections({ [path.basename(outputPath)]: content });
      this.outputSections.set(outputPath, sections);
    } catch (error) {
      // File doesn't exist yet, start with empty sections
      this.outputSections.set(outputPath, []);
    }
  }

  private analyzeOutputSections(generatedCode: Record<string, string>): OutputFileSection[] {
    const sections: OutputFileSection[] = [];
    
    // For each generated file, analyze its structure
    for (const [fileName, code] of Object.entries(generatedCode)) {
      const lines = code.split('\n');
      let currentSection: Partial<OutputFileSection> | null = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detect function definitions
        if (line.match(/^(function|const|let|var)\s+\w+|^export\s+(function|const)/)) {
          if (currentSection) {
            // Save previous section
            currentSection.endLine = i;
            sections.push(currentSection as OutputFileSection);
          }
          
          // Start new section
          const functionMatch = line.match(/(?:function|const|let|var|export\s+(?:function|const))\s+(\w+)/);
          currentSection = {
            type: 'function',
            elementName: functionMatch ? functionMatch[1] : `unnamed_${i}`,
            startLine: i,
            content: '',
            hash: ''
          };
        }
        
        // Detect class definitions
        else if (line.match(/^class\s+\w+|^export\s+class/)) {
          if (currentSection) {
            currentSection.endLine = i;
            sections.push(currentSection as OutputFileSection);
          }
          
          const classMatch = line.match(/(?:class|export\s+class)\s+(\w+)/);
          currentSection = {
            type: 'class',
            elementName: classMatch ? classMatch[1] : `unnamed_class_${i}`,
            startLine: i,
            content: '',
            hash: ''
          };
        }
      }
      
      // Close final section
      if (currentSection) {
        currentSection.endLine = lines.length;
        sections.push(currentSection as OutputFileSection);
      }
      
      // Calculate content and hashes for each section
      for (const section of sections) {
        section.content = lines.slice(section.startLine, section.endLine).join('\n');
        section.hash = this.calculateHash(section.content);
      }
    }
    
    return sections;
  }

  private async rebuildOutputFile(outputPath: string): Promise<void> {
    const sections = this.outputSections.get(outputPath) || [];
    
    // Sort sections by type for better organization
    const sortedSections = sections.sort((a, b) => {
      const order = { import: 0, function: 1, class: 2, export: 3, other: 4 };
      return order[a.type] - order[b.type];
    });
    
    // Rebuild file content
    const content = sortedSections.map(section => section.content).join('\n\n');
    
    await this.writeOutputFile(outputPath, { [path.basename(outputPath)]: content });
  }

  private async writeOutputFile(outputPath: string, code: Record<string, string>): Promise<void> {
    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Write each generated file
    for (const [fileName, content] of Object.entries(code)) {
      const filePath = path.join(path.dirname(outputPath), fileName);
      await fs.writeFile(filePath, content, 'utf-8');
    }
  }

  private getOutputPath(sunscriptPath: string): string {
    // Convert .sun file path to output file path
    const ext = this.getTargetExtension();
    const baseName = path.basename(sunscriptPath, '.sun');
    const dirName = path.dirname(sunscriptPath);
    
    return path.join(dirName.replace('/src/', '/dist/'), `${baseName}.${ext}`);
  }

  private getTargetExtension(): string {
    switch (this.context.targetLanguage) {
      case 'typescript': return 'ts';
      case 'python': return 'py';
      case 'html': return 'html';
      default: return 'js';
    }
  }

  private calculateHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  private async parseFile(filePath: string): Promise<any> {
    // This would use the actual SunScript parser
    // For now, return a mock AST
    return {
      type: 'Program',
      body: [],
      metadata: { version: '1.0.0' }
    };
  }
}