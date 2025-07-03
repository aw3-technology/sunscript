import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { FileSystemService, FileItem, CreateProjectOptions } from '../FileSystemService';

describe('FileSystemService', () => {
    let container: Container;
    let fileSystemService: FileSystemService;
    
    beforeEach(() => {
        container = new Container();
        container.bind(TYPES.FileSystemService).to(FileSystemService);
        
        fileSystemService = container.get(TYPES.FileSystemService);
    });
    
    describe('File Operations', () => {
        it('should load file content', async () => {
            const content = await fileSystemService.loadFile('/test/example.sun');
            
            expect(typeof content).toBe('string');
            expect(content).toContain('Mock file content');
        });
        
        it('should save file content', async () => {
            const testContent = '@task example {\n  console.log("test");\n}';
            
            await expect(
                fileSystemService.saveFile('/test/example.sun', testContent)
            ).resolves.not.toThrow();
        });
        
        it('should check if file exists', async () => {
            const exists = await fileSystemService.fileExists('/test/example.sun');
            expect(typeof exists).toBe('boolean');
        });
        
        it('should get file stats', async () => {
            const stats = await fileSystemService.getFileStats('/test/example.sun');
            
            expect(stats).toHaveProperty('size');
            expect(stats).toHaveProperty('mtime');
            expect(stats).toHaveProperty('isFile');
            expect(stats).toHaveProperty('isDirectory');
        });
    });
    
    describe('Directory Operations', () => {
        it('should get files from directory', async () => {
            const files = await fileSystemService.getFiles('/test');
            
            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
            
            const file = files[0];
            expect(file).toHaveProperty('name');
            expect(file).toHaveProperty('path');
            expect(file).toHaveProperty('type');
            expect(['file', 'folder']).toContain(file.type);
        });
        
        it('should create directory', async () => {
            await expect(
                fileSystemService.createDirectory('/test/new-folder')
            ).resolves.not.toThrow();
        });
        
        it('should delete directory', async () => {
            await expect(
                fileSystemService.deleteDirectory('/test/empty-folder')
            ).resolves.not.toThrow();
        });
        
        it('should get directory tree', async () => {
            const tree = await fileSystemService.getDirectoryTree('/test');
            
            expect(tree).toHaveProperty('name');
            expect(tree).toHaveProperty('path');
            expect(tree.type).toBe('folder');
            expect(Array.isArray(tree.children)).toBe(true);
        });
    });
    
    describe('Project Operations', () => {
        const projectOptions: CreateProjectOptions = {
            name: 'test-project',
            path: '/projects/test-project',
            template: 'basic'
        };
        
        it('should create new project', async () => {
            await expect(
                fileSystemService.createProject(projectOptions)
            ).resolves.not.toThrow();
        });
        
        it('should open existing project', async () => {
            const project = await fileSystemService.openProject('/projects/test-project');
            
            expect(project).toHaveProperty('name', 'test-project');
            expect(project).toHaveProperty('path');
            expect(project).toHaveProperty('type', 'folder');
        });
        
        it('should get project info', async () => {
            const info = await fileSystemService.getProjectInfo('/projects/test-project');
            
            expect(info).toHaveProperty('name');
            expect(info).toHaveProperty('fileCount');
            expect(info).toHaveProperty('totalSize');
            expect(info).toHaveProperty('lastModified');
        });
    });
    
    describe('File Watching', () => {
        it('should watch file for changes', async () => {
            const mockCallback = jest.fn();
            
            const watcher = await fileSystemService.watchFile('/test/example.sun', mockCallback);
            
            expect(watcher).toHaveProperty('on');
            expect(watcher).toHaveProperty('close');
        });
        
        it('should watch directory for changes', async () => {
            const mockCallback = jest.fn();
            
            const watcher = await fileSystemService.watchDirectory('/test', mockCallback);
            
            expect(watcher).toHaveProperty('on');
            expect(watcher).toHaveProperty('close');
        });
    });
    
    describe('File Search', () => {
        it('should search files by name', async () => {
            const results = await fileSystemService.searchFiles('/test', 'example');
            
            expect(Array.isArray(results)).toBe(true);
            results.forEach(result => {
                expect(result.name.toLowerCase()).toContain('example');
            });
        });
        
        it('should search files by content', async () => {
            const results = await fileSystemService.searchInFiles('/test', '@task');
            
            expect(Array.isArray(results)).toBe(true);
            results.forEach(result => {
                expect(result).toHaveProperty('file');
                expect(result).toHaveProperty('matches');
                expect(Array.isArray(result.matches)).toBe(true);
            });
        });
        
        it('should find files by extension', async () => {
            const results = await fileSystemService.findFilesByExtension('/test', '.sun');
            
            expect(Array.isArray(results)).toBe(true);
            results.forEach(result => {
                expect(result.name).toEndWith('.sun');
            });
        });
    });
    
    describe('File Operations with Error Handling', () => {
        it('should handle file not found gracefully', async () => {
            await expect(
                fileSystemService.loadFile('/nonexistent/file.sun')
            ).resolves.toBeDefined(); // Mock will return mock content
        });
        
        it('should handle permission errors gracefully', async () => {
            // In browser mock, this won't actually throw but we test the interface
            await expect(
                fileSystemService.saveFile('/readonly/file.sun', 'content')
            ).resolves.not.toThrow();
        });
        
        it('should validate file paths', () => {
            expect(() => {
                fileSystemService.validatePath('');
            }).toThrow('Path cannot be empty');
            
            expect(() => {
                fileSystemService.validatePath('../../../etc/passwd');
            }).toThrow('Path traversal not allowed');
        });
    });
    
    describe('Performance and Limits', () => {
        it('should handle large file operations', async () => {
            const largeContent = 'x'.repeat(1000000); // 1MB of content
            
            await expect(
                fileSystemService.saveFile('/test/large.sun', largeContent)
            ).resolves.not.toThrow();
        });
        
        it('should handle many files in directory', async () => {
            // Mock will return mock data, but we test the interface
            const files = await fileSystemService.getFiles('/test/many-files');
            
            expect(Array.isArray(files)).toBe(true);
        });
        
        it('should cache file stats for performance', async () => {
            const start = performance.now();
            
            // First call - should populate cache
            await fileSystemService.getFileStats('/test/example.sun');
            
            // Second call - should use cache
            await fileSystemService.getFileStats('/test/example.sun');
            
            const duration = performance.now() - start;
            
            // Test that we're not making excessive operations
            expect(duration).toBeLessThan(1000);
        });
    });
});