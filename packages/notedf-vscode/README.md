# Note Data Format (NDF) - VS Code Extension

Syntax highlighting and language support for Note Data Format (`.notedf`) files in VS Code.

## Features

- Syntax highlighting for `.notedf` and `.ndf` files
- Color-coded syntax for keys, values, comments, references, arrays, and objects
- Comment support (lines starting with `#`)
- Auto-closing brackets and quotes
- Smart indentation rules
- **Document formatting** - Format NDF files with proper indentation
- **Validation** - Real-time syntax error detection with diagnostics
- **Hover information** - Hover over keys to see their values
- **Document symbols** - Outline view showing all keys in the file
- **Convert to JSON** - Convert NDF files to JSON format

## Installation

### From Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Note Data Format" or "notedf"
4. Click Install

### From Source

1. Clone the repository
2. Navigate to `packages/notedf-vscode`
3. Run `npm install`
4. Run `npm run compile`
5. Press F5 in VS Code to open Extension Development Host
6. Or package it: `npm run package` and install the `.vsix` file manually

## Usage

Open any `.notedf` or `.ndf` file. Syntax highlighting should work automatically. If it doesn't, check that the file extension is correct and the extension is enabled.

### Commands

- **Format Document** (`notedf.format`) - Format the current NDF file
- **Validate NDF** (`notedf.validate`) - Check for syntax errors
- **Convert to JSON** (`notedf.toJson`) - Convert NDF to JSON in a new editor

Access commands via Command Palette (Ctrl+Shift+P / Cmd+Shift+P) and search for "NDF".

### Configuration

- `notedf.validate.enable` - Enable/disable validation diagnostics (default: `true`)
- `notedf.format.enable` - Enable/disable document formatting (default: `true`)

## Syntax Highlighting

The extension provides highlighting for:

- **Keys**: Property names (e.g., `name:`, `age:`)
- **Strings**: Quoted (`"text"`, `'text'`) and unquoted strings
- **Numbers**: Numeric values (integers and floats)
- **Booleans**: `yes`, `no`, `true`, `false`
- **Null values**: `null`, `none`, `-`
- **Comments**: Lines starting with `#`
- **References**: Variables starting with `$` (e.g., `$ref`)
- **Arrays**: `[item1, item2, item3]`
- **Objects**: `{key: value}` (inline objects)
- **Multi-line text**: Using `|` syntax
- **Type hints**: `@time`, `@embedding`, `@f[128]`, etc.

## Development

```bash
npm install          # Install dependencies
npm run compile      # Compile TypeScript and bundle with webpack
npm run watch        # Watch mode (auto-rebuild)
npm run package      # Create .vsix package
npm run release      # Bump patch version and package
```

### Version Management

```bash
npm run version:patch    # Bump patch version (1.0.0 → 1.0.1)
npm run version:minor    # Bump minor version (1.0.0 → 1.1.0)
npm run version:major    # Bump major version (1.0.0 → 2.0.0)
```

## Related

- [TypeScript Package](../notedf-ts) - Core NDF parser library
- [Python Package](../notedf-py) - Python implementation
- [Main Repository](https://github.com/Dysporium/note-data-format)

## License

MIT License - see LICENSE file for details.
