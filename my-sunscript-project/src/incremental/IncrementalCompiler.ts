import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { ChangeDetector, FileChange, ElementMetadata } from './ChangeDetector';
import { IncrementalGenerator, IncrementalResult } from './IncrementalGenerator';
import { SunScriptCompiler } from '../compiler/Compiler';
import { CompilerConfig, CompilationResult, AIContext } from '../types';
import { glob } from 'glob';
import chalk from 'chalk';

export interface IncrementalCompilationOptions {
  forceFullBuild?: boolean;
  verbose?: boolean;
  watchMode?: boolean;
}

export interface IncrementalCompilationResult {
  success: boolean;
  incrementalResult?: IncrementalResult;
  fullBuildResult?: CompilationResult;
  changesSummary: string;
  compilationTime: number;
  cacheHit: boolean;
}

export class IncrementalCompiler extends EventEmitter {
  private changeDetector: ChangeDetector;
  private incrementalGenerator: IncrementalGenerator;
  private baseCompiler: SunScriptCompiler;
  private sourceRoot: string;
  private outputRoot: string;

  constructor(
    private config: CompilerConfig,
    sourceRoot: string,
    outputRoot: string
  ) {
    super();
    
    this.sourceRoot = sourceRoot;
    this.outputRoot = outputRoot;
    this.changeDetector = new ChangeDetector(path.dirname(sourceRoot));
    
    const context: AIContext = {
      targetLanguage: config.targetLanguage,
      projectName: 'incremental-project',
      fileName: '',
      filePath: '',
      domain: config.domain
    };
    
    this.incrementalGenerator = new IncrementalGenerator(config.aiProvider, context);
    this.baseCompiler = new SunScriptCompiler(config);
  }

  async compile(options: IncrementalCompilationOptions = {}): Promise<IncrementalCompilationResult> {
    const startTime = Date.now();
    
    this.emit('compile:start', { incremental: !options.forceFullBuild });
    
    try {
      // Load compilation cache
      await this.changeDetector.loadCache();
      
      // Find all SunScript files
      const sourceFiles = await this.findSourceFiles();
      
      if (options.verbose) {
        console.log(chalk.cyan(`📁 Found ${sourceFiles.length} source files`));
      }
      
      // Detect changes
      const changes = await this.changeDetector.detectChanges(sourceFiles);
      
      if (changes.length === 0 && !options.forceFullBuild) {
        this.emit('compile:no-changes');
        return {
          success: true,
          changesSummary: 'No changes detected',
          compilationTime: Date.now() - startTime,
          cacheHit: true
        };
      }
      
      const changesSummary = this.generateChangesSummary(changes);
      
      if (options.verbose) {
        console.log(chalk.yellow('🔍 Changes detected:'));
        console.log(changesSummary);
      }
      
      // Decide between incremental and full build
      const shouldDoIncrementalBuild = this.shouldUseIncrementalBuild(changes, options);
      
      if (shouldDoIncrementalBuild) {
        return await this.performIncrementalBuild(changes, changesSummary, startTime, options);
      } else {
        return await this.performFullBuild(sourceFiles, changesSummary, startTime, options);
      }
      
    } catch (error) {
      this.emit('compile:error', { error });
      throw error;
    }
  }

  private async performIncrementalBuild(
    changes: FileChange[],
    changesSummary: string,
    startTime: number,
    options: IncrementalCompilationOptions
  ): Promise<IncrementalCompilationResult> {
    
    console.log(chalk.blue('⚡ Performing incremental build...'));
    
    // Build dependency map
    const dependencyMap = await this.buildDependencyMap(changes);
    
    // Generate incremental changes
    const incrementalResult = await this.incrementalGenerator.generateIncremental(
      changes,
      dependencyMap
    );
    
    // Update cache with new metadata
    await this.updateCacheForChanges(changes);
    await this.changeDetector.saveCache();
    
    this.emit('compile:incremental-success', { 
      result: incrementalResult,
      changes: changes.length 
    });
    
    if (options.verbose) {
      this.logIncrementalResults(incrementalResult);
    }
    
    return {
      success: true,
      incrementalResult,
      changesSummary,
      compilationTime: Date.now() - startTime,
      cacheHit: false
    };
  }

  private async performFullBuild(
    sourceFiles: string[],
    changesSummary: string,
    startTime: number,
    options: IncrementalCompilationOptions
  ): Promise<IncrementalCompilationResult> {
    
    console.log(chalk.blue('🔄 Performing full build...'));
    
    // Clear cache and perform full compilation
    await this.changeDetector.clearCache();
    
    const results: CompilationResult[] = [];
    
    for (const file of sourceFiles) {
      const result = await this.baseCompiler.compileFile(file);
      results.push(result);
      
      // Update cache with compiled file metadata
      await this.updateCacheForFile(file);
    }
    
    await this.changeDetector.saveCache();
    
    this.emit('compile:full-success', { 
      files: sourceFiles.length,
      results 
    });
    
    if (options.verbose) {
      console.log(chalk.green(`✅ Full build completed: ${sourceFiles.length} files compiled`));
    }
    
    return {
      success: true,
      fullBuildResult: this.combineResults(results),
      changesSummary,
      compilationTime: Date.now() - startTime,
      cacheHit: false
    };
  }

