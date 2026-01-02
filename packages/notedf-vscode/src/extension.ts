import * as vscode from 'vscode';
import { NoteDataFormat } from '@dysporium/notedf';
import { createFormatterProvider } from './providers/formatter';
import { createHoverProvider } from './providers/hover';
import { createSymbolProvider } from './providers/symbols';
import { DiagnosticsManager } from './providers/diagnostics';
import { registerCommands } from './commands';

let diagnosticsManager: DiagnosticsManager;

export function activate(context: vscode.ExtensionContext) {
  
  const parser = new NoteDataFormat();
  
  diagnosticsManager = new DiagnosticsManager(parser);
  context.subscriptions.push(diagnosticsManager.collection);

  const formatter = vscode.languages.registerDocumentFormattingEditProvider(
    'notedf',
    createFormatterProvider(parser)
  );

  const hoverProvider = vscode.languages.registerHoverProvider(
    'notedf',
    createHoverProvider(parser)
  );

  const symbolProvider = vscode.languages.registerDocumentSymbolProvider(
    'notedf',
    createSymbolProvider(parser)
  );

  const changeListener = vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document.languageId === 'notedf') {
      diagnosticsManager.validate(e.document);
    }
  });

  diagnosticsManager.validateAllOpen();

  registerCommands(context, parser, diagnosticsManager);

  context.subscriptions.push(
    formatter,
    hoverProvider,
    symbolProvider,
    changeListener
  );
}

export function deactivate() {
  if (diagnosticsManager) {
    diagnosticsManager.dispose();
  }
}
