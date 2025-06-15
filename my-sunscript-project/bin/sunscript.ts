#!/usr/bin/env node
import { CLI } from '../src/cli/CLI';
import * as dotenv from 'dotenv';

dotenv.config();

const cli = new CLI();
cli.run(process.argv).catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
