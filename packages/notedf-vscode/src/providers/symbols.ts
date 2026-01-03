import * as vscode from 'vscode';
import { NoteDataFormat } from 'notedf';
import { findKeyRange } from '../utils/helpers';

export function createSymbolProvider(parser: NoteDataFormat): vscode.DocumentSymbolProvider {
  return {
    provideDocumentSymbols(document: vscode.TextDocument): vscode.ProviderResult<vscode.DocumentSymbol[]> {
      const symbols: vscode.DocumentSymbol[] = [];
      
      try {
        const text = document.getText();
        const parsed = parser.parse(text);
        
        function addSymbols(obj: any, prefix: string = '', indent: number = 0): void {
          for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const range = findKeyRange(document, key, indent);
            
            if (range) {
              const symbol = new vscode.DocumentSymbol(
                key,
                typeof value === 'object' && value !== null && !Array.isArray(value)
                  ? 'Object'
                  : Array.isArray(value)
                  ? 'Array'
                  : typeof value,
                vscode.SymbolKind.Field,
                range,
                range
              );
              
              symbols.push(symbol);
              
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                addSymbols(value, fullKey, indent + 1);
              }
            }
          }
        }
        
        addSymbols(parsed);
      } catch (error) {
        // Silently fail on symbol errors
      }
      
      return symbols;
    }
  };
}

