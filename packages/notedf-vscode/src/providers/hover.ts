import * as vscode from 'vscode';
import { NoteDataFormat } from '@dysporium/notedf';
import { getNestedValue, formatValueForHover } from '../utils/helpers';

export function createHoverProvider(parser: NoteDataFormat): vscode.HoverProvider {
  return {
    provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
      try {
        const text = document.getText();
        const parsed = parser.parse(text);
        
        const line = document.lineAt(position.line);
        const match = line.text.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
        
        if (match) {
          const key = match[2];
          const value = getNestedValue(parsed, key, line.text);
          
          if (value !== undefined) {
            const valueStr = formatValueForHover(value);
            return new vscode.Hover({
              language: 'notedf',
              value: `**${key}**: ${valueStr}`
            });
          }
        }
      } catch (error) {
        // Silently fail on hover errors
      }
      return null;
    }
  };
}

