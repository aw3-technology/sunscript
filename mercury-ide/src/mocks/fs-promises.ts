// Mock fs/promises for browser environment

export interface Stats {
  isFile(): boolean;
  isDirectory(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
  size: number;
  mtime: Date;
  atime: Date;
  ctime: Date;
}

export class MockStats implements Stats {
  size = 0;
  mtime = new Date();
  atime = new Date();
  ctime = new Date();
  
  isFile() { return true; }
  isDirectory() { return false; }
  isBlockDevice() { return false; }
  isCharacterDevice() { return false; }
  isSymbolicLink() { return false; }
  isFIFO() { return false; }
  isSocket() { return false; }
}

export interface Dirent {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
}

export class MockDirent implements Dirent {
  constructor(public name: string, private type: 'file' | 'directory' = 'file') {}
  
  isFile() { return this.type === 'file'; }
  isDirectory() { return this.type === 'directory'; }
  isBlockDevice() { return false; }
  isCharacterDevice() { return false; }
  isSymbolicLink() { return false; }
  isFIFO() { return false; }
  isSocket() { return false; }
}

export async function readFile(path: string, options?: any): Promise<string> {
  console.warn('fs/promises.readFile called in browser - returning mock content');
  return '// Mock file content from browser\n@task example {\n  console.log("Hello World");\n}';
}

export async function writeFile(path: string, data: string, options?: any): Promise<void> {
  console.warn('fs/promises.writeFile called in browser - operation ignored');
}

export async function access(path: string, mode?: number): Promise<void> {
  console.warn('fs/promises.access called in browser - simulating success');
}

export async function stat(path: string): Promise<Stats> {
  console.warn('fs/promises.stat called in browser - returning mock stats');
  return new MockStats();
}

export async function readdir(path: string, options?: any): Promise<string[] | Dirent[]> {
  console.warn('fs/promises.readdir called in browser - returning mock directory');
  if (options?.withFileTypes) {
    return [
      new MockDirent('example.sun', 'file'),
      new MockDirent('subfolder', 'directory')
    ];
  }
  return ['example.sun', 'subfolder'];
}

export async function mkdir(path: string, options?: any): Promise<void> {
  console.warn('fs/promises.mkdir called in browser - operation ignored');
}

export async function rmdir(path: string): Promise<void> {
  console.warn('fs/promises.rmdir called in browser - operation ignored');
}

export async function unlink(path: string): Promise<void> {
  console.warn('fs/promises.unlink called in browser - operation ignored');
}

export async function rename(oldPath: string, newPath: string): Promise<void> {
  console.warn('fs/promises.rename called in browser - operation ignored');
}

export async function copyFile(src: string, dest: string, mode?: number): Promise<void> {
  console.warn('fs/promises.copyFile called in browser - operation ignored');
}

export function watch(filename: string, options?: any): any {
  console.warn('fs/promises.watch called in browser - returning mock watcher');
  return {
    on: (event: string, listener: Function) => {},
    close: () => {},
    ref: () => {},
    unref: () => {}
  };
}

// Re-export types (already defined above)

export default {
  readFile,
  writeFile,
  access,
  stat,
  readdir,
  mkdir,
  rmdir,
  unlink,
  rename,
  copyFile,
  watch
};