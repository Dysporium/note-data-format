#!/usr/bin/env node

import { NoteDataFormat } from './index';
import * as fs from 'fs';

const parser = new NoteDataFormat();

function showHelp() {
  console.log(`
NDF - Note Data Format CLI

Usage:
  ndf <command> <file>

Commands:
  convert <file>        Convert .notedf to JSON
  to-json <file>        Convert .notedf to JSON (alias for convert)
  from-json <file>      Convert .json to .notedf
  validate <file>       Validate .notedf syntax
  format <file>         Format/pretty-print .notedf file
  help                  Show this help

Examples:
  ndf convert config.notedf
  ndf from-json data.json
  ndf validate settings.notedf

Creating .notedf files:
  Just create a file with .notedf extension and write:
  
  user:
    name: Alice
    age: 30
    tags: developer designer
  
  Then use: ndf convert user.notedf
`);
}

function handleConvert(filepath: string) {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    const data = parser.parse(content);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

function handleFromJson(filepath: string) {
  try {
    const jsonContent = fs.readFileSync(filepath, 'utf-8');
    const data = JSON.parse(jsonContent);
    const ndfContent = parser.dumps(data);
    
    const outputPath = filepath.replace(/\.json$/i, '.notedf');
    fs.writeFileSync(outputPath, ndfContent, 'utf-8');
    
    console.log(`✓ Converted to ${outputPath}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

function handleValidate(filepath: string) {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    parser.parse(content);
    console.log(`✓ ${filepath} is valid`);
  } catch (error) {
    console.error(`✗ Invalid syntax: ${(error as Error).message}`);
    process.exit(1);
  }
}

function handleFormat(filepath: string) {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    const data = parser.parse(content);
    const formatted = parser.dumps(data);
    fs.writeFileSync(filepath, formatted, 'utf-8');
    console.log(`✓ Formatted ${filepath}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Main CLI handler
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
  showHelp();
  process.exit(0);
}

const command = args[0];
const filepath = args[1];

if (!filepath) {
  console.error('Error: Please provide a file path');
  console.log('');
  showHelp();
  process.exit(1);
}

if (!fs.existsSync(filepath)) {
  console.error(`Error: File not found: ${filepath}`);
  process.exit(1);
}

switch (command) {
  case 'convert':
  case 'to-json':
    handleConvert(filepath);
    break;
  
  case 'from-json':
    handleFromJson(filepath);
    break;
  
  case 'validate':
    handleValidate(filepath);
    break;
  
  case 'format':
    handleFormat(filepath);
    break;
  
  default:
    console.error(`Error: Unknown command: ${command}`);
    console.log('');
    showHelp();
    process.exit(1);
}
