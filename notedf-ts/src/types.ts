export type NDFPrimitive = string | number | boolean | null;

export type NDFValue = NDFPrimitive | NDFObject | NDFArray;

export type NDFObject = { [key: string]: NDFValue };

export type NDFArray = NDFValue[];

export type ReferenceStore = Map<string, NDFValue>;

export interface SourcePosition {
  line: number;
  column: number;
  offset: number;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

export interface ParsedNode<T = NDFValue> {
  value: T;
  range: SourceRange;
  key?: string;
}

export interface ParseOptions {
  strict?: boolean;
  resolveReferences?: boolean;
  allowUndefinedReferences?: boolean;
  preserveReferences?: boolean;
  referenceResolver?: (name: string, store: ReferenceStore) => NDFValue | undefined;
}

export interface DumpOptions {
  indent?: string;
  indentLevel?: number;
  inlineThreshold?: number;
  sortKeys?: boolean;
  includeReferences?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  message: string;
  line: number;
  column: number;
  code: string;
}

export interface ValidationWarning {
  message: string;
  line: number;
  column: number;
  code: string;
}

export interface ParseResult {
  data: NDFObject;
  references: ReferenceStore;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export const DEFAULT_PARSE_OPTIONS: Required<ParseOptions> = {
  strict: false,
  resolveReferences: true,
  allowUndefinedReferences: false,
  preserveReferences: false,
  referenceResolver: undefined as any,
};

export const DEFAULT_DUMP_OPTIONS: Required<DumpOptions> = {
  indent: '  ',
  indentLevel: 0,
  inlineThreshold: 60,
  sortKeys: false,
  includeReferences: true,
};
