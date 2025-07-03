import { injectable } from 'inversify';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Stats } from 'fs';

export interface FileItem {
    name: string;
    path: string;
    type: 'file' | 'folder';
    size?: number;
    lastModified?: Date;
    children?: FileItem[];
}

export interface CreateProjectOptions {
    name: string;
    path: string;
    template?: 'empty' | 'todo-app' | 'basic';
}

@injectable()
export class FileSystemService {
    private currentWorkspacePath: string | null = null;
    private watchers: Map<string, AbortController> = new Map();
    
    constructor() {
        // Real file system service - no initialization needed
    }
    
    // Workspace Management
    async openWorkspace(workspacePath: string): Promise<FileItem[]> {
        try {
            const resolvedPath = path.resolve(workspacePath);
            const stats = await fs.stat(resolvedPath);
            
            if (!stats.isDirectory()) {
                throw new Error('Workspace path must be a directory');
            }
            
            this.currentWorkspacePath = resolvedPath;
            return await this.buildFileTree(resolvedPath);
        } catch (error: any) {
            console.error('Failed to open workspace:', error);
            throw new Error(`Failed to open workspace: ${error.message}`);
        }
    }
    
    getCurrentWorkspace(): string | null {
        return this.currentWorkspacePath;
    }
    
    // File Operations
    async loadFile(filePath: string): Promise<string> {
        try {
            const fullPath = this.resolvePath(filePath);
            const content = await fs.readFile(fullPath, 'utf-8');
            return content;
        } catch (error: any) {
            console.error(`Failed to load file ${filePath}:`, error);
            throw new Error(`Failed to load file: ${error.message}`);
        }
    }
    
    async saveFile(filePath: string, content: string): Promise<void> {
        try {
            const fullPath = this.resolvePath(filePath);
            
            // Ensure directory exists
            const dir = path.dirname(fullPath);
            await fs.mkdir(dir, { recursive: true });
            
            await fs.writeFile(fullPath, content, 'utf-8');
        } catch (error: any) {
            console.error(`Failed to save file ${filePath}:`, error);
            throw new Error(`Failed to save file: ${error.message}`);
        }
    }
    
    async deleteFile(filePath: string): Promise<void> {
        try {
            const fullPath = this.resolvePath(filePath);
            const stats = await fs.stat(fullPath);
            
            if (stats.isDirectory()) {
                await fs.rmdir(fullPath, { recursive: true });
            } else {
                await fs.unlink(fullPath);
            }
        } catch (error: any) {
            console.error(`Failed to delete ${filePath}:`, error);
            throw new Error(`Failed to delete: ${error.message}`);
        }
    }
    
    async createFile(filePath: string, content: string = ''): Promise<void> {
        try {
            const fullPath = this.resolvePath(filePath);
            
            // Check if file already exists
            try {
                await fs.access(fullPath);
                throw new Error('File already exists');
            } catch (error: any) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
            
            // Ensure directory exists
            const dir = path.dirname(fullPath);
            await fs.mkdir(dir, { recursive: true });
            
            await fs.writeFile(fullPath, content, 'utf-8');
        } catch (error: any) {
            console.error(`Failed to create file ${filePath}:`, error);
            throw new Error(`Failed to create file: ${error.message}`);
        }
    }
    
    async createFolder(folderPath: string): Promise<void> {
        try {
            const fullPath = this.resolvePath(folderPath);
            await fs.mkdir(fullPath, { recursive: true });
        } catch (error: any) {
            console.error(`Failed to create folder ${folderPath}:`, error);
            throw new Error(`Failed to create folder: ${error.message}`);
        }
    }
    
    async moveFile(fromPath: string, toPath: string): Promise<void> {
        try {
            const fullFromPath = this.resolvePath(fromPath);
            const fullToPath = this.resolvePath(toPath);
            
            // Ensure destination directory exists
            const toDir = path.dirname(fullToPath);
            await fs.mkdir(toDir, { recursive: true });
            
            await fs.rename(fullFromPath, fullToPath);
        } catch (error: any) {
            console.error(`Failed to move ${fromPath} to ${toPath}:`, error);
            throw new Error(`Failed to move file: ${error.message}`);
        }
    }
    
    async copyFile(fromPath: string, toPath: string): Promise<void> {
        try {
            const fullFromPath = this.resolvePath(fromPath);
            const fullToPath = this.resolvePath(toPath);
            
            // Ensure destination directory exists
            const toDir = path.dirname(fullToPath);
            await fs.mkdir(toDir, { recursive: true });
            
            await fs.copyFile(fullFromPath, fullToPath);
        } catch (error: any) {
            console.error(`Failed to copy ${fromPath} to ${toPath}:`, error);
            throw new Error(`Failed to copy file: ${error.message}`);
        }
    }
    
