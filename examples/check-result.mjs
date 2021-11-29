import fs from "fs";

const result = fs.readFileSync('./result.log');

const isFine = result.toString() === 'info message\nwarning message\nerror message\n';

process.exit(isFine ? 0 : -1);