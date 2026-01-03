#!/usr/bin/env node

import { NoteDataFormat, ValidationErrorClass } from './index';
import * as fs from 'fs';

const VERSION = '0.3.0';

interface CliOptions {
  output?: string;
  quiet?: boolean;
  watch?: boolean;
  pretty?: boolean;
  strict?: boolean;
  noRefs?: boolean;
}

const parser = new NoteDataFormat();

function parseArgs(args: string[]): { command: string; files: string[]; options: CliOptions } {
  const options: CliOptions = {};
  const files: string[] = [];
  let command = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const option = arg.slice(2);
      
      switch (option) {
        case 'output':
        case 'o':
          options.output = args[++i];
          break;
        case 'quiet':
        case 'q':
          options.quiet = true;
          break;
        case 'watch':
        case 'w':
          options.watch = true;
          break;
        case 'pretty':
        case 'p':
          options.pretty = true;
          break;
        case 'strict':
        case 's':
          options.strict = true;
          break;
        case 'no-refs':
          options.noRefs = true;
          break;
        case 'version':
        case 'v':
          console.log(`ndf version ${VERSION}`);
          process.exit(0);
        case 'help':
        case 'h':
          showHelp();
          process.exit(0);
        default:
          console.error(`Unknown option: --${option}`);
          process.exit(1);
      }
    } else if (arg.startsWith('-')) {
      const flags = arg.slice(1);
      for (const flag of flags) {
        switch (flag) {
          case 'o':
            options.output = args[++i];
            break;
          case 'q':
            options.quiet = true;
            break;
          case 'w':
            options.watch = true;
            break;
          case 'p':
            options.pretty = true;
            break;
          case 's':
            options.strict = true;
            break;
          case 'v':
            console.log(`ndf version ${VERSION}`);
            process.exit(0);
          case 'h':
            showHelp();
            process.exit(0);
          default:
            console.error(`Unknown flag: -${flag}`);
            process.exit(1);
        }
      }
    } else if (!command) {
      command = arg;
    } else {
      files.push(arg);
    }
  }

  return { command, files, options };
}

function showHelp() {
  console.log(`
NDF - Note Data Format CLI v${VERSION}

Usage:
  ndf <command> [options] <file(s)>

Commands:
  convert <file>        Convert .notedf to JSON (alias: to-json)
  from-json <file>      Convert .json to .notedf
  validate <file>       Validate .notedf syntax
  format <file>         Format/pretty-print .notedf file
  get <file> <path>     Get value at path (e.g., config.database.host)
  set <file> <path> <v> Set value at path
  merge <file1> <file2> Merge two .notedf files
  diff <file1> <file2>  Show diff between two files
  help                  Show this help

Options:
  -o, --output <file>   Write output to file instead of stdout
  -q, --quiet           Suppress non-error output
  -w, --watch           Watch file for changes and re-run
  -p, --pretty          Pretty print JSON output (default for convert)
  -s, --strict          Fail on warnings
  --no-refs             Don't resolve $references
  -v, --version         Show version
  -h, --help            Show this help

Examples:
  ndf convert config.notedf                    # Output JSON to stdout
  ndf convert config.notedf -o config.json     # Write to file
  ndf from-json data.json                      # Creates data.notedf
  ndf validate settings.notedf                 # Check syntax
  ndf get config.notedf database.host          # Get nested value
  ndf set config.notedf server.port 8080       # Set value
  ndf merge base.notedf override.notedf        # Merge configs
  cat file.notedf | ndf convert -              # Read from stdin

Note Data Format Syntax:
  # Comments start with hash
  key: value                    # Simple key-value
  nested:                       # Nested objects
    child: value
  list: item1, item2, item3     # Inline list
  multiline: |                  # Multiline string
    First line
    Second line
  $ref: base_value              # Define reference
  using: $ref                   # Use reference
`);
}

function log(message: string, options: CliOptions): void {
  if (!options.quiet) {
    console.log(message);
  }
}

function error(message: string): void {
  console.error(message);
}

