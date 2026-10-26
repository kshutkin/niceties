import { setTimeout } from 'node:timers/promises';

import { draft } from '../draftlog/src/index.js';

if (!process.stdout.isTTY || !process.stdout.columns) {
    throw new Error('Run this script directly in an interactive terminal.');
}

console.log('Both KEEP lines should remain after the draft grows.');
console.log('KEEP: first marker');
console.log('KEEP: second marker');
const update = draft('Loading...');

await setTimeout(1500);
update('X'.repeat(process.stdout.columns * 2 + 1));
await setTimeout(1000);
