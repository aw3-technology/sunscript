// Mock path for browser environment

export const sep = '/';
export const delimiter = ':';

export function normalize(path: string): string {
  const parts = path.split('/').filter(part => part !== '' && part !== '.');
  const normalized: string[] = [];
  
  for (const part of parts) {
    if (part === '..') {
      normalized.pop();
    } else {
      normalized.push(part);
    }
  }
  
  const result = normalized.join('/');
  return path.startsWith('/') ? '/' + result : result;
}

export function join(...paths: string[]): string {
  return normalize(paths.join('/'));
}

export function resolve(...paths: string[]): string {
  let resolved = '';
  
  for (let i = paths.length - 1; i >= 0; i--) {
    const path = paths[i];
    if (path.startsWith('/')) {
      resolved = path;
      break;
    }
    resolved = path + '/' + resolved;
  }
  
  return normalize('/' + resolved);
}

export function relative(from: string, to: string): string {
  const fromParts = normalize(from).split('/').filter(Boolean);
  const toParts = normalize(to).split('/').filter(Boolean);
  
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i++;
  }
  
  const up = fromParts.slice(i).map(() => '..');
  const down = toParts.slice(i);
  
  return [...up, ...down].join('/') || '.';
}

export function dirname(path: string): string {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) {
    return '.';
  }
  if (lastSlash === 0) {
    return '/';
  }
  return path.slice(0, lastSlash);
}

export function basename(path: string, ext?: string): string {
  const lastSlash = path.lastIndexOf('/');
  const base = lastSlash === -1 ? path : path.slice(lastSlash + 1);
  
  if (ext && base.endsWith(ext)) {
    return base.slice(0, -ext.length);
  }
  
  return base;
}

export function extname(path: string): string {
  const lastDot = path.lastIndexOf('.');
  const lastSlash = path.lastIndexOf('/');
  
  if (lastDot === -1 || lastDot < lastSlash) {
    return '';
  }
  
  return path.slice(lastDot);
}

export function parse(path: string): {
  root: string;
  dir: string;
  base: string;
  ext: string;
  name: string;
} {
  const ext = extname(path);
  const base = basename(path);
  const name = basename(path, ext);
  const dir = dirname(path);
  const root = path.startsWith('/') ? '/' : '';
  
  return { root, dir, base, ext, name };
}

export function format(pathObject: {
  root?: string;
  dir?: string;
  base?: string;
  ext?: string;
  name?: string;
}): string {
  if (pathObject.base) {
    return join(pathObject.dir || '', pathObject.base);
  }
  
  const name = pathObject.name || '';
  const ext = pathObject.ext || '';
  const base = name + ext;
  
  return join(pathObject.dir || '', base);
}

export function isAbsolute(path: string): boolean {
  return path.startsWith('/');
}

export default {
  sep,
  delimiter,
  normalize,
  join,
  resolve,
  relative,
  dirname,
  basename,
  extname,
  parse,
  format,
  isAbsolute
};