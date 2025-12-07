/**
 * NDF - Note Data Format Parser
 * TypeScript/JavaScript implementation
 * 
 * @packageDocumentation
 */

export type NDFValue = string | number | boolean | null | NDFObject | NDFArray;
export type NDFObject = { [key: string]: NDFValue };
export type NDFArray = NDFValue[];

interface ParsedResult {
  data: NDFObject;
  index: number;
}

/**
 * Main parser class for Note Data Format
 * 
 * @example
 * ```typescript
 * import { NoteDataFormat } from 'notedf';
 * 
 * const parser = new NoteDataFormat();
 * const data = parser.parse('name: Alice\nage: 30');
 * console.log(data); // { name: 'Alice', age: 30 }
 * ```
 */
export class NoteDataFormat {
  private references: Map<string, NDFValue>;

  constructor() {
    this.references = new Map();
  }

  // ============= PUBLIC API =============

  /**
   * Load and parse NDF file (Node.js only)
   * 
   * @param filepath - Path to .notedf file
   * @returns Parsed data as object
   * 
   * @example
   * ```typescript
   * const data = await parser.loadFile('config.notedf');
   * ```
   */
  async loadFile(filepath: string): Promise<NDFObject> {
    if (typeof (globalThis as any).window !== 'undefined') {
      throw new Error('loadFile() is only available in Node.js environment');
    }
    const fs = await import('fs/promises');
    const content = await fs.readFile(filepath, 'utf-8');
    return this.parse(content);
  }

  /**
   * Load NDF file synchronously (Node.js only)
   * 
   * @param filepath - Path to .notedf file
   * @returns Parsed data as object
   * 
   * @example
   * ```typescript
   * const data = parser.loadFileSync('config.notedf');
   * ```
   */
  loadFileSync(filepath: string): NDFObject {
    if (typeof (globalThis as any).window !== 'undefined') {
      throw new Error('loadFileSync() is only available in Node.js environment');
    }
    const fs = require('fs');
    const content = fs.readFileSync(filepath, 'utf-8');
    return this.parse(content);
  }

  /**
   * Save data to NDF file (Node.js only)
   * 
   * @param data - Object to save
   * @param filepath - Path to .notedf file
   * 
   * @example
   * ```typescript
   * await parser.saveFile({ name: 'Alice' }, 'data.notedf');
   * ```
   */
  async saveFile(data: NDFObject, filepath: string): Promise<void> {
    if (typeof (globalThis as any).window !== 'undefined') {
      throw new Error('saveFile() is only available in Node.js environment');
    }
    const fs = await import('fs/promises');
    const content = this.dumps(data);
    await fs.writeFile(filepath, content, 'utf-8');
  }

  /**
   * Save data to NDF file synchronously (Node.js only)
   * 
   * @param data - Object to save
   * @param filepath - Path to .notedf file
   * 
   * @example
   * ```typescript
   * parser.saveFileSync({ name: 'Alice' }, 'data.notedf');
   * ```
   */
  saveFileSync(data: NDFObject, filepath: string): void {
    if (typeof (globalThis as any).window !== 'undefined') {
      throw new Error('saveFileSync() is only available in Node.js environment');
    }
    const fs = require('fs');
    const content = this.dumps(data);
    fs.writeFileSync(filepath, content, 'utf-8');
  }

  /**
   * Parse NDF text into JavaScript object
   * 
   * @param text - NDF formatted string
   * @returns Parsed data as object
   * 
   * @example
   * ```typescript
   * const data = parser.parse('name: Alice\nage: 30');
   * console.log(data); // { name: 'Alice', age: 30 }
   * ```
   */
  parse(text: string): NDFObject {
    this.references.clear();
    const lines = text.trim().split('\n');
    return this.parseBlock(lines, 0).data;
  }

  /**
   * Convert JavaScript object to NDF format
   * 
   * @param data - Object to convert
   * @param indent - Starting indentation level
   * @returns NDF formatted string
   * 
   * @example
   * ```typescript
   * const ndf = parser.dumps({ name: 'Alice', age: 30 });
   * console.log(ndf); // "name: Alice\nage: 30"
   * ```
   */
  dumps(data: NDFObject, indent: number = 0): string {
    const lines: string[] = [];
    const indentStr = '  '.repeat(indent);

    for (const [key, value] of Object.entries(data)) {
      if (this.isObject(value)) {
        lines.push(`${indentStr}${key}:`);
        lines.push(this.dumps(value as NDFObject, indent + 1));
      } else if (Array.isArray(value)) {
        lines.push(this.formatList(key, value, indentStr));
      } else if (typeof value === 'string' && value.includes('\n')) {
        lines.push(this.formatMultiline(key, value, indentStr));
      } else {
        lines.push(`${indentStr}${key}: ${this.formatValue(value)}`);
      }
    }

    return lines.join('\n');
  }

