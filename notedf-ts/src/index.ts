import {
  NDFValue,
  NDFObject,
  NDFArray,
  NDFPrimitive,
  ReferenceStore,
  ParseOptions,
  DumpOptions,
  ParseResult,
  ValidationResult,
  DEFAULT_PARSE_OPTIONS,
  DEFAULT_DUMP_OPTIONS,
} from './types';

import {
  ReferenceError as NDFReferenceError,
  ValidationError,
  ErrorCodes,
} from './errors';

import {
  isReference,
  isReferenceDefinition,
  parseReference,
  resolveReference,
  resolveAllReferences,
  collectReferences,
  findReferenceUsages,
} from './references';

import {
  processEscapes,
  quoteIfNeeded,
  get,
  set,
  del,
  has,
  merge,
  deepClone,
  flatten,
  unflatten,
  keys,
  isEqual,
  diff,
} from './utils';

// Export only the main class for internal use (VSCode extension)
export { NDFObject, NDFValue, NDFArray } from './types';
export { ValidationError as ValidationErrorClass } from './errors';

interface ParseContext {
  lines: string[];
  lineIndex: number;
  options: Required<ParseOptions>;
  references: ReferenceStore;
  errors: Array<{ message: string; line: number; column: number; code: string }>;
  warnings: Array<{ message: string; line: number; column: number; code: string }>;
}

export class NoteDataFormat {
  private defaultParseOptions: Required<ParseOptions>;
  private defaultDumpOptions: Required<DumpOptions>;

  constructor(
    parseOptions?: Partial<ParseOptions>,
    dumpOptions?: Partial<DumpOptions>
  ) {
    this.defaultParseOptions = { ...DEFAULT_PARSE_OPTIONS, ...parseOptions };
    this.defaultDumpOptions = { ...DEFAULT_DUMP_OPTIONS, ...dumpOptions };
  }

  // ============= FILE OPERATIONS =============

  async loadFile(filepath: string, options?: Partial<ParseOptions>): Promise<NDFObject> {
    if (typeof (globalThis as any).window !== 'undefined') {
      throw new Error('loadFile() is only available in Node.js environment');
    }
    const fs = await import('fs/promises');
    const content = await fs.readFile(filepath, 'utf-8');
    return this.parse(content, options);
  }

  async saveFile(data: NDFObject, filepath: string, options?: Partial<DumpOptions>): Promise<void> {
    if (typeof (globalThis as any).window !== 'undefined') {
      throw new Error('saveFile() is only available in Node.js environment');
    }
    const fs = await import('fs/promises');
    const content = this.dumps(data, options);
    await fs.writeFile(filepath, content, 'utf-8');
  }

  // ============= MAIN PARSING =============

  parse(text: string, options?: Partial<ParseOptions>): NDFObject {
    const result = this.parseWithMetadata(text, options);
    
    if (result.errors.length > 0) {
      const opts = { ...this.defaultParseOptions, ...options };
      if (opts.strict) {
        throw new ValidationError(result.errors);
      }
    }

    return result.data;
  }

  parseWithMetadata(text: string, options?: Partial<ParseOptions>): ParseResult {
    const opts: Required<ParseOptions> = { ...this.defaultParseOptions, ...options };
    const lines = text.split('\n');
    
    const ctx: ParseContext = {
      lines,
      lineIndex: 0,
      options: opts,
      references: new Map(),
      errors: [],
      warnings: [],
    };

    const data = this.parseBlock(ctx, 0);

    // Collect references
    ctx.references = collectReferences(data);

    // Resolve references if enabled
    let resolvedData = data;
    if (opts.resolveReferences) {
      try {
        resolvedData = resolveAllReferences(
          data,
          ctx.references,
          opts,
          { line: 1, column: 1, offset: 0 }
        ) as NDFObject;
      } catch (error) {
        if (error instanceof NDFReferenceError) {
          ctx.errors.push({
            message: error.message,
            line: error.line,
            column: error.column,
            code: error.code,
          });
        } else {
          throw error;
        }
      }
    }

    // Check for unused references
    if (!opts.preserveReferences) {
      const usedRefs = findReferenceUsages(data);
      for (const [refName] of ctx.references) {
        if (!usedRefs.includes(refName)) {
          ctx.warnings.push({
            message: `Unused reference: $${refName}`,
            line: 1, // Would need position tracking to be accurate
            column: 1,
            code: ErrorCodes.UNUSED_REFERENCE,
          });
        }
      }
    }

    return {
      data: resolvedData,
      references: ctx.references,
      errors: ctx.errors,
      warnings: ctx.warnings,
    };
  }

