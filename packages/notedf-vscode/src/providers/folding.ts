import * as vscode from 'vscode';

export function createFoldingRangeProvider(): vscode.FoldingRangeProvider {
  return {
    provideFoldingRanges(
      document: vscode.TextDocument,
      context: vscode.FoldingContext,
      token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FoldingRange[]> {
      const ranges: vscode.FoldingRange[] = [];
      const lines = document.getText().split('\n');
      
      const stack: { line: number; indent: number }[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim() === '' || line.trim().startsWith('#')) {
          continue;
        }

        const currentIndent = getIndentLevel(line);
        
        while (stack.length > 0 && stack[stack.length - 1].indent >= currentIndent) {
          const popped = stack.pop()!;
          if (i - 1 > popped.line) {
            ranges.push(new vscode.FoldingRange(
              popped.line,
              i - 1,
              vscode.FoldingRangeKind.Region
            ));
          }
        }

        if (isBlockStart(line)) {
          stack.push({ line: i, indent: currentIndent });
        }

        if (line.match(/:\s*\|\s*$/)) {
          const multilineEnd = findMultilineEnd(lines, i);
          if (multilineEnd > i) {
            ranges.push(new vscode.FoldingRange(
              i,
              multilineEnd,
              vscode.FoldingRangeKind.Region
            ));
            i = multilineEnd;
          }
        }

        if (line.match(/:\s*$/)) {
          const arrayEnd = findArrayEnd(lines, i, currentIndent);
          if (arrayEnd > i) {
            ranges.push(new vscode.FoldingRange(
              i,
              arrayEnd,
              vscode.FoldingRangeKind.Region
            ));
          }
        }
      }

      while (stack.length > 0) {
        const popped = stack.pop()!;
        if (lines.length - 1 > popped.line) {
          ranges.push(new vscode.FoldingRange(
            popped.line,
            lines.length - 1,
            vscode.FoldingRangeKind.Region
          ));
        }
      }

      ranges.push(...findCommentBlocks(lines));

      return ranges;
    }
  };
}

function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function isBlockStart(line: string): boolean {
  // Line ends with just a colon (nested object start)
  // or has a value that suggests children
  return line.match(/:\s*$/) !== null;
}

function findMultilineEnd(lines: string[], startLine: number): number {
  const baseIndent = getIndentLevel(lines[startLine]);
  
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim() === '') {
      continue;
    }
    
    const currentIndent = getIndentLevel(line);
    
    if (currentIndent <= baseIndent) {
      return i - 1;
    }
  }
  
  return lines.length - 1;
}

function findArrayEnd(lines: string[], startLine: number, baseIndent: number): number {
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue;
    }
    
    const currentIndent = getIndentLevel(line);
    
    if (currentIndent <= baseIndent) {
      return i - 1;
    }
  }
  
  return lines.length - 1;
}

function findCommentBlocks(lines: string[]): vscode.FoldingRange[] {
  const ranges: vscode.FoldingRange[] = [];
  let blockStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const isComment = lines[i].trim().startsWith('#');
    
    if (isComment && blockStart === -1) {
      blockStart = i;
    } else if (!isComment && blockStart !== -1) {
      if (i - 1 > blockStart) {
        ranges.push(new vscode.FoldingRange(
          blockStart,
          i - 1,
          vscode.FoldingRangeKind.Comment
        ));
      }
      blockStart = -1;
    }
  }

  if (blockStart !== -1 && lines.length - 1 > blockStart) {
    ranges.push(new vscode.FoldingRange(
      blockStart,
      lines.length - 1,
      vscode.FoldingRangeKind.Comment
    ));
  }

  return ranges;
}