function readInput(filepath: string): string {
  if (filepath === '-') {
    // Read from stdin
    return fs.readFileSync(0, 'utf-8');
  }
  
  if (!fs.existsSync(filepath)) {
    error(`Error: File not found: ${filepath}`);
    process.exit(1);
  }
  
  return fs.readFileSync(filepath, 'utf-8');
}

function writeOutput(content: string, filepath: string | undefined, options: CliOptions): void {
  if (filepath) {
    fs.writeFileSync(filepath, content, 'utf-8');
    log(`✓ Written to ${filepath}`, options);
  } else {
    console.log(content);
  }
}

function handleConvert(files: string[], options: CliOptions): void {
  if (files.length === 0) {
    error('Error: Please provide a file path');
    process.exit(1);
  }

  try {
    const content = readInput(files[0]);
    const parseOptions = {
      strict: options.strict,
      resolveReferences: !options.noRefs,
    };
    
    const data = parser.parse(content, parseOptions);
    const indent = options.pretty !== false ? 2 : 0;
    const json = JSON.stringify(data, null, indent);
    
    writeOutput(json, options.output, options);
  } catch (err) {
    if (err instanceof ValidationErrorClass) {
      error(err.format(readInput(files[0]).split('\n')));
    } else {
      error(`Error: ${(err as Error).message}`);
    }
    process.exit(1);
  }
}

