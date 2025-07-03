// Mock child_process for browser environment

export interface SpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  argv0?: string;
  stdio?: any;
  detached?: boolean;
  uid?: number;
  gid?: number;
  shell?: boolean | string;
  windowsVerbatimArguments?: boolean;
  windowsHide?: boolean;
  timeout?: number;
  killSignal?: string | number;
}

export interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  shell?: string;
  timeout?: number;
  maxBuffer?: number;
  killSignal?: string | number;
  uid?: number;
  gid?: number;
  windowsHide?: boolean;
}

export class MockChildProcess {
  stdout = {
    on: (event: string, callback: Function) => {
      if (event === 'data') {
        setTimeout(() => callback('Mock output\n'), 100);
      }
    }
  };
  
  stderr = {
    on: (event: string, callback: Function) => {
      // No error output in mock
    }
  };
  
  on(event: string, callback: Function) {
    if (event === 'close') {
      setTimeout(() => callback(0), 200);
    } else if (event === 'error') {
      // No error in mock
    }
  }
  
  kill(signal?: string) {
    console.warn('Mock child process kill called in browser');
  }
}

export function spawn(command: string, args?: string[], options?: SpawnOptions): MockChildProcess {
  console.warn('spawn() called in browser environment - returning mock process');
  return new MockChildProcess();
}

export function exec(
  command: string, 
  options?: ExecOptions, 
  callback?: (error: Error | null, stdout: string, stderr: string) => void
): MockChildProcess {
  console.warn('exec() called in browser environment - returning mock result');
  
  if (callback) {
    setTimeout(() => {
      callback(null, 'Mock execution output', '');
    }, 100);
  }
  
  return new MockChildProcess();
}

export default { spawn, exec };