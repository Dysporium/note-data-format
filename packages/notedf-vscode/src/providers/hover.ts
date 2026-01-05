import * as vscode from 'vscode';
import { NoteDataFormat } from '@dysporium/notedf';
import { findReferenceDefinition } from './definition';

export function createHoverProvider(parser: NoteDataFormat): vscode.HoverProvider {
  return {
    provideHover(
      document: vscode.TextDocument,
      position: vscode.Position
    ): vscode.ProviderResult<vscode.Hover> {
      const line = document.lineAt(position.line);
      const lineText = line.text;

      const refRange = document.getWordRangeAtPosition(position, /\$[a-zA-Z_][a-zA-Z0-9_]*/);
      if (refRange) {
        const refName = document.getText(refRange);
        return createReferenceHover(document, parser, refName);
      }

      const keyMatch = lineText.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
      if (keyMatch) {
        const keyStart = keyMatch[1].length;
        const keyEnd = keyStart + keyMatch[2].length;
        
        if (position.character >= keyStart && position.character <= keyEnd) {
          return createKeyHover(document, parser, position.line, keyMatch[2], lineText);
        }
      }

      const colonIndex = lineText.indexOf(':');
      if (colonIndex !== -1 && position.character > colonIndex) {
        return createValueHover(lineText, colonIndex);
      }

      return null;
    }
  };
}

function createReferenceHover(
  document: vscode.TextDocument,
  parser: NoteDataFormat,
  refName: string
): vscode.Hover | null {
  const definition = findReferenceDefinition(document, refName);
  
  if (!definition) {
    return new vscode.Hover(
      new vscode.MarkdownString(`⚠️ **${refName}** - Reference not defined`)
    );
  }

  const defLine = document.lineAt(definition.range.start.line);
  const valueMatch = defLine.text.match(/:\s*(.+)$/);
  
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**Reference:** \`${refName}\`\n\n`);
  
  if (valueMatch) {
    const value = valueMatch[1].trim();
    md.appendMarkdown(`**Value:** ${formatValueForMarkdown(value)}\n\n`);
  }
  
  md.appendMarkdown(`*Defined at line ${definition.range.start.line + 1}*`);
  
  return new vscode.Hover(md);
}

function createKeyHover(
  document: vscode.TextDocument,
  parser: NoteDataFormat,
  lineNum: number,
  key: string,
  lineText: string
): vscode.Hover | null {
  try {
    const text = document.getText();
    const parsed = parser.parse(text);
    
    const path = getKeyPath(document, lineNum, key);
    const value = getValueAtPath(parsed, path);
    
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**Key:** \`${key}\`\n\n`);
    md.appendMarkdown(`**Path:** \`${path.join('.')}\`\n\n`);
    
    if (value !== undefined) {
      md.appendMarkdown(`**Type:** \`${getTypeName(value)}\`\n\n`);
      md.appendMarkdown(`**Value:**\n\`\`\`notedf\n${formatValuePreview(value)}\n\`\`\``);
    }
    
    return new vscode.Hover(md);
  } catch {
    const valueMatch = lineText.match(/:\s*(.+)$/);
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**Key:** \`${key}\`\n\n`);
    if (valueMatch) {
      md.appendMarkdown(`**Value:** ${formatValueForMarkdown(valueMatch[1].trim())}`);
    }
    return new vscode.Hover(md);
  }
}

function createValueHover(lineText: string, colonIndex: number): vscode.Hover | null {
  const valueText = lineText.substring(colonIndex + 1).trim();
  
  if (!valueText || valueText === '|') {
    return null;
  }

  const typeInfo = inferValueType(valueText);
  
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**Type:** \`${typeInfo.type}\`\n\n`);
  
  if (typeInfo.hint) {
    md.appendMarkdown(`**Hint:** ${typeInfo.hint}\n\n`);
  }
  
  md.appendMarkdown(`**Raw:** \`${valueText}\``);
  
  return new vscode.Hover(md);
}

function getKeyPath(document: vscode.TextDocument, lineNum: number, key: string): string[] {
  const path: string[] = [key];
  const currentIndent = getIndentLevel(document.lineAt(lineNum).text);
  
  for (let i = lineNum - 1; i >= 0; i--) {
    const line = document.lineAt(i);
    const lineIndent = getIndentLevel(line.text);
    
    if (lineIndent < currentIndent) {
      const parentMatch = line.text.match(/^\s*([a-zA-Z_$][a-zA-Z0-9_]*)\s*:/);
      if (parentMatch) {
        path.unshift(parentMatch[1]);
        if (lineIndent === 0) break;
      }
    }
  }
  
  return path;
}

function getIndentLevel(text: string): number {
  const match = text.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function getValueAtPath(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

function getTypeName(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array[${value.length}]`;
  if (typeof value === 'object') return `object{${Object.keys(value).length}}`;
  return typeof value;
}

function formatValuePreview(value: any, maxLength: number = 200): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length <= 3) {
      return `[${value.map(v => JSON.stringify(v)).join(', ')}]`;
    }
    return `[${value.slice(0, 3).map(v => JSON.stringify(v)).join(', ')}, ... +${value.length - 3} more]`;
  }
  
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    if (keys.length <= 3) {
      return keys.map(k => `${k}: ${JSON.stringify(value[k])}`).join('\n');
    }
    return keys.slice(0, 3).map(k => `${k}: ${JSON.stringify(value[k])}`).join('\n') + `\n... +${keys.length - 3} more`;
  }
  
  const str = String(value);
  if (str.length > maxLength) {
    return str.substring(0, maxLength) + '...';
  }
  return str;
}

function formatValueForMarkdown(value: string): string {
  if (value.length > 100) {
    return `\`${value.substring(0, 100)}...\``;
  }
  return `\`${value}\``;
}

function inferValueType(value: string): { type: string; hint?: string } {
  // @Boolean
  if (/^(yes|no|true|false)$/.test(value)) {
    return { type: 'boolean', hint: value === 'yes' || value === 'true' ? 'truthy' : 'falsy' };
  }
  
  // @Null
  if (/^(null|none|-)$/.test(value)) {
    return { type: 'null' };
  }
  
  // @Number
  if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) {
    const num = parseFloat(value);
    return { type: 'number', hint: Number.isInteger(num) ? 'integer' : 'float' };
  }
  
  // @Array
  if (value.startsWith('[') && value.endsWith(']')) {
    return { type: 'array' };
  }
  
  // @Inline object
  if (value.startsWith('{') && value.endsWith('}')) {
    return { type: 'object', hint: 'inline' };
  }
  
  // @Reference
  if (value.startsWith('$')) {
    return { type: 'reference' };
  }
  
  // @Type hints
  if (value.startsWith('@time')) {
    return { type: 'time', hint: 'timestamp value' };
  }
  if (value.startsWith('@embedding')) {
    return { type: 'embedding', hint: 'vector embedding' };
  }
  if (value.match(/@f\[\d+\]/)) {
    return { type: 'fixed-array', hint: 'fixed-length array' };
  }
  
  // @Quoted string
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return { type: 'string', hint: 'quoted' };
  }
  
  // @Default to unquoted string
  return { type: 'string', hint: 'unquoted' };
}