  validate(text: string, options?: Partial<ParseOptions>): ValidationResult {
    const result = this.parseWithMetadata(text, { ...options, strict: false });
    
    return {
      valid: result.errors.length === 0,
      errors: result.errors,
      warnings: result.warnings,
    };
  }

  // ============= SERIALIZATION =============

  dumps(data: NDFObject, options?: Partial<DumpOptions>): string {
    const opts: Required<DumpOptions> = { ...this.defaultDumpOptions, ...options };
    return this.serializeObject(data, opts, opts.indentLevel);
  }

  private serializeObject(obj: NDFObject, opts: Required<DumpOptions>, level: number): string {
    const lines: string[] = [];
    
    let entries = Object.entries(obj);
    
    if (opts.sortKeys) {
      entries = entries.sort(([a], [b]) => a.localeCompare(b));
    }

    for (const [key, value] of entries) {
      if (!opts.includeReferences && isReferenceDefinition(key)) {
        continue;
      }

      lines.push(this.serializeEntry(key, value, opts, level));
    }

    return lines.join('\n');
  }

  private serializeEntry(key: string, value: NDFValue, opts: Required<DumpOptions>, level: number): string {
    const indent = opts.indent.repeat(level);

    if (value === null) {
      return `${indent}${key}: null`;
    }

    if (typeof value === 'boolean') {
      return `${indent}${key}: ${value ? 'yes' : 'no'}`;
    }

    if (typeof value === 'number') {
      return `${indent}${key}: ${value}`;
    }

    if (typeof value === 'string') {
      if (value.includes('\n')) {
        const contentLines = value.split('\n').map(line => `${indent}${opts.indent}${line}`);
        return `${indent}${key}: |\n${contentLines.join('\n')}`;
      }
      const formatted = quoteIfNeeded(value);
      return `${indent}${key}: ${formatted}`;
    }

    if (Array.isArray(value)) {
      return this.serializeArray(key, value, opts, level);
    }

    if (typeof value === 'object') {
      const nested = this.serializeObject(value, opts, level + 1);
      return `${indent}${key}:\n${nested}`;
    }

    return `${indent}${key}: ${String(value)}`;
  }

