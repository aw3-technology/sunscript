import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { FunctionDeclaration, ComponentDeclaration, APIDeclaration } from '../types/ast';

export interface FileChange {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  timestamp: number;
  hash: string;
  changedElements: ElementChange[];
}

export interface ElementChange {
  type: 'function' | 'component' | 'api' | 'model' | 'directive';
  name: string;
  changeType: 'added' | 'modified' | 'deleted';
  startLine: number;
  endLine: number;
  oldHash?: string;
  newHash: string;
  dependencies: string[];
}

export interface CompilationCache {
  version: string;
  files: Map<string, FileMetadata>;
  dependencies: Map<string, string[]>;
  lastBuild: number;
}

export interface FileMetadata {
  path: string;
  hash: string;
  lastModified: number;
  elements: Map<string, ElementMetadata>;
  imports: string[];
  exports: string[];
}

export interface ElementMetadata {
  name: string;
  type: string;
  hash: string;
  startLine: number;
  endLine: number;
  dependencies: string[];
  outputFiles: string[];
}

export class ChangeDetector {
  private cacheFile: string;
  private cache: CompilationCache;

  constructor(projectRoot: string) {
    this.cacheFile = path.join(projectRoot, '.sunscript-cache.json');
    this.cache = {
      version: '1.0.0',
      files: new Map(),
      dependencies: new Map(),
      lastBuild: 0
    };
  }

  async loadCache(): Promise<void> {
    try {
      const cacheData = await fs.readFile(this.cacheFile, 'utf-8');
      const parsed = JSON.parse(cacheData);
      
      // Convert arrays back to Maps
      this.cache = {
        ...parsed,
        files: new Map(parsed.files || []),
        dependencies: new Map(parsed.dependencies || [])
      };

      // Convert element maps
      for (const [filePath, metadata] of this.cache.files) {
        metadata.elements = new Map(metadata.elements || []);
      }
    } catch (error) {
      // Cache doesn't exist or is corrupted, start fresh
      this.cache = {
        version: '1.0.0',
        files: new Map(),
        dependencies: new Map(),
        lastBuild: 0
      };
    }
  }

  async saveCache(): Promise<void> {
    // Convert Maps to arrays for JSON serialization
    const serializable = {
      ...this.cache,
      files: Array.from(this.cache.files.entries()).map(([path, metadata]) => [
        path,
        {
          ...metadata,
          elements: Array.from(metadata.elements.entries())
        }
      ]),
      dependencies: Array.from(this.cache.dependencies.entries())
    };

    await fs.writeFile(this.cacheFile, JSON.stringify(serializable, null, 2));
  }

  async detectChanges(sourceFiles: string[]): Promise<FileChange[]> {
    const changes: FileChange[] = [];
    const currentFiles = new Set(sourceFiles);
    const cachedFiles = new Set(this.cache.files.keys());

    // Detect new and modified files
    for (const filePath of sourceFiles) {
      const currentHash = await this.calculateFileHash(filePath);
      const cached = this.cache.files.get(filePath);

      if (!cached) {
        // New file
        const elementChanges = await this.analyzeFileElements(filePath);
        changes.push({
          filePath,
          changeType: 'added',
          timestamp: Date.now(),
          hash: currentHash,
          changedElements: elementChanges
        });
      } else if (cached.hash !== currentHash) {
        // Modified file
        const elementChanges = await this.detectElementChanges(filePath, cached);
        changes.push({
          filePath,
          changeType: 'modified',
          timestamp: Date.now(),
          hash: currentHash,
          changedElements: elementChanges
        });
      }
    }

    // Detect deleted files
    for (const cachedPath of cachedFiles) {
      if (!currentFiles.has(cachedPath)) {
        const cached = this.cache.files.get(cachedPath)!;
        const elementChanges = Array.from(cached.elements.values()).map(element => ({
          type: element.type as any,
          name: element.name,
          changeType: 'deleted' as const,
          startLine: element.startLine,
          endLine: element.endLine,
          newHash: '',
          dependencies: element.dependencies
        }));

        changes.push({
          filePath: cachedPath,
          changeType: 'deleted',
          timestamp: Date.now(),
          hash: '',
          changedElements: elementChanges
        });
      }
    }

    return changes;
  }

