#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const [major] = process.versions.node.split('.').map(Number);
if (major < 20) {
  console.error(`create-nonoise requires Node.js 20 or higher. You are running ${process.versions.node}.`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const { main } = await import(resolve(here, '..', 'dist', 'index.js'));
await main();
