#!/usr/bin/env node

// Custom script to run migrate:fresh without interactive prompts
process.env.PAYLOAD_DISABLE_TELEMETRY = 'true';

import { loadEnv } from '../node_modules/payload/dist/bin/loadEnv.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
await loadEnv();

// Import payload and migration functions
const { migrateReset } = await import('../node_modules/payload/dist/database/migrations/migrateReset.js');
const payload = await import('payload');

async function runMigrateFresh() {
  try {
    console.log('Dropping database and running fresh migrations...');
    
    // Initialize payload
    const payloadInstance = await payload.default.init({
      configPath: path.resolve(__dirname, '..', 'src', 'payload.config.ts'),
      local: true,
    });

    // Run migrate fresh (which is essentially a reset)
    await migrateReset({ payload: payloadInstance });
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrateFresh();