  async updateCache(filePath: string, elements: ElementMetadata[]): Promise<void> {
    const hash = await this.calculateFileHash(filePath);
    const stats = await fs.stat(filePath);
    
    const elementMap = new Map<string, ElementMetadata>();
    for (const element of elements) {
      elementMap.set(element.name, element);
    }

    this.cache.files.set(filePath, {
      path: filePath,
      hash,
      lastModified: stats.mtime.getTime(),
      elements: elementMap,
      imports: [], // Will be populated by parser
      exports: []  // Will be populated by parser
    });

    this.cache.lastBuild = Date.now();
  }

  async findDependents(elementName: string, elementFile: string): Promise<string[]> {
    const dependents: string[] = [];

    for (const [filePath, metadata] of this.cache.files) {
      if (filePath === elementFile) continue;

      for (const [, element] of metadata.elements) {
        if (element.dependencies.includes(elementName)) {
          dependents.push(filePath);
          break;
        }
      }
    }

    return dependents;
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  }

  private async analyzeFileElements(filePath: string): Promise<ElementChange[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const elements: ElementChange[] = [];

    // Simple pattern-based detection (would be replaced with proper parsing)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('function ')) {
        const match = line.match(/function\s+(\w+)/);
        if (match) {
          const endLine = this.findElementEnd(lines, i);
          elements.push({
            type: 'function',
            name: match[1],
            changeType: 'added',
            startLine: i + 1,
            endLine,
            newHash: this.calculateElementHash(lines.slice(i, endLine).join('\n')),
            dependencies: this.extractDependencies(lines.slice(i, endLine))
          });
        }
      } else if (line.startsWith('component ')) {
        const match = line.match(/component\s+(\w+)/);
        if (match) {
          const endLine = this.findElementEnd(lines, i);
          elements.push({
            type: 'component',
            name: match[1],
            changeType: 'added',
            startLine: i + 1,
            endLine,
            newHash: this.calculateElementHash(lines.slice(i, endLine).join('\n')),
            dependencies: this.extractDependencies(lines.slice(i, endLine))
          });
        }
      }
    }

    return elements;
  }

  private async detectElementChanges(filePath: string, cached: FileMetadata): Promise<ElementChange[]> {
    const currentElements = await this.analyzeFileElements(filePath);
    const changes: ElementChange[] = [];
    
    const currentNames = new Set(currentElements.map(e => e.name));
    const cachedNames = new Set(Array.from(cached.elements.keys()));

    // Check for new and modified elements
    for (const current of currentElements) {
      const cachedElement = cached.elements.get(current.name);
      
      if (!cachedElement) {
        changes.push(current);
      } else if (cachedElement.hash !== current.newHash) {
        changes.push({
          ...current,
          changeType: 'modified',
          oldHash: cachedElement.hash
        });
      }
    }

    // Check for deleted elements
    for (const cachedName of cachedNames) {
      if (!currentNames.has(cachedName)) {
        const cachedElement = cached.elements.get(cachedName)!;
        changes.push({
          type: cachedElement.type as any,
          name: cachedName,
          changeType: 'deleted',
          startLine: cachedElement.startLine,
          endLine: cachedElement.endLine,
          newHash: '',
          dependencies: cachedElement.dependencies
        });
      }
    }

    return changes;
  }

  private findElementEnd(lines: string[], startLine: number): number {
    let braceCount = 0;
    let foundOpenBrace = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          foundOpenBrace = true;
        } else if (char === '}') {
          braceCount--;
          if (foundOpenBrace && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }

    return lines.length;
  }

  private calculateElementHash(content: string): string {
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  private extractDependencies(lines: string[]): string[] {
    const dependencies: string[] = [];
    const content = lines.join('\n');
    
    // Extract function calls and references
    const functionCalls = content.match(/\b[a-zA-Z_]\w*(?=\s*\()/g) || [];
    const references = content.match(/\b[A-Z]\w*\b/g) || [];
    
    dependencies.push(...functionCalls, ...references);
    return Array.from(new Set(dependencies));
  }

  getCache(): CompilationCache {
    return this.cache;
  }

  async clearCache(): Promise<void> {
    this.cache = {
      version: '1.0.0',
      files: new Map(),
      dependencies: new Map(),
      lastBuild: 0
    };
    
    try {
      await fs.unlink(this.cacheFile);
    } catch {
      // Cache file doesn't exist, that's fine
    }
  }
}