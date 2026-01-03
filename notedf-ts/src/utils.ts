import { NDFValue, NDFObject } from './types';

export function get(obj: NDFObject, path: string): NDFValue | undefined {
  const keys = parsePath(path);
  let current: NDFValue = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = parseInt(key, 10);
      if (isNaN(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
    } else if (typeof current === 'object') {
      current = (current as NDFObject)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

export function set(obj: NDFObject, path: string, value: NDFValue): NDFObject {
  const keys = parsePath(path);
  const result = deepClone(obj) as NDFObject;
  
  let current: any = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const isNextArray = /^\d+$/.test(nextKey);

    if (current[key] === undefined || current[key] === null) {
      current[key] = isNextArray ? [] : {};
    }

    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  if (Array.isArray(current)) {
    const index = parseInt(lastKey, 10);
    current[index] = value;
  } else {
    current[lastKey] = value;
  }

  return result;
}

export function del(obj: NDFObject, path: string): NDFObject {
  const keys = parsePath(path);
  const result = deepClone(obj) as NDFObject;
  
  let current: any = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined) {
      return result;
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  if (Array.isArray(current)) {
    const index = parseInt(lastKey, 10);
    current.splice(index, 1);
  } else {
    delete current[lastKey];
  }

  return result;
}

export function has(obj: NDFObject, path: string): boolean {
  return get(obj, path) !== undefined;
}

export function merge(target: NDFObject, source: NDFObject): NDFObject {
  const result = deepClone(target) as NDFObject;

  for (const [key, value] of Object.entries(source)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = merge(result[key] as NDFObject, value);
    } else {
      result[key] = deepClone(value);
    }
  }

  return result;
}

export function deepClone<T extends NDFValue>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => deepClone(item)) as T;
  }

  const result: NDFObject = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = deepClone(val);
  }
  return result as T;
}

export function flatten(obj: NDFObject, prefix: string = ''): Record<string, NDFValue> {
  const result: Record<string, NDFValue> = {};

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value, path));
    } else {
      result[path] = value;
    }
  }

  return result;
}

export function unflatten(flat: Record<string, NDFValue>): NDFObject {
  let result: NDFObject = {};

  for (const [path, value] of Object.entries(flat)) {
    result = set(result, path, value);
  }

  return result;
}

export function keys(obj: NDFObject, prefix: string = ''): string[] {
  const result: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    result.push(path);

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result.push(...keys(value, path));
    }
  }

  return result;
}

function parsePath(path: string): string[] {
  const result: string[] = [];
  let current = '';
  let inBracket = false;

  for (const char of path) {
    if (char === '[' && !inBracket) {
      if (current) {
        result.push(current);
        current = '';
      }
      inBracket = true;
    } else if (char === ']' && inBracket) {
      if (current) {
        result.push(current);
        current = '';
      }
      inBracket = false;
    } else if (char === '.' && !inBracket) {
      if (current) {
        result.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

export function processEscapes(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
}

export function needsQuoting(str: string): boolean {
  if (str === '') return true;
  if (str !== str.trim()) return true;
  if (/[:#\[\]{},"']/.test(str)) return true;
  if (/^(yes|no|true|false|null|none|-)$/i.test(str)) return true;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(str)) return true;
  if (str.startsWith('$')) return true;
  if (str.startsWith('@')) return true;
  
  return false;
}

export function quoteIfNeeded(str: string): string {
  if (needsQuoting(str)) {
    const escaped = escapeString(str);
    return `"${escaped.replace(/"/g, '\\"')}"`;
  }
  return str;
}

export function isEqual(a: NDFValue, b: NDFValue): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => isEqual(item, b[i]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      keysB.includes(key) && isEqual((a as NDFObject)[key], (b as NDFObject)[key])
    );
  }

  return false;
}

export function diff(
  oldObj: NDFObject,
  newObj: NDFObject
): { added: string[]; removed: string[]; changed: string[] } {
  const oldFlat = flatten(oldObj);
  const newFlat = flatten(newObj);
  const oldKeys = new Set(Object.keys(oldFlat));
  const newKeys = new Set(Object.keys(newFlat));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const key of newKeys) {
    if (!oldKeys.has(key)) {
      added.push(key);
    } else if (!isEqual(oldFlat[key], newFlat[key])) {
      changed.push(key);
    }
  }

  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      removed.push(key);
    }
  }

  return { added, removed, changed };
}
