import * as vscode from 'vscode';
import { NoteDataFormat } from '@dysporium/notedf';

export function createCompletionProvider(parser: NoteDataFormat): vscode.CompletionItemProvider {
  return {
    provideCompletionItems(
      document: vscode.TextDocument,
      position: vscode.Position,
      token: vscode.CancellationToken,
      context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
      const items: vscode.CompletionItem[] = [];
      const line = document.lineAt(position.line);
      const linePrefix = line.text.substring(0, position.character);

      if (linePrefix.endsWith('$') || linePrefix.match(/\$[a-zA-Z_]*$/)) {
        const references = extractReferences(document);
        for (const ref of references) {
          const item = new vscode.CompletionItem(ref, vscode.CompletionItemKind.Variable);
          item.detail = 'Reference';
          item.insertText = ref.substring(1); // Remove $ since user already typed it
          items.push(item);
        }
      }

      if (linePrefix.match(/:\s*$/)) {
        items.push(...getValueCompletions());
      }

      if (linePrefix.match(/^\s*$/) || linePrefix.match(/^\s+$/)) {
        items.push(...getSnippetCompletions());
      }

      if (linePrefix.match(/^\s*[a-zA-Z_]*$/) && !linePrefix.includes(':')) {
        const existingKeys = extractKeys(document);
        const commonKeys = ['name', 'description', 'version', 'author', 'date', 'tags', 'config', 'settings', 'data', 'items', 'enabled', 'type', 'value', 'id', 'title', 'content'];
        
        for (const key of commonKeys) {
          if (!existingKeys.has(key)) {
            const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
            item.insertText = new vscode.SnippetString(`${key}: $0`);
            item.detail = 'Common key';
            items.push(item);
          }
        }
      }

      return items;
    }
  };
}

function extractReferences(document: vscode.TextDocument): string[] {
  const references: string[] = [];
  const refPattern = /^\s*(\$[a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm;
  const text = document.getText();
  let match;

  while ((match = refPattern.exec(text)) !== null) {
    if (!references.includes(match[1])) {
      references.push(match[1]);
    }
  }

  return references;
}

function extractKeys(document: vscode.TextDocument): Set<string> {
  const keys = new Set<string>();
  const keyPattern = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm;
  const text = document.getText();
  let match;

  while ((match = keyPattern.exec(text)) !== null) {
    keys.add(match[1]);
  }

  return keys;
}

function getValueCompletions(): vscode.CompletionItem[] {
  const items: vscode.CompletionItem[] = [];

  // ===Boolean values===
  const trueItem = new vscode.CompletionItem('yes', vscode.CompletionItemKind.Value);
  trueItem.detail = 'Boolean true';
  items.push(trueItem);

  const falseItem = new vscode.CompletionItem('no', vscode.CompletionItemKind.Value);
  falseItem.detail = 'Boolean false';
  items.push(falseItem);

  // ===Null values===
  const nullItem = new vscode.CompletionItem('null', vscode.CompletionItemKind.Value);
  nullItem.detail = 'Null value';
  items.push(nullItem);

  // ===Array===
  const arrayItem = new vscode.CompletionItem('[]', vscode.CompletionItemKind.Value);
  arrayItem.insertText = new vscode.SnippetString('[$0]');
  arrayItem.detail = 'Empty array';
  items.push(arrayItem);

  // ===Inline object===
  const objectItem = new vscode.CompletionItem('{}', vscode.CompletionItemKind.Value);
  objectItem.insertText = new vscode.SnippetString('{$0}');
  objectItem.detail = 'Inline object';
  items.push(objectItem);

  // ===Multiline string====
  const multilineItem = new vscode.CompletionItem('|', vscode.CompletionItemKind.Value);
  multilineItem.insertText = new vscode.SnippetString('|\n  $0');
  multilineItem.detail = 'Multiline string';
  items.push(multilineItem);

  // ===Type hints===
  const timeItem = new vscode.CompletionItem('@time', vscode.CompletionItemKind.TypeParameter);
  timeItem.detail = 'Time type hint';
  items.push(timeItem);

  const embeddingItem = new vscode.CompletionItem('@embedding', vscode.CompletionItemKind.TypeParameter);
  embeddingItem.detail = 'Embedding type hint';
  items.push(embeddingItem);

  return items;
}

function getSnippetCompletions(): vscode.CompletionItem[] {
  const items: vscode.CompletionItem[] = [];

  // ===Key-value pair===
  const kvItem = new vscode.CompletionItem('key-value', vscode.CompletionItemKind.Snippet);
  kvItem.insertText = new vscode.SnippetString('${1:key}: ${2:value}');
  kvItem.detail = 'Key-value pair';
  kvItem.documentation = 'Insert a simple key-value pair';
  items.push(kvItem);

  // ===Nested object===
  const nestedItem = new vscode.CompletionItem('nested-object', vscode.CompletionItemKind.Snippet);
  nestedItem.insertText = new vscode.SnippetString('${1:parent}:\n  ${2:child}: ${3:value}');
  nestedItem.detail = 'Nested object';
  nestedItem.documentation = 'Insert a nested object structure';
  items.push(nestedItem);

  // ===Array with items===
  const arrayItem = new vscode.CompletionItem('array-items', vscode.CompletionItemKind.Snippet);
  arrayItem.insertText = new vscode.SnippetString('${1:items}:\n  - ${2:item1}\n  - ${3:item2}');
  arrayItem.detail = 'Array with items';
  arrayItem.documentation = 'Insert an array with list items';
  items.push(arrayItem);

  // ===Reference definition===
  const refDefItem = new vscode.CompletionItem('reference-def', vscode.CompletionItemKind.Snippet);
  refDefItem.insertText = new vscode.SnippetString('\\$${1:refName}: ${2:value}');
  refDefItem.detail = 'Reference definition';
  refDefItem.documentation = 'Define a reusable reference';
  items.push(refDefItem);

  // ===Reference usage===
  const refUseItem = new vscode.CompletionItem('reference-use', vscode.CompletionItemKind.Snippet);
  refUseItem.insertText = new vscode.SnippetString('${1:key}: \\$${2:refName}');
  refUseItem.detail = 'Use reference';
  refUseItem.documentation = 'Use a defined reference';
  items.push(refUseItem);

  // ===Multiline string===
  const multiItem = new vscode.CompletionItem('multiline-string', vscode.CompletionItemKind.Snippet);
  multiItem.insertText = new vscode.SnippetString('${1:key}: |\n  ${2:line1}\n  ${3:line2}');
  multiItem.detail = 'Multiline string';
  multiItem.documentation = 'Insert a multiline string block';
  items.push(multiItem);

  // ===Config block===
  const configItem = new vscode.CompletionItem('config-block', vscode.CompletionItemKind.Snippet);
  configItem.insertText = new vscode.SnippetString('config:\n  name: ${1:value}\n  version: ${2:1.0.0}\n  enabled: ${3|yes,no|}');
  configItem.detail = 'Configuration block';
  configItem.documentation = 'Insert a common config structure';
  items.push(configItem);

  return items;
}

