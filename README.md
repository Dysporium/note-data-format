# Note Data Format

Write data like notes, parse like lightning. A simple, compact, model-optimized data format.

## Features

- **40-70% smaller** than JSON
- **Write like taking notes** - minimal syntax
- **Optimized for AI/ML** - token efficient
- **Fast parsing** - single-pass parser
- **Bidirectional** - parse and serialize

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

## Syntax Examples

### Simple Values

name: John Doe
age: 30
active: yes
score: 95.5

### Lists
tags: python ai machine-learning
colors: red, blue, green

### Nested Objects
user:
name: Alice
settings:
theme: dark
notifications: yes

### Multi-line Text
description: |
This is a multi-line description.
It preserves line breaks.

## Why NDF?

| Feature | JSON | YAML | TOML | NDF |
|---------|------|------|------|-----|
| Write Speed | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Parse Speed | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Size | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Token Efficiency | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Documentation

- **[Formal Grammar](https://github.com/Dysporium/note-data-format/wiki/NDF-Formal-Grammar-Specification)** - Complete EBNF grammar specification
- **[Canonicalization Rules](https://github.com/Dysporium/note-data-format/wiki/NDF-Canonicalization-Rules)** - Rules for deterministic serialization
- **[Escaping & Edge Cases](https://github.com/Dysporium/note-data-format/wiki/NDF-Escaping-and-Edge-Cases)** - How to handle special characters and edge cases

Full documentation available in the [GitHub Wiki](https://github.com/Dysporium/note-data-format/wiki)

## License

MIT License - see LICENSE file for details.
