import { AIProvider } from '../ai/AIProvider';
import { GenesisProgram, CompilationResult, AIContext, TargetLanguage } from '../types';
import { MultiPromptGenerator, ComponentGenerationPlan, GenerationContext } from './MultiPromptGenerator';
import { outputFileOps } from '../security';
import { globalLogger } from '../errors/Logger';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface ProjectStructure {
  folders: FolderStructure[];
  files: FileStructure[];
  entrypoints: string[];
  buildTargets: string[];
}

export interface FolderStructure {
  path: string;
  purpose: string;
  components: string[];
  dependencies: string[];
}

export interface FileStructure {
  path: string;
  type: 'component' | 'api' | 'service' | 'util' | 'config' | 'test' | 'doc';
  componentName: string;
  dependencies: string[];
  exports: string[];
}

export interface ProjectGenerationResult extends CompilationResult {
  projectStructure: ProjectStructure;
  foldersCreated: string[];
  filesGenerated: string[];
  entrypoints: Record<string, string>;
}

/**
 * Enhanced generator for creating multi-folder, multi-file project structures
 * from genesis.sun files
 */
export class ProjectStructureGenerator extends MultiPromptGenerator {
  constructor(aiProvider: AIProvider, config: any = {}) {
    super(aiProvider, config);
  }

  // Access aiProvider through protected getter
  protected getAIProvider(): AIProvider {
    return (this as any).aiProvider;
  }

  async generateProject(
    genesisProgram: GenesisProgram, 
    outputDir: string = 'dist'
  ): Promise<ProjectGenerationResult> {
    const startTime = Date.now();
    
    globalLogger.info('Starting project structure generation', {
      projectName: genesisProgram.projectName,
      outputDir,
      hasEntrypoints: genesisProgram.entrypoints?.length || 0
    });

    // Phase 1: Analyze genesis.sun and plan project structure
    const projectStructure = await this.planProjectStructure(genesisProgram);
    
    // Phase 2: Create folder hierarchy
    const foldersCreated = await this.createFolderStructure(projectStructure, outputDir);
    
    // Phase 3: Generate components with proper file placement
    const generationResult = await this.generateProjectComponents(
      genesisProgram, 
      projectStructure, 
      outputDir
    );
    
    // Phase 4: Create entrypoints and build configuration
    const entrypoints = await this.generateEntrypoints(
      genesisProgram, 
      projectStructure, 
      outputDir
    );
    
    // Phase 5: Generate project configuration files
    await this.generateProjectConfig(genesisProgram, projectStructure, outputDir);

    const result: ProjectGenerationResult = {
      ...generationResult,
      projectStructure,
      foldersCreated,
      filesGenerated: Object.keys(generationResult.code),
      entrypoints
    };

    globalLogger.info('Project structure generation completed', {
      projectName: genesisProgram.projectName,
      duration: Date.now() - startTime,
      foldersCreated: foldersCreated.length,
      filesGenerated: result.filesGenerated.length
    });

    return result;
  }

  private async planProjectStructure(genesisProgram: GenesisProgram): Promise<ProjectStructure> {
    globalLogger.info('Planning project structure', {
      projectName: genesisProgram.projectName
    });

    // TODO: In the future, analyze the genesis program with AI to determine optimal folder structure
    // For now, use a default structure based on target language
    const structure: ProjectStructure = {
      folders: this.generateDefaultFolderStructure(genesisProgram),
      files: [],
      entrypoints: genesisProgram.entrypoints?.map(ep => ep.name) || ['main'],
      buildTargets: genesisProgram.buildConfig?.targets || ['development', 'production']
    };

    return structure;
  }

