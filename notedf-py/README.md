# notedf

Python implementation of Note Data Format (NDF) - a simple, compact, model-optimized data format.

## Installation

```bash
pip install notedf
```

## Quick Start

```python
from notedf import NoteDataFormat

parser = NoteDataFormat()

# Parse NDF
data = parser.parse("""
user:
  name: Alice
  age: 30
  tags: python ai ml
""")

# Serialize to NDF
ndf_text = parser.dumps(data)
```

## Usage

### Basic Parsing

```python
from notedf import NoteDataFormat

parser = NoteDataFormat()
data = parser.parse('name: John\nage: 30')
print(data)  # {'name': 'John', 'age': 30}
```

### File Operations

```python
# Load from file
data = parser.load('config.notedf')

# Save to file
parser.save(data, 'output.notedf')
```

### Advanced Features

```python
# Parse with references
data = parser.parse("""
$base:
  theme: dark
  lang: en

user:
  settings: $base {theme: light}
""")

# Parse typed values
data = parser.parse("""
timestamp: @time 2024-01-01T00:00:00Z
vector: @f32[1.0, 2.0, 3.0]
""")
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

- `parse(text: str) -> Dict[str, Any]` - Parse NDF text into Python dictionary
- `dumps(data: Dict[str, Any], indent: int = 0) -> str` - Convert dictionary to NDF format
- `load(filepath: str) -> Dict[str, Any]` - Load and parse NDF file
- `save(data: Dict[str, Any], filepath: str) -> None` - Save dictionary to NDF file

## Why NDF?

| Feature | JSON | YAML | TOML | NDF |
|---------|------|------|------|-----|
| Write Speed | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Parse Speed | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Size | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Token Efficiency | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Requirements

- Python >= 3.7

## Documentation

Full documentation available at [GitHub](https://github.com/Dysporium/note-data-format)

## License

MIT License - see LICENSE file for details.