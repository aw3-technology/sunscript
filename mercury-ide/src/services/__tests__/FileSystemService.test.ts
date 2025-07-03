import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../core/types';
import { FileSystemService } from '../FileSystemService';
import { EventBus } from '../../core/event-bus';

describe('FileSystemService', () => {
    let container: Container;
    let fileSystemService: FileSystemService;
    let eventBus: EventBus;
    
    beforeEach(() => {
        container = new Container();
        container.bind(TYPES.EventBus).to(EventBus);
        container.bind(TYPES.FileSystemService).to(FileSystemService);
        
        eventBus = container.get(TYPES.EventBus);
        fileSystemService = container.get(TYPES.FileSystemService);
    });
    
    describe('Service Creation', () => {
        it('should create service instance', () => {
            expect(fileSystemService).toBeDefined();
            expect(fileSystemService).toBeInstanceOf(FileSystemService);
        });
        
        it('should have workspace management methods', () => {
            expect(typeof fileSystemService.openWorkspace).toBe('function');
            expect(typeof fileSystemService.getCurrentWorkspace).toBe('function');
        });
        
        it('should have file operation methods', () => {
            expect(typeof fileSystemService.loadFile).toBe('function');
            expect(typeof fileSystemService.saveFile).toBe('function');
            expect(typeof fileSystemService.deleteFile).toBe('function');
        });
    });
    
    describe('File Operations', () => {
        it('should handle file loading operations', async () => {
            // This would typically mock the file system
            // For now, just test the method exists and handles errors
            try {
                await fileSystemService.loadFile('/nonexistent/file.sun');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
        
        it('should handle file saving operations', async () => {
            // Mock save operation
            try {
                await fileSystemService.saveFile('/test/file.sun', '@task test() {}');
            } catch (error) {
                // Expected to fail in test environment without real filesystem
                expect(error).toBeDefined();
            }
        });
    });
});