  private generateDefaultFolderStructure(genesisProgram: GenesisProgram): FolderStructure[] {
    const targetLanguage = this.getTargetLanguage(genesisProgram);
    const isWebProject = targetLanguage === 'typescript' || targetLanguage === 'javascript';
    const isPythonProject = targetLanguage === 'python';

    const baseFolders: FolderStructure[] = [
      {
        path: 'src',
        purpose: 'Source code',
        components: ['components', 'services', 'utils'],
        dependencies: []
      }
    ];

    if (isWebProject) {
      baseFolders.push(
        {
          path: 'src/components',
          purpose: 'React/UI components',
          components: [],
          dependencies: ['src/types', 'src/hooks']
        },
        {
          path: 'src/pages',
          purpose: 'Page components and routing',
          components: [],
          dependencies: ['src/components', 'src/services']
        },
        {
          path: 'src/services',
          purpose: 'Business logic and API services',
          components: [],
          dependencies: ['src/types', 'src/utils']
        },
        {
          path: 'src/hooks',
          purpose: 'Custom React hooks',
          components: [],
          dependencies: ['src/types']
        },
        {
          path: 'src/types',
          purpose: 'TypeScript type definitions',
          components: [],
          dependencies: []
        },
        {
          path: 'src/utils',
          purpose: 'Utility functions and helpers',
          components: [],
          dependencies: []
        },
        {
          path: 'src/styles',
          purpose: 'CSS and styling files',
          components: [],
          dependencies: []
        },
        {
          path: 'public',
          purpose: 'Static assets',
          components: [],
          dependencies: []
        }
      );
    } else if (isPythonProject) {
      baseFolders.push(
        {
          path: `src/${genesisProgram.projectName.replace(/[-\s]/g, '_').toLowerCase()}`,
          purpose: 'Main package',
          components: ['core', 'services', 'utils'],
          dependencies: []
        },
        {
          path: `src/${genesisProgram.projectName.replace(/[-\s]/g, '_').toLowerCase()}/core`,
          purpose: 'Core business logic',
          components: [],
          dependencies: []
        },
        {
          path: `src/${genesisProgram.projectName.replace(/[-\s]/g, '_').toLowerCase()}/services`,
          purpose: 'Service layer',
          components: [],
          dependencies: ['core']
        },
        {
          path: `src/${genesisProgram.projectName.replace(/[-\s]/g, '_').toLowerCase()}/utils`,
          purpose: 'Utility functions',
          components: [],
          dependencies: []
        },
        {
          path: 'tests',
          purpose: 'Test files',
          components: [],
          dependencies: ['src']
        }
      );
    }

    // Add common folders
    baseFolders.push(
      {
        path: 'docs',
        purpose: 'Documentation',
        components: [],
        dependencies: []
      },
      {
        path: 'scripts',
        purpose: 'Build and deployment scripts',
        components: [],
        dependencies: []
      }
    );

    return baseFolders;
  }

  private async createFolderStructure(
    structure: ProjectStructure, 
    outputDir: string
  ): Promise<string[]> {
    const foldersCreated: string[] = [];

    for (const folder of structure.folders) {
      const folderPath = path.join(outputDir, folder.path);
      
      try {
        // First ensure the directory exists
        await fs.mkdir(folderPath, { recursive: true });
        
        // Try to create README.md with atomic write
        try {
          await outputFileOps.writeFile(
            path.join(folderPath, 'README.md'), 
            `# ${folder.path}\n\n${folder.purpose}\n\nThis folder is part of the project structure.`,
            { createDirectories: true, atomic: true }
          );
        } catch (readmeError) {
          // If README creation fails, try without atomic write as fallback
          globalLogger.warn('README.md atomic write failed, trying fallback', {
            path: folderPath,
            error: (readmeError as Error).message
          });
          
          try {
            await outputFileOps.writeFile(
              path.join(folderPath, 'README.md'), 
              `# ${folder.path}\n\n${folder.purpose}\n\nThis folder is part of the project structure.`,
              { createDirectories: true, atomic: false }
            );
          } catch (fallbackError) {
            // If even fallback fails, just log it but don't fail the entire folder creation
            globalLogger.warn('README.md creation failed completely, continuing without README', {
              path: folderPath,
              atomicError: (readmeError as Error).message,
              fallbackError: (fallbackError as Error).message
            });
          }
        }
        
        foldersCreated.push(folderPath);
        
        globalLogger.debug('Created folder', {
          path: folderPath,
          purpose: folder.purpose
        });
      } catch (error) {
        globalLogger.error('Failed to create folder', error as Error, {
          path: folderPath
        });
        // Don't throw here, continue with other folders
      }
    }

    return foldersCreated;
  }

  private async generateProjectComponents(
    genesisProgram: GenesisProgram,
    structure: ProjectStructure,
    outputDir: string
  ): Promise<CompilationResult> {
    // Convert GenesisProgram to standard Program for MultiPromptGenerator
    const mockProgram = {
      type: 'Program' as const,
      body: this.extractComponentsFromGenesis(genesisProgram),
      metadata: {
        version: genesisProgram.version,
        syntaxMode: 'standard' as const
      }
    };

    const context: AIContext = {
      targetLanguage: this.getTargetLanguage(genesisProgram) as TargetLanguage,
      projectName: genesisProgram.projectName,
      domain: genesisProgram.description || 'application'
    };

    // Use parent class multi-prompt generation
    const result = await super.generate(mockProgram, context);

    // Reorganize files according to project structure
    const reorganizedCode: Record<string, string> = {};

    for (const [fileName, code] of Object.entries(result.code)) {
      const targetPath = this.determineFilePath(fileName, structure, outputDir);
      reorganizedCode[targetPath] = code;
    }

    return {
      ...result,
      code: reorganizedCode
    };
  }

