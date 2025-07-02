import { injectable } from 'inversify';

export interface FileItem {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: FileItem[];
}

@injectable()
export class FileSystemService {
    private files: Map<string, string> = new Map();
    private fileStructure: FileItem[] = [];
    
    constructor() {
        this.initializeSampleProject();
    }
    
    private initializeSampleProject(): void {
        // Create a sample project structure
        this.fileStructure = [
            {
                name: 'my-project',
                path: 'my-project',
                type: 'folder',
                children: [
                    {
                        name: 'genesis.sun',
                        path: 'my-project/genesis.sun',
                        type: 'file'
                    },
                    {
                        name: 'src',
                        path: 'my-project/src',
                        type: 'folder',
                        children: [
                            {
                                name: 'main.sun',
                                path: 'my-project/src/main.sun',
                                type: 'file'
                            },
                            {
                                name: 'components',
                                path: 'my-project/src/components',
                                type: 'folder',
                                children: [
                                    {
                                        name: 'TodoList.sun',
                                        path: 'my-project/src/components/TodoList.sun',
                                        type: 'file'
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'README.md',
                        path: 'my-project/README.md',
                        type: 'file'
                    }
                ]
            }
        ];
        
        // Initialize file contents
        this.files.set('my-project/genesis.sun', `@project TodoApp {
  name: "Todo Application"
  version: "1.0.0"
  description: "A simple todo list application"
  
  structure: {
    src/
      main.sun
      components/
        TodoList.sun
  }
}`);
        
        this.files.set('my-project/src/main.sun', `@task main {
  import TodoList from "./components/TodoList.sun"
  
  const app = new TodoList()
  app.render()
}`);
        
        this.files.set('my-project/src/components/TodoList.sun', `@component TodoList {
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
}`);
        
        this.files.set('my-project/README.md', `# Todo Application

A simple todo list application built with SunScript.

## Getting Started

1. Open genesis.sun to see the project structure
2. Run the project using the Run button
3. Build the project using the Build button
`);
    }
    
    getFiles(): FileItem[] {
        return this.fileStructure;
    }
    
    async loadFile(path: string): Promise<string> {
        return this.files.get(path) || '';
    }
    
    saveFile(path: string, content: string): void {
        this.files.set(path, content);
        
        // Update file structure if it's a new file
        const parts = path.split('/');
        this.ensureFileInStructure(parts, this.fileStructure);
    }
    
    private ensureFileInStructure(parts: string[], structure: FileItem[]): void {
        if (parts.length === 0) return;
        
        const name = parts[0];
        const isFile = parts.length === 1;
        
        let item = structure.find(item => item.name === name);
        
        if (!item) {
            item = {
                name,
                path: parts.join('/'),
                type: isFile ? 'file' : 'folder',
                children: isFile ? undefined : []
            };
            structure.push(item);
        }
        
        if (!isFile && item.children) {
            this.ensureFileInStructure(parts.slice(1), item.children);
        }
    }
    
    deleteFile(path: string): void {
        this.files.delete(path);
        // TODO: Update file structure
    }
    
    createFolder(path: string): void {
        const parts = path.split('/');
        this.ensureFileInStructure(parts, this.fileStructure);
    }
    
    async readDirectory(path: string): Promise<Array<{name: string, type: 'file' | 'folder'}>> {
        const entries: Array<{name: string, type: 'file' | 'folder'}> = [];
        
        // Find the directory in the file structure
        const pathParts = path.split('/').filter(p => p);
        let currentLevel = this.fileStructure;
        
        for (const part of pathParts) {
            const item = currentLevel.find(item => item.name === part);
            if (item && item.type === 'folder' && item.children) {
                currentLevel = item.children;
            } else {
                return entries; // Directory not found
            }
        }
        
        // Return the entries at this level
        for (const item of currentLevel) {
            entries.push({
                name: item.name,
                type: item.type
            });
        }
        
        return entries;
    }
}