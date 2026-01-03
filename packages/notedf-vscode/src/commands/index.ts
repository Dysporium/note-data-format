import * as vscode from 'vscode';
import { NoteDataFormat } from 'notedf';
import { DiagnosticsManager } from '../providers/diagnostics';

export function registerCommands(
  context: vscode.ExtensionContext,
  parser: NoteDataFormat,
  diagnosticsManager: DiagnosticsManager
): void {
  const formatCommand = vscode.commands.registerCommand('notedf.format', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'notedf') {
      vscode.commands.executeCommand('editor.action.formatDocument');
    }
  });

  const validateCommand = vscode.commands.registerCommand('notedf.validate', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'notedf') {
      diagnosticsManager.validate(editor.document);
      const diagnostics = diagnosticsManager.collection.get(editor.document.uri);
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

  const fromJsonCommand = vscode.commands.registerCommand('notedf.fromJson', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'json') {
      try {
        const text = editor.document.getText();
        const parsed = JSON.parse(text);
        const ndf = parser.dumps(parsed);
        
        const doc = await vscode.workspace.openTextDocument({
          content: ndf,
          language: 'notedf'
        });
        await vscode.window.showTextDocument(doc);
      } catch (error: any) {
        vscode.window.showErrorMessage(`Conversion failed: ${error.message}`);
      }
    } else {
      vscode.window.showWarningMessage('Please open a JSON file to convert to NDF');
    }
  });

  context.subscriptions.push(formatCommand, validateCommand, toJsonCommand, fromJsonCommand);
}
