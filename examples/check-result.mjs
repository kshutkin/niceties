import fs from "fs";

const result = fs.readFileSync('./result.log');

const isFine = result.toString() === 'info message\nwarning message\nerror message\n';

console.log(isFine ? 'success' : 'failed');

process.exit(isFine ? 0 : -1);