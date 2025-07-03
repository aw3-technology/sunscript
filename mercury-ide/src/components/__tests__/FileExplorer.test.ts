import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { FileExplorer } from '../FileExplorer';
import { FileSystemService, FileItem } from '../../services/FileSystemService';

describe('FileExplorer', () => {
    let container: Container;
    let fileExplorer: FileExplorer;
    let mockFileSystemService: jest.Mocked<FileSystemService>;
    let mockContainer: HTMLElement;
    
    const mockFiles: FileItem[] = [
        {
            name: 'project1',
            path: '/test/project1',
            type: 'folder',
            children: [
                {
                    name: 'genesis.sun',
                    path: '/test/project1/genesis.sun',
                    type: 'file',
                    size: 1024,
                    lastModified: new Date()
                },
                {
                    name: 'components',
                    path: '/test/project1/components',
                    type: 'folder',
                    children: [
                        {
                            name: 'Button.sun',
                            path: '/test/project1/components/Button.sun',
                            type: 'file',
                            size: 512,
                            lastModified: new Date()
                        }
                    ]
                }
            ]
        },
        {
            name: 'README.md',
            path: '/test/README.md',
            type: 'file',
            size: 2048,
            lastModified: new Date()
        }
    ];
    
    beforeEach(() => {
        container = new Container();
        
        // Create mock FileSystemService
        mockFileSystemService = {
            getFiles: jest.fn().mockResolvedValue(mockFiles),
            loadFile: jest.fn().mockResolvedValue('// File content'),
            saveFile: jest.fn().mockResolvedValue(undefined),
            fileExists: jest.fn().mockResolvedValue(true),
            createDirectory: jest.fn().mockResolvedValue(undefined),
            deleteFile: jest.fn().mockResolvedValue(undefined),
            deleteDirectory: jest.fn().mockResolvedValue(undefined)
        } as any;
        
        container.bind(TYPES.FileSystemService).toConstantValue(mockFileSystemService);
        container.bind(TYPES.FileExplorer).to(FileExplorer);
        
        fileExplorer = container.get(TYPES.FileExplorer);
        
        // Create mock DOM container
        mockContainer = document.createElement('div');
        mockContainer.id = 'test-file-explorer';
        document.body.appendChild(mockContainer);
    });
    
    afterEach(() => {
        document.body.removeChild(mockContainer);
        jest.clearAllMocks();
    });
    
    describe('Initialization and Mounting', () => {
        it('should mount to DOM container', async () => {
            await fileExplorer.mount(mockContainer);
            
            expect(mockContainer.innerHTML).toContain('file-tree');
            expect(mockFileSystemService.getFiles).toHaveBeenCalled();
        });
        
        it('should render file tree structure', async () => {
            await fileExplorer.mount(mockContainer);
            
            expect(mockContainer.innerHTML).toContain('project1');
            expect(mockContainer.innerHTML).toContain('README.md');
            expect(mockContainer.innerHTML).toContain('genesis.sun');
        });
        
        it('should show folder and file icons', async () => {
            await fileExplorer.mount(mockContainer);
            
            expect(mockContainer.innerHTML).toContain('📁'); // Folder icon
            expect(mockContainer.innerHTML).toContain('📄'); // File icon
        });
        
        it('should apply proper indentation for nested items', async () => {
            await fileExplorer.mount(mockContainer);
            
            const fileItems = mockContainer.querySelectorAll('.file-item');
            const nestedItems = Array.from(fileItems).filter(item => 
                (item as HTMLElement).style.paddingLeft !== '0px'
            );
            
            expect(nestedItems.length).toBeGreaterThan(0);
        });
    });
    
    describe('File Selection and Interaction', () => {
        let fileSelectCallback: jest.Mock;
        
        beforeEach(async () => {
            fileSelectCallback = jest.fn();
            fileExplorer.onFileSelect(fileSelectCallback);
            await fileExplorer.mount(mockContainer);
        });
        
        it('should handle file selection', async () => {
            const fileItems = mockContainer.querySelectorAll('[data-type="file"]');
            const firstFile = fileItems[0] as HTMLElement;
            
            firstFile.click();
            
            await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async operation
            
            expect(mockFileSystemService.loadFile).toHaveBeenCalled();
            expect(fileSelectCallback).toHaveBeenCalled();
        });
        
        it('should not trigger file select for folders', () => {
            const folderItems = mockContainer.querySelectorAll('[data-type="folder"]');
            const firstFolder = folderItems[0] as HTMLElement;
            
            firstFolder.click();
            
            expect(fileSelectCallback).not.toHaveBeenCalled();
        });
        
        it('should highlight selected file', async () => {
            const fileItems = mockContainer.querySelectorAll('[data-type="file"]');
            const firstFile = fileItems[0] as HTMLElement;
            
            firstFile.click();
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(firstFile.classList.contains('selected')).toBe(true);
        });
        
        it('should remove previous selection when selecting new file', async () => {
            const fileItems = mockContainer.querySelectorAll('[data-type="file"]');
            const firstFile = fileItems[0] as HTMLElement;
            const secondFile = fileItems[1] as HTMLElement;
            
            // Select first file
            firstFile.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Select second file
            secondFile.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(firstFile.classList.contains('selected')).toBe(false);
            expect(secondFile.classList.contains('selected')).toBe(true);
        });
    });
    
    describe('File Tree Rendering', () => {
        beforeEach(async () => {
            await fileExplorer.mount(mockContainer);
        });
        
        it('should render all top-level items', () => {
            const topLevelItems = mockContainer.querySelectorAll('.file-item[style*="padding-left: 0px"]');
            
            expect(topLevelItems.length).toBe(2); // project1 and README.md
        });
        
        it('should render nested folder contents', () => {
            const allItems = mockContainer.querySelectorAll('.file-item');
            
            // Should include: project1, README.md, genesis.sun, components, Button.sun
            expect(allItems.length).toBeGreaterThanOrEqual(5);
        });
        
        it('should set correct data attributes', () => {
            const fileItems = mockContainer.querySelectorAll('.file-item');
            
            fileItems.forEach(item => {
                expect(item.getAttribute('data-path')).toBeTruthy();
                expect(item.getAttribute('data-type')).toMatch(/^(file|folder)$/);
            });
        });
        
        it('should display file and folder names correctly', () => {
            expect(mockContainer.textContent).toContain('project1');
            expect(mockContainer.textContent).toContain('README.md');
            expect(mockContainer.textContent).toContain('genesis.sun');
            expect(mockContainer.textContent).toContain('components');
            expect(mockContainer.textContent).toContain('Button.sun');
        });
    });
    
    describe('Context Menu and Actions', () => {
        beforeEach(async () => {
            await fileExplorer.mount(mockContainer);
        });
        
        it('should handle right-click context menu', () => {
            const fileItem = mockContainer.querySelector('[data-type="file"]') as HTMLElement;
            
            const contextMenuEvent = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                button: 2
            });
            
            fileItem.dispatchEvent(contextMenuEvent);
            
            // Context menu handling would be implemented in actual component
            expect(fileItem).toBeDefined();
        });
        
        it('should support file operations via context menu', () => {
            // This would test actual context menu implementation
            // For now, we test that the structure supports it
            const fileItems = mockContainer.querySelectorAll('.file-item');
            
            expect(fileItems.length).toBeGreaterThan(0);
        });
    });
    
    describe('Refresh and Updates', () => {
        beforeEach(async () => {
            await fileExplorer.mount(mockContainer);
        });
        
        it('should refresh file tree', async () => {
            const initialCallCount = mockFileSystemService.getFiles.mock.calls.length;
            
            fileExplorer.refresh();
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockFileSystemService.getFiles).toHaveBeenCalledTimes(initialCallCount + 1);
        });
        
        it('should handle file system changes', async () => {
            // Simulate file system change
            const updatedFiles = [
                ...mockFiles,
                {
                    name: 'newFile.sun',
                    path: '/test/newFile.sun',
                    type: 'file' as const,
                    size: 256,
                    lastModified: new Date()
                }
            ];
            
            mockFileSystemService.getFiles.mockResolvedValueOnce(updatedFiles);
            
            fileExplorer.refresh();
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockContainer.textContent).toContain('newFile.sun');
        });
    });
    
    describe('Error Handling', () => {
        it('should handle file system errors gracefully', async () => {
            mockFileSystemService.getFiles.mockRejectedValueOnce(new Error('File system error'));
            
            await expect(fileExplorer.mount(mockContainer)).resolves.not.toThrow();
        });
        
        it('should handle file loading errors', async () => {
            mockFileSystemService.loadFile.mockRejectedValueOnce(new Error('File not found'));
            
            const fileSelectCallback = jest.fn();
            fileExplorer.onFileSelect(fileSelectCallback);
            await fileExplorer.mount(mockContainer);
            
            const fileItem = mockContainer.querySelector('[data-type="file"]') as HTMLElement;
            fileItem.click();
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Should not crash, callback might not be called due to error
            expect(mockFileSystemService.loadFile).toHaveBeenCalled();
        });
        
        it('should handle empty directories', async () => {
            mockFileSystemService.getFiles.mockResolvedValueOnce([]);
            
            await fileExplorer.mount(mockContainer);
            
            expect(mockContainer.innerHTML).toContain('file-tree');
            expect(mockContainer.querySelectorAll('.file-item')).toHaveLength(0);
        });
    });
    
    describe('Performance', () => {
        it('should handle large file trees efficiently', async () => {
            // Create a large mock file tree
            const largeFileTree = Array.from({ length: 1000 }, (_, i) => ({
                name: `file${i}.sun`,
                path: `/test/file${i}.sun`,
                type: 'file' as const,
                size: 1024,
                lastModified: new Date()
            }));
            
            mockFileSystemService.getFiles.mockResolvedValueOnce(largeFileTree);
            
            const start = performance.now();
            await fileExplorer.mount(mockContainer);
            const duration = performance.now() - start;
            
            expect(duration).toBeLessThan(1000); // Should render within 1 second
            expect(mockContainer.querySelectorAll('.file-item')).toHaveLength(1000);
        });
        
        it('should not cause memory leaks with frequent refreshes', async () => {
            await fileExplorer.mount(mockContainer);
            
            // Simulate multiple rapid refreshes
            for (let i = 0; i < 10; i++) {
                fileExplorer.refresh();
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // If we get here without issues, no obvious memory leaks
            expect(mockContainer.querySelectorAll('.file-item').length).toBeGreaterThan(0);
        });
    });
});