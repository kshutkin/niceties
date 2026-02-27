import fs from 'node:fs';

const result = fs.readFileSync('./result.log');

const isFine = result.toString() === 'ℹ info message\nℹ warning message\nerror message\n';

console.log(isFine ? 'fine!' : 'error');

process.exit(isFine ? 0 : -1);
