// Mock util for browser environment

export function promisify<T extends Function>(fn: T): (...args: any[]) => Promise<any> {
  return function(this: any, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const callback = (error: Error | null, result?: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      };
      
      try {
        (fn as any).apply(this, [...args, callback]);
      } catch (error) {
        reject(error);
      }
    });
  };
}

export function callbackify<T extends (...args: any[]) => Promise<any>>(
  fn: T
): (...args: any[]) => void {
  return function(this: any, ...args: any[]): void {
    const callback = args[args.length - 1];
    const promiseArgs = args.slice(0, -1);
    
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    (fn as any).apply(this, promiseArgs)
      .then((result: any) => callback(null, result))
      .catch((error: any) => callback(error));
  };
}

export function deprecate<T extends Function>(fn: T, msg: string): T {
  let warned = false;
  
  const deprecated = function(this: any, ...args: any[]) {
    if (!warned) {
      console.warn(msg);
      warned = true;
    }
    return (fn as any).apply(this, args);
  };
  
  return deprecated as any;
}

export function debuglog(section: string): Function {
  return function(...args: any[]) {
    if (process.env.NODE_DEBUG && process.env.NODE_DEBUG.includes(section)) {
      console.log(...args);
    }
  };
}

export function format(f: string, ...args: any[]): string {
  return f.replace(/%[sdj%]/g, (x) => {
    if (args.length === 0) return x;
    switch (x) {
      case '%s': return String(args.shift());
      case '%d': return String(Number(args.shift()));
      case '%j':
        try {
          return JSON.stringify(args.shift());
        } catch (_) {
          return '[Circular]';
        }
      case '%%': return '%';
      default:
        return x;
    }
  });
}

export function inherits(ctor: Function, superCtor: Function): void {
  if (!ctor || !superCtor) {
    throw new Error('The constructor to "inherits" from must not be null or undefined');
  }
  
  (ctor as any).super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
}

export function inspect(obj: any, options?: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export function isArray(arg: any): arg is Array<any> {
  return Array.isArray(arg);
}

export function isBoolean(arg: any): arg is boolean {
  return typeof arg === 'boolean';
}

export function isNull(arg: any): arg is null {
  return arg === null;
}

export function isNullOrUndefined(arg: any): arg is null | undefined {
  return arg === null || arg === undefined;
}

export function isNumber(arg: any): arg is number {
  return typeof arg === 'number';
}

export function isString(arg: any): arg is string {
  return typeof arg === 'string';
}

export function isSymbol(arg: any): arg is symbol {
  return typeof arg === 'symbol';
}

export function isUndefined(arg: any): arg is undefined {
  return arg === undefined;
}

export function isObject(arg: any): boolean {
  return arg !== null && typeof arg === 'object';
}

export function isPrimitive(arg: any): boolean {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||
         typeof arg === 'undefined';
}

export function isFunction(arg: any): arg is Function {
  return typeof arg === 'function';
}

export default {
  promisify,
  callbackify,
  deprecate,
  debuglog,
  format,
  inherits,
  inspect,
  isArray,
  isBoolean,
  isNull,
  isNullOrUndefined,
  isNumber,
  isString,
  isSymbol,
  isUndefined,
  isObject,
  isPrimitive,
  isFunction
};