#!/usr/bin/env node

/**
 * CLI Wrapper for Data Discovery Browser
 * Zero-config usage: discovery-tool ./data.csv
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);

// Help message
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Data Discovery Browser CLI

Usage:
  discovery-tool [file]            Open data file in browser
  discovery-tool --build           Build static site
  discovery-tool --serve           Start dev server
  discovery-tool --help            Show this help

Examples:
  discovery-tool ./data.csv        Open CSV file
  discovery-tool ./metrics.json    Open JSON file
  discovery-tool --serve           Start development server

Options:
  --port <number>                  Port for dev server (default: 3000)
  --output <dir>                   Output directory for build (default: dist)
  `);
  process.exit(0);
}

// Get Observable Framework binary
const observableBin = path.join(__dirname, '..', 'node_modules', '.bin', 'observable');

// Parse commands
if (args.includes('--build')) {
  // Build static site
  console.log('Building static site...');
  const build = spawn(observableBin, ['build'], { stdio: 'inherit' });
  build.on('close', (code) => process.exit(code));
} else if (args.includes('--serve') || args.length === 0) {
  // Start dev server
  const portIndex = args.indexOf('--port');
  const port = portIndex >= 0 ? args[portIndex + 1] : '3000';
  
  console.log(`Starting dev server on port ${port}...`);
  const serve = spawn(observableBin, ['preview', '--port', port], { stdio: 'inherit' });
  serve.on('close', (code) => process.exit(code));
} else {
  // Open specific file
  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  // Copy file to src/data/ directory
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const fileName = path.basename(filePath);
  const destPath = path.join(dataDir, fileName);
  
  console.log(`Loading ${fileName}...`);
  fs.copyFileSync(filePath, destPath);

  // Update index.md to use this file
  const indexPath = path.join(__dirname, '..', 'src', 'index.md');
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Replace FileAttachment path
  indexContent = indexContent.replace(
    /FileAttachment\("\.\/data\/[^"]+"\)/,
    `FileAttachment("./data/${fileName}")`
  );
  
  fs.writeFileSync(indexPath, indexContent);

  // Start dev server
  console.log('Starting dev server...');
  const serve = spawn(observableBin, ['preview'], { stdio: 'inherit' });
  serve.on('close', (code) => process.exit(code));
}