  private shouldUseIncrementalBuild(
    changes: FileChange[],
    options: IncrementalCompilationOptions
  ): boolean {
    if (options.forceFullBuild) {
      return false;
    }
    
    // Use incremental build if:
    // 1. Less than 20% of files changed
    // 2. No structural changes (like new dependencies)
    // 3. Cache exists and is valid
    
    const cache = this.changeDetector.getCache();
    const totalFiles = cache.files.size;
    const changedFiles = changes.length;
    
    if (totalFiles === 0) {
      return false; // No cache, need full build
    }
    
    const changeRatio = changedFiles / totalFiles;
    
    if (changeRatio > 0.2) {
      console.log(chalk.yellow(`📊 Change ratio ${(changeRatio * 100).toFixed(1)}% > 20%, using full build`));
      return false;
    }
    
    // Check for structural changes
    const hasStructuralChanges = changes.some(change => 
      change.changeType === 'added' || 
      change.changeType === 'deleted' ||
      change.changedElements.some(element => 
        element.changeType === 'added' || element.changeType === 'deleted'
      )
    );
    
    if (hasStructuralChanges) {
      console.log(chalk.yellow('🏗️ Structural changes detected, using full build'));
      return false;
    }
    
    return true;
  }

  private async findSourceFiles(): Promise<string[]> {
    const pattern = path.join(this.sourceRoot, '**/*.sun');
    return await glob(pattern);
  }

  private async buildDependencyMap(changes: FileChange[]): Promise<Map<string, string[]>> {
    const dependencyMap = new Map<string, string[]>();
    
    for (const change of changes) {
      for (const element of change.changedElements) {
        const dependents = await this.changeDetector.findDependents(
          element.name,
          change.filePath
        );
        dependencyMap.set(element.name, dependents);
      }
    }
    
    return dependencyMap;
  }

  private async updateCacheForChanges(changes: FileChange[]): Promise<void> {
    for (const change of changes) {
      if (change.changeType !== 'deleted') {
        await this.updateCacheForFile(change.filePath);
      }
    }
  }

  private async updateCacheForFile(filePath: string): Promise<void> {
    // This would analyze the file and extract element metadata
    // For now, we'll create mock metadata
    const elements: ElementMetadata[] = [
      {
        name: 'mockElement',
        type: 'function',
        hash: 'mockhash',
        startLine: 1,
        endLine: 10,
        dependencies: [],
        outputFiles: []
      }
    ];
    
    await this.changeDetector.updateCache(filePath, elements);
  }

  private generateChangesSummary(changes: FileChange[]): string {
    const summary = [];
    
    const added = changes.filter(c => c.changeType === 'added').length;
    const modified = changes.filter(c => c.changeType === 'modified').length;
    const deleted = changes.filter(c => c.changeType === 'deleted').length;
    
    if (added > 0) summary.push(`${added} added`);
    if (modified > 0) summary.push(`${modified} modified`);
    if (deleted > 0) summary.push(`${deleted} deleted`);
    
    return summary.join(', ') || 'No changes';
  }

  private logIncrementalResults(result: IncrementalResult): void {
    console.log(chalk.green('✅ Incremental compilation completed:'));
    console.log(chalk.gray(`   Modified files: ${result.modifiedFiles.length}`));
    console.log(chalk.gray(`   Added files: ${result.addedFiles.length}`));
    console.log(chalk.gray(`   Deleted files: ${result.deletedFiles.length}`));
    console.log(chalk.gray(`   Affected elements: ${result.affectedElements.length}`));
    console.log(chalk.gray(`   Compilation time: ${result.compilationTime}ms`));
  }

  private combineResults(results: CompilationResult[]): CompilationResult {
    // Combine multiple compilation results into one
    const combined: CompilationResult = {
      code: {},
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        compiledAt: new Date().toISOString(),
        sourceFiles: [],
        warnings: [],
        targetLanguage: this.config.targetLanguage,
        optimizations: []
      }
    };
    
    for (const result of results) {
      Object.assign(combined.code, result.code);
      if (result.metadata.sourceFiles) {
        combined.metadata.sourceFiles!.push(...result.metadata.sourceFiles);
      }
      combined.metadata.warnings.push(...result.metadata.warnings);
    }
    
    return combined;
  }

  async enableWatchMode(): Promise<void> {
    const chokidar = await import('chokidar');
    
    const watcher = chokidar.watch(path.join(this.sourceRoot, '**/*.sun'), {
      persistent: true,
      ignoreInitial: true
    });
    
    console.log(chalk.blue('👀 Watch mode enabled'));
    
    watcher.on('change', async (filePath) => {
      console.log(chalk.yellow(`📝 File changed: ${path.relative(this.sourceRoot, filePath)}`));
      
      try {
        const result = await this.compile({ verbose: false });
        if (result.success) {
          console.log(chalk.green(`⚡ Incremental build completed in ${result.compilationTime}ms`));
        }
      } catch (error) {
        console.error(chalk.red(`❌ Compilation failed: ${(error as Error).message}`));
      }
    });
    
    watcher.on('add', async (filePath) => {
      console.log(chalk.green(`➕ New file: ${path.relative(this.sourceRoot, filePath)}`));
      await this.compile({ verbose: false });
    });
    
    watcher.on('unlink', async (filePath) => {
      console.log(chalk.red(`➖ Deleted file: ${path.relative(this.sourceRoot, filePath)}`));
      await this.compile({ verbose: false });
    });
  }
}