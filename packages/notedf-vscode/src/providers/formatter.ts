import * as vscode from 'vscode';
import { NoteDataFormat } from 'notedf';

export function createFormatterProvider(parser: NoteDataFormat): vscode.DocumentFormattingEditProvider {
  return {
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
  };
}

