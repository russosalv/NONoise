#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const [major] = process.versions.node.split('.').map(Number);
if (major < 20) {
  console.error(`create-nonoise requires Node.js 20 or higher. You are running ${process.versions.node}.`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(here, '..', 'dist', 'index.js');
const { main } = await import(pathToFileURL(distEntry).href);
await main();
