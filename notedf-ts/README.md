# @dysporium/notedf

TypeScript/JavaScript implementation of Note Data Format (NDF) - a simple, compact, model-optimized data format.

## Installation

```bash
# Install from GitHub
npm install github:Dysporium/note-data-format

# Or clone and link locally
git clone https://github.com/Dysporium/note-data-format.git
cd note-data-format/notedf-ts
npm install && npm run build
npm link
```

## Quick Start

```typescript
import { NoteDataFormat } from '@dysporium/notedf';

const parser = new NoteDataFormat();

// Parse NDF
const data = parser.parse(`
user:
  name: Alice
  age: 30
  tags: python ai ml
`);

// Serialize to NDF
const ndfText = parser.dumps(data);
```

## Usage

### Basic Parsing

```typescript
import { NoteDataFormat } from '@dysporium/notedf';

const parser = new NoteDataFormat();
const data = parser.parse('name: John\nage: 30');
console.log(data); // { name: 'John', age: 30 }
```

### File Operations (Node.js)

```typescript
// Async file operations
const data = await parser.loadFile('config.notedf');
await parser.saveFile(data, 'output.notedf');
```

### CLI Tool

After installation and linking, use the `ndf` command:

```bash
# Convert .notedf to JSON
ndf convert config.notedf

# Convert JSON to .notedf
ndf from-json data.json

# Validate syntax
ndf validate settings.notedf

# Format/pretty-print
ndf format config.notedf
```

## Syntax Examples

### Simple Values

```
name: John Doe
age: 30
active: yes
score: 95.5
```

### Lists

```
tags: python ai machine-learning
colors: red, blue, green
```

### Nested Objects

```
user:
  name: Alice
  settings:
    theme: dark
    notifications: yes
```

### Multi-line Text

```
description: |
  This is a multi-line description.
  It preserves line breaks.
```

## API Reference

### `NoteDataFormat`

Main parser class.

#### Methods

- `parse(text: string): NDFObject` - Parse NDF text into JavaScript object
- `dumps(data: NDFObject, options?: DumpOptions): string` - Convert object to NDF format
- `loadFile(filepath: string): Promise<NDFObject>` - Load and parse NDF file (async)
- `saveFile(data: NDFObject, filepath: string): Promise<void>` - Save object to NDF file (async)
- `validate(text: string): ValidationResult` - Validate NDF syntax
- `get(data: NDFObject, path: string): NDFValue` - Get value by dot-notation path
- `set(data: NDFObject, path: string, value: NDFValue): NDFObject` - Set value by path
- `merge(target: NDFObject, source: NDFObject): NDFObject` - Deep merge objects
- `diff(oldData: NDFObject, newData: NDFObject): DiffResult` - Compare two objects

### Types

```typescript
type NDFValue = string | number | boolean | null | NDFObject | NDFArray;
type NDFObject = { [key: string]: NDFValue };
type NDFArray = NDFValue[];
```

## Why NDF?

| Feature | JSON | YAML | TOML | NDF |
|---------|------|------|------|-----|
| Write Speed | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Parse Speed | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Size | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Token Efficiency | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Requirements

- Node.js >= 14.0.0
- TypeScript >= 4.0 (optional, for TypeScript projects)

## Documentation

Full documentation available at [GitHub](https://github.com/Dysporium/note-data-format)

## License

MIT License - see LICENSE file for details.
