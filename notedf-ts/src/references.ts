import { NDFValue, NDFObject, ReferenceStore, ParseOptions } from './types';
import { ReferenceError, ErrorCodes } from './errors';

export interface ReferenceUsage {
  name: string;
  overrides?: NDFObject;
}

export function parseReference(text: string): ReferenceUsage | null {
  const match = text.match(/^\$([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\{([^}]*)\})?$/);
  
  if (!match) {
    return null;
  }

  const name = match[1];
  const overridesStr = match[2];

  if (!overridesStr) {
    return { name };
  }

  const overrides: NDFObject = {};
  const pairs = overridesStr.split(',');
  
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':');
    if (colonIdx === -1) continue;
    
    const key = pair.slice(0, colonIdx).trim();
    const value = pair.slice(colonIdx + 1).trim();
    
    if (key) {
      overrides[key] = parseSimpleValue(value);
    }
  }

  return { name, overrides: Object.keys(overrides).length > 0 ? overrides : undefined };
}

export function isReference(text: string): boolean {
  return /^\$[a-zA-Z_][a-zA-Z0-9_]*(?:\s*\{[^}]*\})?$/.test(text.trim());
}

export function isReferenceDefinition(key: string): boolean {
  return /^\$[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);
}

export function getReferenceNameFromKey(key: string): string | null {
  const match = key.match(/^\$([a-zA-Z_][a-zA-Z0-9_]*)$/);
  return match ? match[1] : null;
}

export function resolveReference(
  usage: ReferenceUsage,
  store: ReferenceStore,
  options: ParseOptions,
  position: { line: number; column: number; offset: number }
): NDFValue {
  const value = store.get(usage.name);

  if (value === undefined) {
    if (options.allowUndefinedReferences) {
      return `$${usage.name}`;
    }
    throw new ReferenceError(
      usage.name,
      'Undefined reference',
      position,
      ErrorCodes.UNDEFINED_REFERENCE
    );
  }

  if (usage.overrides && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return { ...value, ...usage.overrides };
  }

  return value;
}

export function resolveAllReferences(
  value: NDFValue,
  store: ReferenceStore,
  options: ParseOptions,
  position: { line: number; column: number; offset: number },
  visited: Set<string> = new Set()
): NDFValue {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string' && isReference(value)) {
      const usage = parseReference(value);
      if (usage) {
        if (visited.has(usage.name)) {
          throw new ReferenceError(
            usage.name,
            'Circular reference detected',
            position,
            ErrorCodes.CIRCULAR_REFERENCE
          );
        }
        
        visited.add(usage.name);
        const resolved = resolveReference(usage, store, options, position);
        visited.delete(usage.name);
        
        return resolveAllReferences(resolved, store, options, position, visited);
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => resolveAllReferences(item, store, options, position, visited));
  }

  const result: NDFObject = {};
  for (const [key, val] of Object.entries(value)) {
    if (isReferenceDefinition(key)) {
      continue;
    }
    result[key] = resolveAllReferences(val, store, options, position, visited);
  }

  return result;
}

export function collectReferences(data: NDFObject): ReferenceStore {
  const store: ReferenceStore = new Map();
  
  for (const [key, value] of Object.entries(data)) {
    if (isReferenceDefinition(key)) {
      const name = getReferenceNameFromKey(key);
      if (name) {
        store.set(name, value);
      }
    }
  }

  return store;
}

export function findReferenceUsages(value: NDFValue): string[] {
  const usages: string[] = [];

  function traverse(val: NDFValue): void {
    if (typeof val === 'string' && isReference(val)) {
      const usage = parseReference(val);
      if (usage && !usages.includes(usage.name)) {
        usages.push(usage.name);
      }
    } else if (Array.isArray(val)) {
      val.forEach(traverse);
    } else if (typeof val === 'object' && val !== null) {
      Object.values(val).forEach(traverse);
    }
  }

  traverse(value);
  return usages;
}

function parseSimpleValue(value: string): string | number | boolean | null {
  value = value.trim();
  
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  const lower = value.toLowerCase();
  if (lower === 'yes' || lower === 'true') return true;
  if (lower === 'no' || lower === 'false') return false;
  if (lower === 'null' || lower === 'none' || lower === '-') return null;
  
  const num = Number(value);
  if (!isNaN(num) && value !== '') return num;
  
  return value;
}
