import { SourcePosition } from './types';

export class NDFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NDFError';
    Object.setPrototypeOf(this, NDFError.prototype);
  }
}

export class ParseError extends NDFError {
  public readonly line: number;
  public readonly column: number;
  public readonly offset: number;
  public readonly source?: string;
  public readonly code: string;

  constructor(
    message: string,
    position: SourcePosition,
    code: string = 'PARSE_ERROR',
    source?: string
  ) {
    const locationInfo = `line ${position.line}, column ${position.column}`;
    super(`${message} at ${locationInfo}`);
    
    this.name = 'ParseError';
    this.line = position.line;
    this.column = position.column;
    this.offset = position.offset;
    this.code = code;
    this.source = source;
    
    Object.setPrototypeOf(this, ParseError.prototype);
  }

  format(sourceLines?: string[]): string {
    let result = `${this.code}: ${this.message}\n`;
    
    if (sourceLines && this.line > 0 && this.line <= sourceLines.length) {
      const lineContent = sourceLines[this.line - 1];
      const lineNum = String(this.line).padStart(4, ' ');
      
      result += `\n${lineNum} | ${lineContent}\n`;
      result += `     | ${' '.repeat(Math.max(0, this.column - 1))}^\n`;
    }
    
    return result;
  }
}

export class ReferenceError extends NDFError {
  public readonly referenceName: string;
  public readonly line: number;
  public readonly column: number;
  public readonly code: string;

  constructor(
    referenceName: string,
    message: string,
    position: SourcePosition,
    code: string = 'REFERENCE_ERROR'
  ) {
    super(`${message}: $${referenceName} at line ${position.line}, column ${position.column}`);
    
    this.name = 'ReferenceError';
    this.referenceName = referenceName;
    this.line = position.line;
    this.column = position.column;
    this.code = code;
    
    Object.setPrototypeOf(this, ReferenceError.prototype);
  }
}

export class ValidationError extends NDFError {
  public readonly errors: Array<{
    message: string;
    line: number;
    column: number;
    code: string;
  }>;

  constructor(errors: Array<{ message: string; line: number; column: number; code: string }>) {
    const summary = errors.length === 1
      ? errors[0].message
      : `${errors.length} validation errors found`;
    
    super(summary);
    this.name = 'ValidationError';
    this.errors = errors;
    
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  format(sourceLines?: string[]): string {
    return this.errors.map(err => {
      let result = `${err.code}: ${err.message} at line ${err.line}, column ${err.column}`;
      
      if (sourceLines && err.line > 0 && err.line <= sourceLines.length) {
        const lineContent = sourceLines[err.line - 1];
        result += `\n  ${err.line} | ${lineContent}`;
        result += `\n    | ${' '.repeat(Math.max(0, err.column - 1))}^`;
      }
      
      return result;
    }).join('\n\n');
  }
}

export const ErrorCodes = {
  UNEXPECTED_EOF: 'E001',
  INVALID_SYNTAX: 'E002',
  INVALID_KEY: 'E003',
  INVALID_VALUE: 'E004',
  INVALID_INDENT: 'E005',
  UNCLOSED_STRING: 'E006',
  UNCLOSED_BRACKET: 'E007',
  UNCLOSED_BRACE: 'E008',
  UNDEFINED_REFERENCE: 'E101',
  CIRCULAR_REFERENCE: 'E102',
  INVALID_REFERENCE_NAME: 'E103',
  TRAILING_WHITESPACE: 'W001',
  MIXED_INDENTATION: 'W002',
  UNUSED_REFERENCE: 'W003',
  DUPLICATE_KEY: 'W004',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

