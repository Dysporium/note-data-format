import * as vscode from 'vscode';
import { NoteDataFormat } from 'notedf';
import { debounce } from '../utils/debounce';

export class DiagnosticsManager {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private parser: NoteDataFormat;
  private debouncedValidate: ((document: vscode.TextDocument) => void) & { cancel: () => void };

  constructor(parser: NoteDataFormat) {
    this.parser = parser;
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('notedf');
    
    this.debouncedValidate = debounce((document: vscode.TextDocument) => {
      this.validateImmediate(document);
    }, 300);
  }

  get collection(): vscode.DiagnosticCollection {
    return this.diagnosticCollection;
  }

  validate(document: vscode.TextDocument): void {
    if (document.languageId !== 'notedf') {
      return;
    }
    this.debouncedValidate(document);
  }

  validateImmediate(document: vscode.TextDocument): void {
    if (document.languageId !== 'notedf') {
      return;
    }

    const config = vscode.workspace.getConfiguration('notedf');
    if (!config.get<boolean>('validate.enable', true)) {
      this.diagnosticCollection.delete(document.uri);
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    
    try {
      const text = document.getText();
      this.parser.parse(text);
      
      diagnostics.push(...this.lintDocument(document));
      
      this.diagnosticCollection.set(document.uri, diagnostics);
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
        diagnostic.source = 'notedf';
        diagnostics.push(diagnostic);
      } else {
        const firstLine = document.lineAt(0);
        const diagnostic = new vscode.Diagnostic(
          firstLine.range,
          `Parse error: ${errorMessage}`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.source = 'notedf';
        diagnostics.push(diagnostic);
      }
      
      this.diagnosticCollection.set(document.uri, diagnostics);
    }
  }

  private lintDocument(document: vscode.TextDocument): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    const definedRefs = new Set<string>();
    const usedRefs: { name: string; line: number; range: vscode.Range }[] = [];

    const refDefPattern = /^\s*(\$[a-zA-Z_][a-zA-Z0-9_]*)\s*:/;
    const refUsePattern = /\$[a-zA-Z_][a-zA-Z0-9_]*/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const defMatch = line.match(refDefPattern);
      if (defMatch) {
        definedRefs.add(defMatch[1]);
      }

      let useMatch;
      while ((useMatch = refUsePattern.exec(line)) !== null) {
        const refName = useMatch[0];
        const startChar = useMatch.index;
        
        if (line.substring(0, startChar).match(/^\s*$/) && 
            line.substring(startChar + refName.length).match(/^\s*:/)) {
          continue;
        }

        usedRefs.push({
          name: refName,
          line: i,
          range: new vscode.Range(
            new vscode.Position(i, startChar),
            new vscode.Position(i, startChar + refName.length)
          )
        });
      }

      if (line.endsWith(' ') || line.endsWith('\t')) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(
            new vscode.Position(i, line.trimEnd().length),
            new vscode.Position(i, line.length)
          ),
          'Trailing whitespace',
          vscode.DiagnosticSeverity.Hint
        );
        diagnostic.source = 'notedf';
        diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
        diagnostics.push(diagnostic);
      }

      if (line.match(/^\t+ +/) || line.match(/^ +\t+/)) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.search(/\S/))),
          'Mixed tabs and spaces in indentation',
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = 'notedf';
        diagnostics.push(diagnostic);
      }
    }

    for (const usage of usedRefs) {
      if (!definedRefs.has(usage.name)) {
        const diagnostic = new vscode.Diagnostic(
          usage.range,
          `Undefined reference: ${usage.name}`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = 'notedf';
        diagnostics.push(diagnostic);
      }
    }

    for (const ref of definedRefs) {
      const isUsed = usedRefs.some(u => u.name === ref);
      if (!isUsed) {
        for (let i = 0; i < lines.length; i++) {
          const defMatch = lines[i].match(refDefPattern);
          if (defMatch && defMatch[1] === ref) {
            const startChar = lines[i].indexOf(ref);
            const diagnostic = new vscode.Diagnostic(
              new vscode.Range(
                new vscode.Position(i, startChar),
                new vscode.Position(i, startChar + ref.length)
              ),
              `Unused reference: ${ref}`,
              vscode.DiagnosticSeverity.Hint
            );
            diagnostic.source = 'notedf';
            diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
            diagnostics.push(diagnostic);
            break;
          }
        }
      }
    }

    return diagnostics;
  }

  validateAllOpen(): void {
    vscode.workspace.textDocuments.forEach((doc) => {
      if (doc.languageId === 'notedf') {
        this.validateImmediate(doc);
      }
    });
  }

  clear(uri: vscode.Uri): void {
    this.diagnosticCollection.delete(uri);
    this.debouncedValidate.cancel();
  }

  dispose(): void {
    this.debouncedValidate.cancel();
    this.diagnosticCollection.dispose();
  }
}
