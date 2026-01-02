import * as vscode from 'vscode';
import { NoteDataFormat } from '@dysporium/notedf';

export class DiagnosticsManager {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private parser: NoteDataFormat;

  constructor(parser: NoteDataFormat) {
    this.parser = parser;
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('notedf');
  }

  get collection(): vscode.DiagnosticCollection {
    return this.diagnosticCollection;
  }

  validate(document: vscode.TextDocument): void {
    if (document.languageId !== 'notedf') {
      return;
    }

    const config = vscode.workspace.getConfiguration('notedf');
    if (!config.get<boolean>('validate.enable', true)) {
      this.diagnosticCollection.clear();
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    
    try {
      const text = document.getText();
      this.parser.parse(text);
      this.diagnosticCollection.set(document.uri, []);
    } catch (error: any) {
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
        const firstLine = document.lineAt(0);
        const diagnostic = new vscode.Diagnostic(
          firstLine.range,
          `Parse error: ${errorMessage}`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
      }
      
      this.diagnosticCollection.set(document.uri, diagnostics);
    }
  }

  validateAllOpen(): void {
    vscode.workspace.textDocuments.forEach((doc) => {
      if (doc.languageId === 'notedf') {
        this.validate(doc);
      }
    });
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
  }
}