  private extractComponentsFromGenesis(genesisProgram: GenesisProgram): any[] {
    // Extract imports and convert them to component declarations
    // This is a simplified implementation - in practice, you'd parse the full genesis structure
    return genesisProgram.imports?.map(imp => ({
      type: 'ComponentDeclaration',
      name: imp.alias || path.basename(imp.path, '.sun'),
      body: [{
        type: 'ExpressionStatement',
        expression: {
          type: 'NaturalLanguageExpression',
          text: `Implement ${imp.alias || path.basename(imp.path)} component based on ${imp.path}`
        }
      }],
      metadata: {
        description: `Component generated from ${imp.path}`,
        directives: []
      }
    })) || [];
  }

  private determineFilePath(fileName: string, structure: ProjectStructure, outputDir: string): string {
    const targetLanguage = this.getTargetLanguageFromFileName(fileName);
    const ext = this.getFileExtension(targetLanguage);

    // Determine appropriate folder based on file type and name
    if (fileName.includes('component') || fileName.includes('Component')) {
      return path.join('src', 'components', `${fileName}.${ext}`);
    } else if (fileName.includes('service') || fileName.includes('Service') || fileName.includes('API')) {
      return path.join('src', 'services', `${fileName}.${ext}`);
    } else if (fileName.includes('util') || fileName.includes('helper')) {
      return path.join('src', 'utils', `${fileName}.${ext}`);
    } else if (fileName.includes('type') || fileName === 'types') {
      return path.join('src', 'types', `${fileName}.${ext}`);
    } else if (fileName.includes('hook') && targetLanguage === 'typescript') {
      return path.join('src', 'hooks', `${fileName}.${ext}`);
    } else if (fileName.includes('page') || fileName.includes('Page')) {
      return path.join('src', 'pages', `${fileName}.${ext}`);
    } else if (fileName === 'package.json' || fileName === 'README.md') {
      return fileName;
    } else {
      // Default to src folder
      return path.join('src', `${fileName}.${ext}`);
    }
  }

  private async generateEntrypoints(
    genesisProgram: GenesisProgram,
    structure: ProjectStructure,
    outputDir: string
  ): Promise<Record<string, string>> {
    const entrypoints: Record<string, string> = {};
    const targetLanguage = this.getTargetLanguage(genesisProgram);

    for (const entrypoint of genesisProgram.entrypoints || []) {
      const entrypointPrompt = this.buildEntrypointPrompt(entrypoint, genesisProgram, structure);
      const context: AIContext = {
        targetLanguage: targetLanguage as TargetLanguage,
        projectName: genesisProgram.projectName,
        fileName: entrypoint.name,
        domain: 'entrypoint'
      };

      const response = await this.getAIProvider().generateCode(entrypointPrompt, context);
      const entrypointPath = path.join('src', `${entrypoint.name}.${this.getFileExtension(targetLanguage)}`);
      
      entrypoints[entrypoint.name] = entrypointPath;
      
      // This will be handled by the main generation process
      // Just record the mapping here
    }

    return entrypoints;
  }

  private async generateProjectConfig(
    genesisProgram: GenesisProgram,
    structure: ProjectStructure,
    outputDir: string
  ): Promise<void> {
    const targetLanguage = this.getTargetLanguage(genesisProgram);

    // Generate package.json for Node.js projects
    if (targetLanguage === 'typescript' || targetLanguage === 'javascript') {
      const packageJsonPrompt = this.buildPackageJsonPrompt(genesisProgram, structure);
      const context: AIContext = {
        targetLanguage: targetLanguage as TargetLanguage,
        projectName: genesisProgram.projectName,
        domain: 'configuration'
      };

      const response = await this.getAIProvider().generateCode(packageJsonPrompt, context);
      
      await outputFileOps.writeFile(
        path.join(outputDir, 'package.json'),
        response.code,
        { createDirectories: true }
      );
    }

    // Generate setup.py for Python projects
    if (targetLanguage === 'python') {
      const setupPyPrompt = this.buildSetupPyPrompt(genesisProgram, structure);
      const context: AIContext = {
        targetLanguage: targetLanguage as TargetLanguage,
        projectName: genesisProgram.projectName,
        domain: 'configuration'
      };

      const response = await this.getAIProvider().generateCode(setupPyPrompt, context);
      
      await outputFileOps.writeFile(
        path.join(outputDir, 'setup.py'),
        response.code,
        { createDirectories: true }
      );
    }

    // Generate README.md
    const readmePrompt = this.buildProjectReadmePrompt(genesisProgram, structure);
    const context: AIContext = {
      targetLanguage: targetLanguage as TargetLanguage,
      projectName: genesisProgram.projectName,
      domain: 'documentation'
    };

    const readmeResponse = await this.getAIProvider().generateCode(readmePrompt, context);
    
    await outputFileOps.writeFile(
      path.join(outputDir, 'README.md'),
      readmeResponse.code,
      { createDirectories: true }
    );
  }