  private serializeArray(key: string, arr: NDFArray, opts: Required<DumpOptions>, level: number): string {
    const indent = opts.indent.repeat(level);

    const allSimple = arr.every(item => 
      item === null || 
      typeof item === 'boolean' || 
      typeof item === 'number' || 
      (typeof item === 'string' && !item.includes('\n'))
    );

    if (allSimple) {
      const inlineItems = arr.map(item => this.formatPrimitive(item));
      const inline = `${key}: ${inlineItems.join(', ')}`;
      
      if (inline.length <= opts.inlineThreshold) {
        return `${indent}${inline}`;
      }
    }

    const lines = [`${indent}${key}:`];
    
    for (const item of arr) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        const nested = this.serializeObject(item, opts, level + 2);
        lines.push(`${indent}${opts.indent}-`);
        lines.push(nested);
      } else {
        lines.push(`${indent}${opts.indent}- ${this.formatPrimitive(item)}`);
      }
    }

    return lines.join('\n');
  }

  private formatPrimitive(value: NDFValue): string {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value ? 'yes' : 'no';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return quoteIfNeeded(value);
    if (Array.isArray(value)) {
      return `[${value.map(v => this.formatPrimitive(v)).join(', ')}]`;
    }
    if (typeof value === 'object') {
      const pairs = Object.entries(value)
        .map(([k, v]) => `${k}: ${this.formatPrimitive(v)}`);
      return `{${pairs.join(', ')}}`;
    }
    return String(value);
  }

  // ============= INTERNAL PARSING =============

  private parseBlock(ctx: ParseContext, startIndent: number): NDFObject {
    const result: NDFObject = {};

    while (ctx.lineIndex < ctx.lines.length) {
      const line = ctx.lines[ctx.lineIndex];
      const lineNum = ctx.lineIndex + 1;
      
      if (!line.trim() || line.trim().startsWith('#')) {
        ctx.lineIndex++;
        continue;
      }

      const indent = this.getIndent(line);

      if (indent < startIndent) {
        break;
      }

      if (indent > startIndent) {
        ctx.lineIndex++;
        continue;
      }

      if (line.endsWith(' ') || line.endsWith('\t')) {
        ctx.warnings.push({
          message: 'Trailing whitespace',
          line: lineNum,
          column: line.length,
          code: ErrorCodes.TRAILING_WHITESPACE,
        });
      }

      const cleanLine = this.removeInlineComment(line).trim();
      
      if (!cleanLine.includes(':')) {
        ctx.lineIndex++;
        continue;
      }

      const { key, value: valueStr, colonIndex } = this.splitKeyValue(cleanLine);

      if (!key) {
        ctx.errors.push({
          message: 'Invalid key',
          line: lineNum,
          column: 1,
          code: ErrorCodes.INVALID_KEY,
        });
        ctx.lineIndex++;
        continue;
      }

      if (result.hasOwnProperty(key)) {
        ctx.warnings.push({
          message: `Duplicate key: ${key}`,
          line: lineNum,
          column: 1,
          code: ErrorCodes.DUPLICATE_KEY,
        });
      }

      if (valueStr === '|') {
        const { text, endIndex } = this.parseMultiline(ctx, ctx.lineIndex, indent);
        result[key] = text;
        ctx.lineIndex = endIndex;
        continue;
      }

      if (!valueStr) {
        const { data, endIndex } = this.parseNested(ctx, ctx.lineIndex, indent);
        result[key] = data;
        ctx.lineIndex = endIndex;
        continue;
      }

      result[key] = this.parseValue(valueStr, ctx, lineNum, colonIndex + 2);
      ctx.lineIndex++;
    }

    return result;
  }

  private parseMultiline(ctx: ParseContext, startLine: number, baseIndent: number): { text: string; endIndex: number } {
    const textLines: string[] = [];
    let i = startLine + 1;
    const contentIndent = baseIndent + 2;

    while (i < ctx.lines.length) {
      const line = ctx.lines[i];
      if (!line.trim()) {
        textLines.push('');
        i++;
        continue;
      }

      const lineIndent = this.getIndent(line);
      if (lineIndent < contentIndent && line.trim()) {
        break;
      }

      const content = line.length > contentIndent ? line.slice(contentIndent) : '';
      textLines.push(content);
      i++;
    }

    while (textLines.length > 0 && textLines[textLines.length - 1] === '') {
      textLines.pop();
    }

    return { text: textLines.join('\n'), endIndex: i };
  }

  private parseNested(ctx: ParseContext, startLine: number, baseIndent: number): { data: NDFObject | NDFArray | null; endIndex: number } {
    const nestedIndent = baseIndent + 2;
    let i = startLine + 1;

    while (i < ctx.lines.length) {
      const line = ctx.lines[i];
      if (line.trim() && !line.trim().startsWith('#')) {
        break;
      }
      i++;
    }

    if (i >= ctx.lines.length) {
      return { data: null, endIndex: i };
    }

    const firstContentIndent = this.getIndent(ctx.lines[i]);
    if (firstContentIndent <= baseIndent) {
      return { data: null, endIndex: i };
    }

    if (ctx.lines[i].trim().startsWith('-')) {
      return this.parseList(ctx, i, baseIndent);
    }

    const savedIndex = ctx.lineIndex;
    ctx.lineIndex = i;
    const data = this.parseBlock(ctx, nestedIndent);
    const endIndex = ctx.lineIndex;
    ctx.lineIndex = savedIndex;

    return { data: Object.keys(data).length > 0 ? data : null, endIndex };
  }

  private parseList(ctx: ParseContext, startLine: number, baseIndent: number): { data: NDFArray; endIndex: number } {
    const result: NDFArray = [];
    const listIndent = baseIndent + 2;
    let i = startLine;

    while (i < ctx.lines.length) {
      const line = ctx.lines[i];
      if (!line.trim() || line.trim().startsWith('#')) {
        i++;
        continue;
      }

      const lineIndent = this.getIndent(line);
      if (lineIndent < listIndent) {
        break;
      }

      const trimmed = line.trim();
      if (trimmed.startsWith('-')) {
        const itemValue = trimmed.slice(1).trim();

        if (!itemValue) {
          const { data, endIndex } = this.parseNested(ctx, i, lineIndent);
          if (data !== null) {
            result.push(data);
          }
          i = endIndex;
        } else {
          result.push(this.parseValue(itemValue, ctx, i + 1, lineIndent + 2));
          i++;
        }
      } else {
        i++;
      }
    }

    return { data: result, endIndex: i };
  }

  private parseValue(value: string, ctx: ParseContext, line: number, column: number): NDFValue {
    value = value.trim();
    if (!value) {
      return null;
    }
    if (value.startsWith('{') && value.endsWith('}')) {
      return this.parseInlineObject(value, ctx, line, column);
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      return this.parseArray(value, ctx, line, column);
    }
    if (isReference(value)) {
      if (ctx.options.preserveReferences) {
        return value;
      }
      const usage = parseReference(value);
      if (usage) {
        try {
          return resolveReference(
            usage,
            ctx.references,
            ctx.options,
            { line, column, offset: 0 }
          );
        } catch {
          return value;
        }
      }
    }
    if (!value.startsWith('"') && !value.startsWith("'")) {
      if (value.includes(',')) {
        return value.split(',').map(s => this.parseSimpleValue(s.trim()));
      }
      const parts = value.split(/\s+/).filter(s => s);
      if (parts.length > 1 && parts.every(p => !p.includes('.') && p.length < 20)) {
        return parts.map(s => this.parseSimpleValue(s));
      }
    }
    return this.parseSimpleValue(value);
  }

  private parseSimpleValue(value: string): NDFPrimitive {
    value = value.trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      const inner = value.slice(1, -1);
      return processEscapes(inner);
    }
    const lower = value.toLowerCase();
    if (lower === 'yes' || lower === 'true') return true;
    if (lower === 'no' || lower === 'false') return false;
    if (lower === 'null' || lower === 'none' || lower === '-') return null;
    if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) {
      return Number(value);
    }
    if (value.startsWith('@')) {
      const match = value.match(/^@\w+(?:\[\d+\])?\s+(.+)$/);
      if (match) {
        return this.parseSimpleValue(match[1]);
      }
      return value;
    }
    return value;
  }

  private parseInlineObject(text: string, ctx: ParseContext, line: number, column: number): NDFObject {
    const inner = text.slice(1, -1).trim();
    const result: NDFObject = {};

    if (!inner) return result;

    let depth = 0;
    let current = '';
    const pairs: string[] = [];

    for (const char of inner) {
      if (char === '{') depth++;
      else if (char === '}') depth--;
      else if (char === ',' && depth === 0) {
        pairs.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    if (current.trim()) pairs.push(current.trim());

    for (const pair of pairs) {
      const colonIdx = pair.indexOf(':');
      if (colonIdx === -1) continue;

      const key = pair.slice(0, colonIdx).trim();
      const value = pair.slice(colonIdx + 1).trim();

      if (key) {
        result[key] = this.parseValue(value, ctx, line, column);
      }
    }

    return result;
  }

  private parseArray(text: string, ctx: ParseContext, line: number, column: number): NDFArray {
    const inner = text.slice(1, -1).trim();

    if (!inner) return [];

    let depth = 0;
    let braceDepth = 0;
    let current = '';
    const items: string[] = [];

    for (const char of inner) {
      if (char === '[') depth++;
      else if (char === ']') depth--;
      else if (char === '{') braceDepth++;
      else if (char === '}') braceDepth--;
      else if (char === ',' && depth === 0 && braceDepth === 0) {
        items.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    if (current.trim()) items.push(current.trim());

    return items.map(item => {
      if (item.startsWith('[')) {
        return this.parseArray(item, ctx, line, column);
      }
      if (item.startsWith('{')) {
        return this.parseInlineObject(item, ctx, line, column);
      }
      return this.parseSimpleValue(item);
    });
  }

  // ============= HELPERS =============

  private getIndent(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  private removeInlineComment(line: string): string {
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : '';
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
      } else if (!inString && char === '#') {
        return line.slice(0, i);
      }
    }
    
    return line;
  }

  private splitKeyValue(line: string): { key: string; value: string; colonIndex: number } {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return { key: line.trim(), value: '', colonIndex: line.length };
    }
    return {
      key: line.slice(0, colonIndex).trim(),
      value: line.slice(colonIndex + 1).trim(),
      colonIndex,
    };
  }

  // ============= UTILITY METHODS =============

  /** Get a value by path */
  get(data: NDFObject, path: string): NDFValue | undefined {
    return get(data, path);
  }

  /** Set a value by path */
  set(data: NDFObject, path: string, value: NDFValue): NDFObject {
    return set(data, path, value);
  }

  /** Delete a value by path */
  delete(data: NDFObject, path: string): NDFObject {
    return del(data, path);
  }

  /** Check if a path exists */
  has(data: NDFObject, path: string): boolean {
    return has(data, path);
  }

  /** Merge two objects */
  merge(target: NDFObject, source: NDFObject): NDFObject {
    return merge(target, source);
  }

  /** Deep clone data */
  clone<T extends NDFValue>(data: T): T {
    return deepClone(data);
  }

  /** Flatten to dot-notation */
  flatten(data: NDFObject): Record<string, NDFValue> {
    return flatten(data);
  }

  /** Unflatten from dot-notation */
  unflatten(flat: Record<string, NDFValue>): NDFObject {
    return unflatten(flat);
  }

  /** Get all paths */
  keys(data: NDFObject): string[] {
    return keys(data);
  }

  /** Compare two values */
  isEqual(a: NDFValue, b: NDFValue): boolean {
    return isEqual(a, b);
  }

  /** Get diff between objects */
  diff(oldData: NDFObject, newData: NDFObject): { added: string[]; removed: string[]; changed: string[] } {
    return diff(oldData, newData);
  }
}

export default NoteDataFormat;
