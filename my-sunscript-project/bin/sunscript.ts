#!/usr/bin/env node
import { CLI } from '../src/cli/CLI';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from the project root (where package.json is located)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const cli = new CLI();
cli.run(process.argv).catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