    // Directory Operations
    async readDirectory(dirPath: string): Promise<Array<{name: string, type: 'file' | 'folder', size?: number, lastModified?: Date}>> {
        try {
            const fullPath = this.resolvePath(dirPath);
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            
            const result = await Promise.all(
                entries.map(async (entry) => {
                    const entryPath = path.join(fullPath, entry.name);
                    const stats = await fs.stat(entryPath);
                    
                    return {
                        name: entry.name,
                        type: entry.isDirectory() ? 'folder' as const : 'file' as const,
                        size: entry.isFile() ? stats.size : undefined,
                        lastModified: stats.mtime
                    };
                })
            );
            
            // Sort: folders first, then files, both alphabetically
            return result.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'folder' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
        } catch (error: any) {
            console.error(`Failed to read directory ${dirPath}:`, error);
            return [];
        }
    }
    
    // File Tree Operations
    async buildFileTree(dirPath: string, maxDepth: number = 5, currentDepth: number = 0): Promise<FileItem[]> {
        if (currentDepth >= maxDepth) {
            return [];
        }
        
        try {
            const entries = await this.readDirectory(dirPath);
            const result: FileItem[] = [];
            
            for (const entry of entries) {
                // Skip hidden files and common ignore patterns
                if (this.shouldIgnoreFile(entry.name)) {
                    continue;
                }
                
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = this.currentWorkspacePath 
                    ? path.relative(this.currentWorkspacePath, fullPath)
                    : fullPath;
                
                const fileItem: FileItem = {
                    name: entry.name,
                    path: relativePath,
                    type: entry.type,
                    size: entry.size,
                    lastModified: entry.lastModified
                };
                
                if (entry.type === 'folder') {
                    fileItem.children = await this.buildFileTree(fullPath, maxDepth, currentDepth + 1);
                }
                
                result.push(fileItem);
            }
            
            return result;
        } catch (error: any) {
            console.error(`Failed to build file tree for ${dirPath}:`, error);
            return [];
        }
    }
    
    getFiles(): Promise<FileItem[]> {
        if (!this.currentWorkspacePath) {
            return Promise.resolve([]);
        }
        return this.buildFileTree(this.currentWorkspacePath);
    }
    
    // Project Management
    async createProject(options: CreateProjectOptions): Promise<void> {
        try {
            const projectPath = path.resolve(options.path, options.name);
            
            // Check if directory already exists
            try {
                await fs.access(projectPath);
                throw new Error('Project directory already exists');
            } catch (error: any) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
            
            // Create project directory
            await fs.mkdir(projectPath, { recursive: true });
            
            // Create project files based on template
            await this.createProjectTemplate(projectPath, options.template || 'basic');
            
            // Set as current workspace
            this.currentWorkspacePath = projectPath;
        } catch (error: any) {
            console.error('Failed to create project:', error);
            throw new Error(`Failed to create project: ${error.message}`);
        }
    }
    
    private async createProjectTemplate(projectPath: string, template: string): Promise<void> {
        const templates: Record<string, () => Promise<void>> = {
            'empty': () => this.createEmptyProject(projectPath),
            'basic': () => this.createBasicProject(projectPath),
            'todo-app': () => this.createTodoAppProject(projectPath)
        };
        
        const createTemplate = templates[template] || templates['basic'];
        await createTemplate();
    }
    
