import * as vscode from 'vscode';
import { NoteDataFormat } from '@dysporium/notedf';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  console.log('Note Data Format extension is now active!');
  
  diagnosticCollection = vscode.languages.createDiagnosticCollection('notedf');
  context.subscriptions.push(diagnosticCollection);

  const parser = new NoteDataFormat();

  // Register document formatter
  const formatter = vscode.languages.registerDocumentFormattingEditProvider('notedf', {
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
      try {
        const text = document.getText();
        const parsed = parser.parse(text);
        const formatted = parser.dumps(parsed);
        
        const range = new vscode.Range(
          document.positionAt(0),
          document.positionAt(text.length)
        );
        
        return [vscode.TextEdit.replace(range, formatted)];
      } catch (error) {
        vscode.window.showErrorMessage(`Formatting failed: ${error}`);
        return [];
      }
    }
  });

  // Register hover provider
  const hoverProvider = vscode.languages.registerHoverProvider('notedf', {
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
  });

  // Register document symbol provider (for outline view)
  const symbolProvider = vscode.languages.registerDocumentSymbolProvider('notedf', {
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
  });

  // Register validation diagnostics
  const validateDocument = (document: vscode.TextDocument) => {
    if (document.languageId !== 'notedf') {
      return;
    }

    const config = vscode.workspace.getConfiguration('notedf');
    if (!config.get<boolean>('validate.enable', true)) {
      diagnosticCollection.clear();
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    
    try {
      const text = document.getText();
      parser.parse(text);
      // If parsing succeeds, clear diagnostics
      diagnosticCollection.set(document.uri, []);
    } catch (error: any) {
      // Try to extract line number from error
      const errorMessage = error.message || String(error);
      const lineMatch = errorMessage.match(/line (\d+)/i);
      
      if (lineMatch) {
        const lineNum = parseInt(lineMatch[1]) - 1;
        const line = document.lineAt(Math.max(0, Math.min(lineNum, document.lineCount - 1)));
        
        const diagnostic = new vscode.Diagnostic(
          line.range,
          errorMessage,
          vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
      } else {
        // Generic error at first line
        const firstLine = document.lineAt(0);
        const diagnostic = new vscode.Diagnostic(
          firstLine.range,
          `Parse error: ${errorMessage}`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
      }
      
      diagnosticCollection.set(document.uri, diagnostics);
    }
  };

  // Validate on document change
  const changeListener = vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document.languageId === 'notedf') {
      validateDocument(e.document);
    }
  });

  // Validate on document open
  vscode.workspace.textDocuments.forEach((doc) => {
    if (doc.languageId === 'notedf') {
      validateDocument(doc);
    }
  });

  // Register commands
  const formatCommand = vscode.commands.registerCommand('notedf.format', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'notedf') {
      vscode.commands.executeCommand('editor.action.formatDocument');
    }
  });

  const validateCommand = vscode.commands.registerCommand('notedf.validate', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'notedf') {
      validateDocument(editor.document);
      const diagnostics = diagnosticCollection.get(editor.document.uri);
      if (diagnostics && diagnostics.length > 0) {
        vscode.window.showErrorMessage(`Found ${diagnostics.length} error(s)`);
      } else {
        vscode.window.showInformationMessage('NDF file is valid');
      }
    }
  });

  const toJsonCommand = vscode.commands.registerCommand('notedf.toJson', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'notedf') {
      try {
        const text = editor.document.getText();
        const parsed = parser.parse(text);
        const json = JSON.stringify(parsed, null, 2);
        
        const doc = await vscode.workspace.openTextDocument({
          content: json,
          language: 'json'
        });
        await vscode.window.showTextDocument(doc);
      } catch (error: any) {
        vscode.window.showErrorMessage(`Conversion failed: ${error.message}`);
      }
    }
  });

  context.subscriptions.push(
    formatter,
    hoverProvider,
    symbolProvider,
    changeListener,
    formatCommand,
    validateCommand,
    toJsonCommand
  );
}

export function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
  }
}

// Helper functions
function getNestedValue(obj: any, key: string, lineText: string): any {
  // Simple extraction - try to get value from the line
  const match = lineText.match(/:\s*(.+)$/);
  if (match) {
    return match[1].trim();
  }
  return obj[key];
}

function formatValueForHover(value: any): string {
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

function findKeyRange(document: vscode.TextDocument, key: string, indent: number): vscode.Range | null {
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
