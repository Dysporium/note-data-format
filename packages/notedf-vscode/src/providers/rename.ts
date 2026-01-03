import * as vscode from 'vscode';
import { findReferenceDefinition, findAllReferenceUsages } from './definition';

export function createRenameProvider(): vscode.RenameProvider {
  return {
    prepareRename(
      document: vscode.TextDocument,
      position: vscode.Position,
      token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Range | { range: vscode.Range; placeholder: string }> {
      const wordRange = document.getWordRangeAtPosition(position, /\$[a-zA-Z_][a-zA-Z0-9_]*/);
      
      if (!wordRange) {
        throw new Error('Cannot rename this element. Place cursor on a $reference.');
      }

      const word = document.getText(wordRange);
      
      if (!word.startsWith('$')) {
        throw new Error('Cannot rename this element. Only $references can be renamed.');
      }

      const definition = findReferenceDefinition(document, word);
      if (!definition) {
        throw new Error(`Reference ${word} is not defined in this document.`);
      }

      return {
        range: wordRange,
        placeholder: word
      };
    },

    provideRenameEdits(
      document: vscode.TextDocument,
      position: vscode.Position,
      newName: string,
      token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.WorkspaceEdit> {
      const wordRange = document.getWordRangeAtPosition(position, /\$[a-zA-Z_][a-zA-Z0-9_]*/);
      
      if (!wordRange) {
        return null;
      }

      const oldName = document.getText(wordRange);
      
      // ===Ensure new name starts with $===
      if (!newName.startsWith('$')) {
        newName = '$' + newName;
      }

      // ===Validate new name format===
      if (!newName.match(/^\$[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        throw new Error('Invalid reference name. Must match pattern: $name (letters, numbers, underscores)');
      }

      const edit = new vscode.WorkspaceEdit();
      
      const usages = findAllReferenceUsages(document, oldName);
      
      for (const usage of usages) {
        edit.replace(document.uri, usage.range, newName);
      }

      return edit;
    }
  };
}