    private async createEmptyProject(projectPath: string): Promise<void> {
        // Create basic project structure
        await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });
        
        // Create genesis.sun
        const genesisContent = `@project EmptyProject {
  name: "${path.basename(projectPath)}"
  version: "1.0.0"
  description: "A new SunScript project"
  
  structure: {
    src/
      main.sun
  }
}`;
        await fs.writeFile(path.join(projectPath, 'genesis.sun'), genesisContent, 'utf-8');
        
        // Create main.sun
        const mainContent = `@task main {
  console.log("Hello, SunScript!")
}`;
        await fs.writeFile(path.join(projectPath, 'src', 'main.sun'), mainContent, 'utf-8');
        
        // Create README.md
        const readmeContent = `# ${path.basename(projectPath)}

A new SunScript project.

## Getting Started

1. Open the project in SunScript IDE
2. Edit src/main.sun to add your code
3. Run the project using the Run button
`;
        await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent, 'utf-8');
    }
    
    private async createBasicProject(projectPath: string): Promise<void> {
        await this.createEmptyProject(projectPath);
        
        // Add additional basic files
        await fs.mkdir(path.join(projectPath, 'src', 'utils'), { recursive: true });
        
        const utilsContent = `@module Utils {
  @task formatDate(date: Date): string {
    return date.toLocaleDateString()
  }
  
  @task capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}`;
        await fs.writeFile(path.join(projectPath, 'src', 'utils', 'helpers.sun'), utilsContent, 'utf-8');
    }
    
    private async createTodoAppProject(projectPath: string): Promise<void> {
        // Create directory structure
        await fs.mkdir(path.join(projectPath, 'src', 'components'), { recursive: true });
        
        // Create genesis.sun
        const genesisContent = `@project TodoApp {
  name: "Todo Application"
  version: "1.0.0"
  description: "A simple todo list application"
  
  structure: {
    src/
      main.sun
      components/
        TodoList.sun
  }
}`;
        await fs.writeFile(path.join(projectPath, 'genesis.sun'), genesisContent, 'utf-8');
        
        // Create main.sun
        const mainContent = `@task main {
  import TodoList from "./components/TodoList.sun"
  
  const app = new TodoList()
  app.render()
}`;
        await fs.writeFile(path.join(projectPath, 'src', 'main.sun'), mainContent, 'utf-8');
        
        // Create TodoList component
        const todoListContent = `@component TodoList {
  state: {
    todos: []
  }
  
  @task addTodo(text: string) {
    this.state.todos.push({
      id: Date.now(),
      text,
      completed: false
    })
  }
  
  @task toggleTodo(id: number) {
    const todo = this.state.todos.find(t => t.id === id)
    if (todo) {
      todo.completed = !todo.completed
    }
  }
  
  @task render() {
    return \`
      <div class="todo-list">
        <h1>My Todo List</h1>
        <input type="text" placeholder="Add a todo..." />
        <ul>
          \${this.state.todos.map(todo => \`
            <li class="\${todo.completed ? 'completed' : ''}">
              \${todo.text}
            </li>
          \`).join('')}
        </ul>
      </div>
    \`
  }
}`;
        await fs.writeFile(path.join(projectPath, 'src', 'components', 'TodoList.sun'), todoListContent, 'utf-8');
        
        // Create README.md
        const readmeContent = `# Todo Application

A simple todo list application built with SunScript.

## Getting Started

1. Open genesis.sun to see the project structure
2. Run the project using the Run button
3. Build the project using the Build button

## Features

- Add new todos
- Toggle todo completion
- Clean, responsive interface
`;
        await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent, 'utf-8');
    }
    
    // Utility Methods
    private resolvePath(filePath: string): string {
        if (path.isAbsolute(filePath)) {
            return filePath;
        }
        
        if (!this.currentWorkspacePath) {
            throw new Error('No workspace open. Please open a workspace first.');
        }
        
        return path.resolve(this.currentWorkspacePath, filePath);
    }
    
    private shouldIgnoreFile(fileName: string): boolean {
        const ignorePatterns = [
            /^\./,                  // Hidden files
            /^node_modules$/,       // Node.js dependencies
            /^dist$/,               // Build output
            /^build$/,              // Build output
            /^target$/,             // Rust/Java build output
            /\.DS_Store$/,          // macOS metadata
            /^Thumbs\.db$/,         // Windows metadata
            /\.tmp$/,               // Temporary files
            /\.temp$/,              // Temporary files
            /\.log$/,               // Log files
        ];
        
        return ignorePatterns.some(pattern => pattern.test(fileName));
    }
    
    // File Watching
    async watchFile(filePath: string, callback: (event: 'change' | 'rename', filename: string) => void): Promise<void> {
        try {
            const fullPath = this.resolvePath(filePath);
            const controller = new AbortController();
            
            // Store the controller for cleanup
            this.watchers.set(filePath, controller);
            
            const watcher = fs.watch(fullPath, { signal: controller.signal });
            
            for await (const event of watcher) {
                callback(event.eventType as 'change' | 'rename', event.filename || '');
            }
        } catch (error: any) {
            console.error(`Failed to watch file ${filePath}:`, error);
        }
    }
    
    unwatchFile(filePath: string): void {
        const controller = this.watchers.get(filePath);
        if (controller) {
            controller.abort();
            this.watchers.delete(filePath);
        }
    }
    
    // Cleanup
    dispose(): void {
        // Clean up all file watchers
        for (const controller of this.watchers.values()) {
            controller.abort();
        }
        this.watchers.clear();
    }
}