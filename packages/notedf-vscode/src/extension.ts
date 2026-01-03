import * as vscode from 'vscode';
import { NoteDataFormat } from 'notedf';
import { createFormatterProvider } from './providers/formatter';
import { createHoverProvider } from './providers/hover';
import { createSymbolProvider } from './providers/symbols';
import { createCompletionProvider } from './providers/completion';
import { createDefinitionProvider } from './providers/definition';
import { createRenameProvider } from './providers/rename';
import { createFoldingRangeProvider } from './providers/folding';
import { DiagnosticsManager } from './providers/diagnostics';
import { registerCommands } from './commands';

const LANGUAGE_ID = 'notedf';

let diagnosticsManager: DiagnosticsManager;

export function activate(context: vscode.ExtensionContext) {
  const parser = new NoteDataFormat();
  
  diagnosticsManager = new DiagnosticsManager(parser);
  context.subscriptions.push(diagnosticsManager.collection);

  const formatter = vscode.languages.registerDocumentFormattingEditProvider(
    LANGUAGE_ID,
    createFormatterProvider(parser)
  );

  const hoverProvider = vscode.languages.registerHoverProvider(
    LANGUAGE_ID,
    createHoverProvider(parser)
  );

  const symbolProvider = vscode.languages.registerDocumentSymbolProvider(
    LANGUAGE_ID,
    createSymbolProvider(parser)
  );

  const completionProvider = vscode.languages.registerCompletionItemProvider(
    LANGUAGE_ID,
    createCompletionProvider(parser),
    '$', ':', ' '
  );

  const definitionProvider = vscode.languages.registerDefinitionProvider(
    LANGUAGE_ID,
    createDefinitionProvider()
  );

  const renameProvider = vscode.languages.registerRenameProvider(
    LANGUAGE_ID,
    createRenameProvider()
  );

  const foldingProvider = vscode.languages.registerFoldingRangeProvider(
    LANGUAGE_ID,
    createFoldingRangeProvider()
  );

  const changeListener = vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document.languageId === LANGUAGE_ID) {
      diagnosticsManager.validate(e.document);
    }
  });

  const openListener = vscode.workspace.onDidOpenTextDocument((document) => {
    if (document.languageId === LANGUAGE_ID) {
      diagnosticsManager.validate(document);
    }
  });

  const closeListener = vscode.workspace.onDidCloseTextDocument((document) => {
    if (document.languageId === LANGUAGE_ID) {
      diagnosticsManager.clear(document.uri);
    }
  });

  diagnosticsManager.validateAllOpen();

  registerCommands(context, parser, diagnosticsManager);

  context.subscriptions.push(
    formatter,
    hoverProvider,
    symbolProvider,
    completionProvider,
    definitionProvider,
    renameProvider,
    foldingProvider,
    changeListener,
    openListener,
    closeListener
  );
}

export function deactivate() {
  if (diagnosticsManager) {
    diagnosticsManager.dispose();
  }
}
