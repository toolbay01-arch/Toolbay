#!/usr/bin/env node

// Simple script to run Payload commands without tsx issues
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const payloadBin = join(__dirname, '..', 'node_modules', 'payload', 'dist', 'bin', 'index.js');

const child = spawn('node', [payloadBin, ...args], {
  stdio: 'inherit',
  cwd: join(__dirname, '..'),
  env: {
    ...process.env,
    NODE_OPTIONS: '--no-warnings'
  }
});

child.on('exit', (code) => {
  process.exit(code);
});