  // ============= PARSING METHODS =============

  private parseBlock(lines: string[], startIndent: number): ParsedResult {
    const result: NDFObject = {};
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        i++;
        continue;
      }

      const indent = this.getIndent(line);

      // Dedented - done with this block
      if (indent < startIndent) {
        break;
      }

      // Skip lines not at our level
      if (indent > startIndent) {
        i++;
        continue;
      }

      // Clean line
      const cleanLine = this.removeInlineComment(line).trim();

      // Handle references
      if (cleanLine.startsWith('$')) {
        this.handleReference(cleanLine);
        i++;
        continue;
      }

      // Parse key-value pair
      if (!cleanLine.includes(':')) {
        i++;
        continue;
      }

      const [key, value] = this.splitKeyValue(cleanLine);

      // Multi-line text
      if (value === '|') {
        const { text, newIndex } = this.parseMultiline(lines, i, indent);
        result[key] = text;
        i = newIndex;
        continue;
      }

      // Nested object
      if (!value) {
        const { data: nestedData, newIndex } = this.parseNested(lines, i, indent);
        result[key] = nestedData;
        i = newIndex;
        continue;
      }

      // Parse value
      result[key] = this.parseValue(value);
      i++;
    }

    return { data: result, index: i };
  }

  private parseMultiline(
    lines: string[],
    i: number,
    indent: number
  ): { text: string; newIndex: number } {
    const textLines: string[] = [];
    let currentIndex = i + 1;

    while (currentIndex < lines.length) {
      const nextLine = lines[currentIndex];
      const nextIndent = this.getIndent(nextLine);

      if (nextIndent <= indent && nextLine.trim()) {
        break;
      }

      const content = nextLine.length > indent + 2 
        ? nextLine.slice(indent + 2) 
        : '';
      textLines.push(content);
      currentIndex++;
    }

    return { text: textLines.join('\n').trimEnd(), newIndex: currentIndex };
  }

  private parseNested(
    lines: string[],
    i: number,
    indent: number
  ): { data: NDFObject | null; newIndex: number } {
    let nestedStart = i + 1;
    const nestedLines: string[] = [];

    while (nestedStart < lines.length) {
      const nextLine = lines[nestedStart];

      if (!nextLine.trim() || nextLine.trim().startsWith('#')) {
        nestedStart++;
        continue;
      }

      const nextIndent = this.getIndent(nextLine);
      if (nextIndent <= indent) {
        break;
      }

      nestedLines.push(nextLine);
      nestedStart++;
    }

    if (nestedLines.length > 0) {
      return { data: this.parseBlock(nestedLines, indent + 2).data, newIndex: nestedStart };
    }

    return { data: null, newIndex: i + 1 };
  }

  private parseValue(value: string): NDFValue {
    value = value.trim();

    // Reference
    if (value.startsWith('$')) {
      return this.resolveReference(value);
    }

    // Inline object
    if (value.startsWith('{') && value.endsWith('}')) {
      return this.parseInlineObject(value);
    }

    // Array
    if (value.startsWith('[') && value.endsWith(']')) {
      return this.parseArray(value);
    }

    // Type hints
    if (value.startsWith('@')) {
      return this.parseTypedValue(value);
    }

    // List (comma or space separated)
    if (value.includes(',') || (value.includes(' ') && !value.startsWith('"'))) {
      const items = value.split(/[,\s]+/).filter(item => item.trim());
      return items.map(item => this.parseSimpleValue(item));
    }

    return this.parseSimpleValue(value);
  }

  private parseSimpleValue(value: string): string | number | boolean | null {
    value = value.trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // Boolean
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'yes' || lowerValue === 'true') return true;
    if (lowerValue === 'no' || lowerValue === 'false') return false;

    // Null
    if (lowerValue === 'null' || lowerValue === 'none' || lowerValue === '-') {
      return null;
    }

    // Number
    const num = Number(value);
    if (!isNaN(num) && value !== '') {
      return num;
    }

    return value;
  }

  private parseInlineObject(text: string): NDFObject {
    text = text.slice(1, -1).trim(); // Remove braces
    const result: NDFObject = {};

    const pairs = text.split(',');
    for (const pair of pairs) {
      if (!pair.includes(':')) continue;
      const [key, value] = pair.split(':').map(s => s.trim());
      result[key] = this.parseSimpleValue(value);
    }

    return result;
  }

  private parseArray(text: string): NDFArray {
    text = text.slice(1, -1).trim(); // Remove brackets

    // Handle nested arrays
    if (text.includes('[')) {
      const result: NDFArray = [];
      let depth = 0;
      let item = '';

      for (const char of text + ',') {
        if (char === '[') {
          depth++;
          item += char;
        } else if (char === ']') {
          depth--;
          item += char;
        } else if (char === ',' && depth === 0) {
          if (item.trim()) {
            if (item.trim().startsWith('[')) {
              result.push(this.parseArray(item.trim()));
            } else {
              result.push(this.parseSimpleValue(item.trim()));
            }
          }
          item = '';
        } else {
          item += char;
        }
      }

      return result;
    }

    // Simple array
    const items = text.split(',').map(s => s.trim()).filter(s => s);
    return items.map(item => this.parseSimpleValue(item));
  }

  private parseTypedValue(value: string): NDFValue {
    const parts = value.split(/\s+/, 2);
    if (parts.length !== 2) return value;

    const [typeHint, actualValue] = parts;

    if (typeHint === '@time') {
      return { _type: 'timestamp', value: actualValue };
    } else if (typeHint.startsWith('@f') && typeHint.includes('[')) {
      return actualValue.split(',').map(x => parseFloat(x.trim()));
    } else if (typeHint === '@embedding') {
      return { _type: 'embedding', data: actualValue };
    }

    return actualValue;
  }

  // ============= REFERENCE HANDLING =============

  private handleReference(line: string): void {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    this.references.set(key, this.parseValue(value));
  }

  private resolveReference(value: string): NDFValue {
    const refKey = value.split(/\s+/)[0];

    if (!this.references.has(refKey)) {
      return value;
    }

    let base = this.references.get(refKey)!;

    // Handle inline overrides
    if (value.includes('{') && this.isObject(base)) {
      base = { ...(base as NDFObject) };
      const overrideStart = value.indexOf('{');
      const override = this.parseInlineObject(value.slice(overrideStart));
      Object.assign(base, override);
    }

    return base;
  }

  // ============= FORMATTING METHODS =============

  private formatList(key: string, value: NDFArray, indentStr: string): string {
    if (value.every(item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
      return `${indentStr}${key}: ${value.join(', ')}`;
    }

    const lines = [`${indentStr}${key}:`];
    for (const item of value) {
      if (this.isObject(item)) {
        lines.push(this.dumps(item as NDFObject, indentStr.length / 2 + 1));
      } else {
        lines.push(`${indentStr}  - ${item}`);
      }
    }
    return lines.join('\n');
  }

  private formatMultiline(key: string, value: string, indentStr: string): string {
    const lines = [`${indentStr}${key}: |`];
    for (const line of value.split('\n')) {
      lines.push(`${indentStr}  ${line}`);
    }
    return lines.join('\n');
  }

  private formatValue(value: NDFValue): string {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value ? 'yes' : 'no';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) return `[${value.join(', ')}]`;
    if (this.isObject(value)) {
      const pairs = Object.entries(value as NDFObject)
        .map(([k, v]) => `${k}: ${this.formatValue(v)}`);
      return `{${pairs.join(', ')}}`;
    }
    return String(value);
  }

  // ============= HELPER METHODS =============

  private getIndent(line: string): number {
    return line.length - line.trimStart().length;
  }

  private removeInlineComment(line: string): string {
    const commentIndex = line.indexOf('#');
    return commentIndex !== -1 ? line.slice(0, commentIndex) : line;
  }

  private splitKeyValue(line: string): [string, string] {
    const colonIndex = line.indexOf(':');
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    return [key, value];
  }

  private isObject(value: unknown): value is NDFObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NoteDataFormat };
}

// Default export
export default NoteDataFormat;