function handleFromJson(files: string[], options: CliOptions): void {
  if (files.length === 0) {
    error('Error: Please provide a file path');
    process.exit(1);
  }

  try {
    const jsonContent = readInput(files[0]);
    const data = JSON.parse(jsonContent);
    const ndfContent = parser.dumps(data);
    
    const outputPath = options.output || files[0].replace(/\.json$/i, '.notedf');
    
    fs.writeFileSync(outputPath, ndfContent, 'utf-8');
    log(`✓ Converted to ${outputPath}`, options);
  } catch (err) {
    error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

function handleValidate(files: string[], options: CliOptions): void {
  if (files.length === 0) {
    error('Error: Please provide a file path');
    process.exit(1);
  }

  try {
    const content = readInput(files[0]);
    const result = parser.validate(content, { strict: options.strict });
    
    if (!result.valid) {
      error(`✗ ${files[0]} has ${result.errors.length} error(s):`);
      for (const err of result.errors) {
        error(`  Line ${err.line}: ${err.message}`);
      }
      process.exit(1);
    }
    
    if (result.warnings.length > 0) {
      log(`⚠ ${files[0]} has ${result.warnings.length} warning(s):`, options);
      for (const warn of result.warnings) {
        log(`  Line ${warn.line}: ${warn.message}`, options);
      }
    }
    
    log(`✓ ${files[0]} is valid`, options);
  } catch (err) {
    error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

function handleFormat(files: string[], options: CliOptions): void {
  if (files.length === 0) {
    error('Error: Please provide a file path');
    process.exit(1);
  }

  try {
    const content = readInput(files[0]);
    const data = parser.parse(content);
    const formatted = parser.dumps(data);
    
    if (options.output) {
      fs.writeFileSync(options.output, formatted, 'utf-8');
      log(`✓ Formatted to ${options.output}`, options);
    } else if (files[0] !== '-') {
      fs.writeFileSync(files[0], formatted, 'utf-8');
      log(`✓ Formatted ${files[0]}`, options);
    } else {
      console.log(formatted);
    }
  } catch (err) {
    error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

function handleGet(files: string[], _options: CliOptions): void {
  if (files.length < 2) {
    error('Error: Please provide a file path and a key path');
    process.exit(1);
  }

  try {
    const content = readInput(files[0]);
    const data = parser.parse(content);
    const value = parser.get(data, files[1]);
    
    if (value === undefined) {
      error(`Error: Path not found: ${files[1]}`);
      process.exit(1);
    }
    
    if (typeof value === 'object') {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(value);
    }
  } catch (err) {
    error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

function handleSet(files: string[], options: CliOptions): void {
  if (files.length < 3) {
    error('Error: Please provide a file path, key path, and value');
    process.exit(1);
  }

  try {
    const content = readInput(files[0]);
    const data = parser.parse(content);
    
    // Parse the value
    let value: any = files[2];
    try {
      value = JSON.parse(files[2]);
    } catch {
      // Keep as string
    }
    
    const newData = parser.set(data, files[1], value);
    const ndfContent = parser.dumps(newData);
    
    if (options.output) {
      fs.writeFileSync(options.output, ndfContent, 'utf-8');
    } else if (files[0] !== '-') {
      fs.writeFileSync(files[0], ndfContent, 'utf-8');
    }
    
    log(`✓ Set ${files[1]} = ${files[2]}`, options);
  } catch (err) {
    error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

function handleMerge(files: string[], options: CliOptions): void {
  if (files.length < 2) {
    error('Error: Please provide two file paths');
    process.exit(1);
  }

  try {
    const content1 = readInput(files[0]);
    const content2 = readInput(files[1]);
    
    const data1 = parser.parse(content1);
    const data2 = parser.parse(content2);
    
    const merged = parser.merge(data1, data2);
    const ndfContent = parser.dumps(merged);
    
    writeOutput(ndfContent, options.output, options);
  } catch (err) {
    error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

function handleDiff(files: string[], options: CliOptions): void {
  if (files.length < 2) {
    error('Error: Please provide two file paths');
    process.exit(1);
  }

  try {
    const content1 = readInput(files[0]);
    const content2 = readInput(files[1]);
    
    const data1 = parser.parse(content1);
    const data2 = parser.parse(content2);
    
    const result = parser.diff(data1, data2);
    
    if (result.added.length === 0 && result.removed.length === 0 && result.changed.length === 0) {
      log('No differences found', options);
      return;
    }
    
    if (result.added.length > 0) {
      console.log('\n+ Added:');
      for (const key of result.added) {
        const value = parser.get(data2, key);
        console.log(`  + ${key}: ${JSON.stringify(value)}`);
      }
    }
    
    if (result.removed.length > 0) {
      console.log('\n- Removed:');
      for (const key of result.removed) {
        const value = parser.get(data1, key);
        console.log(`  - ${key}: ${JSON.stringify(value)}`);
      }
    }
    
    if (result.changed.length > 0) {
      console.log('\n~ Changed:');
      for (const key of result.changed) {
        const oldValue = parser.get(data1, key);
        const newValue = parser.get(data2, key);
        console.log(`  ~ ${key}:`);
        console.log(`    - ${JSON.stringify(oldValue)}`);
        console.log(`    + ${JSON.stringify(newValue)}`);
      }
    }
  } catch (err) {
    error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

function watchFile(filepath: string, callback: () => void): void {
  log(`Watching ${filepath} for changes...`, { quiet: false });
  
  let debounceTimer: NodeJS.Timeout | null = null;
  
  fs.watch(filepath, (eventType) => {
    if (eventType === 'change') {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        log(`\nFile changed, re-running...`, { quiet: false });
        callback();
      }, 100);
    }
  });
}

// Main CLI handler
const args = process.argv.slice(2);

if (args.length === 0) {
  showHelp();
  process.exit(0);
}

const { command, files, options } = parseArgs(args);

if (!command || command === 'help') {
  showHelp();
  process.exit(0);
}

const runCommand = (): void => {
  switch (command) {
    case 'convert':
    case 'to-json':
      handleConvert(files, options);
      break;
    
    case 'from-json':
      handleFromJson(files, options);
      break;
    
    case 'validate':
      handleValidate(files, options);
      break;
    
    case 'format':
      handleFormat(files, options);
      break;
    
    case 'get':
      handleGet(files, options);
      break;
    
    case 'set':
      handleSet(files, options);
      break;
    
    case 'merge':
      handleMerge(files, options);
      break;
    
    case 'diff':
      handleDiff(files, options);
      break;
    
    default:
      error(`Error: Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
};

// Run the command
runCommand();

// Set up watch mode if enabled
if (options.watch && files.length > 0 && files[0] !== '-') {
  watchFile(files[0], runCommand);
}