  // Helper methods for prompt building
  private buildStructureAnalysisPrompt(genesisProgram: GenesisProgram): string {
    return `Analyze this project and recommend an optimal folder structure:

Project: ${genesisProgram.projectName}
Version: ${genesisProgram.version}
Author: ${genesisProgram.author || 'Unknown'}
Description: ${genesisProgram.description || 'No description'}
Target Language: ${this.getTargetLanguage(genesisProgram)}

Imports: ${genesisProgram.imports?.map(imp => `${imp.path} as ${imp.alias}`).join(', ') || 'None'}
Entrypoints: ${genesisProgram.entrypoints?.map(ep => `${ep.name} -> ${ep.target}`).join(', ') || 'None'}
Build Targets: ${genesisProgram.buildConfig?.targets?.join(', ') || 'None'}

Recommend a modern, scalable folder structure with clear separation of concerns.
Return a JSON structure with folders, their purposes, and relationships.`;
  }

  private buildEntrypointPrompt(
    entrypoint: any, 
    genesisProgram: GenesisProgram, 
    structure: ProjectStructure
  ): string {
    return `Generate entrypoint file "${entrypoint.name}" for ${genesisProgram.projectName}.

Target: ${entrypoint.target}
Project Structure: ${structure.folders.map(f => f.path).join(', ')}

Create a complete entrypoint that:
1. Imports necessary components and services
2. Sets up the application architecture
3. Handles initialization and configuration
4. Provides proper error handling and logging

Generate production-ready code with comprehensive setup.`;
  }

  private buildPackageJsonPrompt(genesisProgram: GenesisProgram, structure: ProjectStructure): string {
    return `Generate package.json for ${genesisProgram.projectName}.

Project Details:
- Name: ${genesisProgram.projectName}
- Version: ${genesisProgram.version}
- Author: ${genesisProgram.author || ''}
- Description: ${genesisProgram.description || ''}

Project Structure: ${structure.folders.map(f => f.path).join(', ')}
Build Targets: ${structure.buildTargets.join(', ')}
Entrypoints: ${structure.entrypoints.join(', ')}

Include:
1. Appropriate dependencies for the project type
2. Build scripts for development and production
3. Test scripts and linting
4. Proper entry points and TypeScript configuration
5. Modern tooling setup (Vite, ESLint, Prettier, etc.)

Generate a complete, production-ready package.json.`;
  }

  private buildSetupPyPrompt(genesisProgram: GenesisProgram, structure: ProjectStructure): string {
    return `Generate setup.py for Python project ${genesisProgram.projectName}.

Project Details:
- Name: ${genesisProgram.projectName}
- Version: ${genesisProgram.version}
- Author: ${genesisProgram.author || ''}
- Description: ${genesisProgram.description || ''}

Include standard Python package setup with dependencies, entry points, and configuration.`;
  }

  private buildProjectReadmePrompt(genesisProgram: GenesisProgram, structure: ProjectStructure): string {
    return `Generate comprehensive README.md for ${genesisProgram.projectName}.

Project Details:
- Name: ${genesisProgram.projectName}
- Version: ${genesisProgram.version}
- Author: ${genesisProgram.author || ''}
- Description: ${genesisProgram.description || ''}

Project Structure: ${structure.folders.map(f => `${f.path} - ${f.purpose}`).join('\n')}

Include:
1. Project overview and features
2. Installation instructions
3. Usage examples
4. Project structure explanation
5. Development setup
6. Contributing guidelines
7. License information

Make it comprehensive and professional.`;
  }

  private getTargetLanguage(genesisProgram: GenesisProgram): string {
    // Extract from build config or default to typescript
    return genesisProgram.buildConfig?.options?.language || 'typescript';
  }

  private getTargetLanguageFromFileName(fileName: string): string {
    if (fileName.endsWith('.ts') || fileName.includes('typescript')) return 'typescript';
    if (fileName.endsWith('.js') || fileName.includes('javascript')) return 'javascript';
    if (fileName.endsWith('.py') || fileName.includes('python')) return 'python';
    return 'typescript';
  }

  private getFileExtension(targetLanguage: string): string {
    const extensions: Record<string, string> = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      html: 'html'
    };
    return extensions[targetLanguage] || 'ts';
  }
}