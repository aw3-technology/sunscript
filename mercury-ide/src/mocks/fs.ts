// Mock fs for browser environment

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

export function readFileSync(path: string, options?: any): string {
  console.warn('fs.readFileSync called in browser - returning mock content');
  return '// Mock file content from browser\n@task example {\n  console.log("Hello World");\n}';
}

export function writeFileSync(path: string, data: string, options?: any): void {
  console.warn('fs.writeFileSync called in browser - operation ignored');
}

export function existsSync(path: string): boolean {
  console.warn('fs.existsSync called in browser - returning true');
  return true;
}

export function statSync(path: string): Stats {
  console.warn('fs.statSync called in browser - returning mock stats');
  return new MockStats();
}

export function readdirSync(path: string, options?: any): string[] | Dirent[] {
  console.warn('fs.readdirSync called in browser - returning mock directory');
  if (options?.withFileTypes) {
    return [
      new MockDirent('example.sun', 'file'),
      new MockDirent('subfolder', 'directory')
    ];
  }
  return ['example.sun', 'subfolder'];
}

export function access(path: string, mode?: number, callback?: Function): void {
  console.warn('fs.access called in browser - simulating success');
  if (callback) {
    setTimeout(() => callback(null), 0);
  }
}

export function readFile(path: string, options: any, callback: Function): void {
  console.warn('fs.readFile called in browser - returning mock content');
  setTimeout(() => {
    callback(null, '// Mock file content from browser\n@task example {\n  console.log("Hello World");\n}');
  }, 0);
}

// Re-export types (already defined above)

export default {
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  readdirSync,
  access,
  readFile
};