import * as vscode from 'vscode';

export function createDefinitionProvider(): vscode.DefinitionProvider {
  return {
    provideDefinition(
      document: vscode.TextDocument,
      position: vscode.Position,
      token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
      const wordRange = document.getWordRangeAtPosition(position, /\$[a-zA-Z_][a-zA-Z0-9_]*/);
      
      if (!wordRange) {
        return null;
      }

      const word = document.getText(wordRange);
      
      if (!word.startsWith('$')) {
        return null;
      }

      const definitionLocation = findReferenceDefinition(document, word);
      
      return definitionLocation;
    }
  };
}

export function findReferenceDefinition(document: vscode.TextDocument, refName: string): vscode.Location | null {
  const text = document.getText();
  const lines = text.split('\n');
  
  const defPattern = new RegExp(`^\\s*(\\${refName})\\s*:`);

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(defPattern);
    if (match) {
      const startChar = lines[i].indexOf(match[1]);
      const endChar = startChar + match[1].length;
      
      return new vscode.Location(
        document.uri,
        new vscode.Range(
          new vscode.Position(i, startChar),
          new vscode.Position(i, endChar)
        )
      );
    }
  }

  return null;
}

export function findAllReferenceUsages(document: vscode.TextDocument, refName: string): vscode.Location[] {
  const locations: vscode.Location[] = [];
  const text = document.getText();
  const lines = text.split('\n');
  
  // ===Escape $ for regex===
  const escapedRef = refName.replace('$', '\\$');
  const usagePattern = new RegExp(escapedRef + '(?:\\s*\\{[^}]*\\})?', 'g');

  for (let i = 0; i < lines.length; i++) {
    let match;
    while ((match = usagePattern.exec(lines[i])) !== null) {
      locations.push(new vscode.Location(
        document.uri,
        new vscode.Range(
          new vscode.Position(i, match.index),
          new vscode.Position(i, match.index + refName.length)
        )
      ));
    }
  }

  return locations;
}

