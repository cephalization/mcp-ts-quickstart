#!/usr/bin/env node
/**
 * Development wrapper script for MCP Inspector
 *
 * Loads .env file and starts MCP Inspector
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
const envPath = join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Warning: Could not load .env file');
  console.error('');
}

// Start MCP Inspector with tsx
const child = spawn(
  'pnpm',
  ['dlx', '@modelcontextprotocol/inspector', '--', 'tsx', 'src/index.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env },
    cwd: __dirname
  }
);

child.on('error', (error) => {
  console.error('Failed to start MCP Inspector:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
