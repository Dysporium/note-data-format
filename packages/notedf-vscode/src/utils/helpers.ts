import * as vscode from 'vscode';

export function getNestedValue(obj: any, key: string, lineText: string): any {
  const match = lineText.match(/:\s*(.+)$/);
  if (match) {
    return match[1].trim();
  }
  return obj[key];
}

export function formatValueForHover(value: any): string {
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    return `{${Object.keys(value).length} keys}`;
  }
  return String(value);
}

export function findKeyRange(document: vscode.TextDocument, key: string, indent: number): vscode.Range | null {
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const lineIndent = line.text.length - line.text.trimStart().length;
    
    if (lineIndent === indent * 2) {
      const match = line.text.match(new RegExp(`^\\s*${key}\\s*:`));
      if (match) {
        const start = line.text.indexOf(key);
        const end = start + key.length;
        return new vscode.Range(
          new vscode.Position(i, start),
          new vscode.Position(i, end)
        );
      }
    }
  }
  return null;
}

