#!/usr/bin/env node

// Direct Node.js script to run migrate:fresh
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment variables
process.env.PAYLOAD_DISABLE_TELEMETRY = 'true';
process.env.NODE_OPTIONS = '--no-warnings --experimental-loader tsx/esm';
process.env.TSX_TSCONFIG_PATH = join(__dirname, '..', 'tsconfig.json');

async function runMigrateFresh() {
  return new Promise((resolve, reject) => {
    const payloadBin = join(__dirname, '..', 'node_modules', 'payload', 'bin.js');
    
    const child = spawn('node', [payloadBin, 'migrate:fresh'], {
      cwd: join(__dirname, '..'),
      stdio: ['pipe', 'inherit', 'inherit'],
      env: {
        ...process.env,
        FORCE_COLOR: '1'
      }
    });

    // Auto-answer 'y' to the confirmation prompt
    setTimeout(() => {
      child.stdin.write('y\n');
      child.stdin.end();
    }, 1000);

    child.on('exit', (code) => {
      if (code === 0) {
        console.log('Migration completed successfully!');
        resolve();
      } else {
        reject(new Error(`Migration failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

try {
  await runMigrateFresh();
  process.exit(0);
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
