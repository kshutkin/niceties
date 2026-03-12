import { dirname } from 'node:path';

import { buildSync } from 'esbuild';

const root = dirname(new URL(import.meta.url).pathname);

console.log('\n# Bundle Size Comparison\n');

console.table({
    '@niceties/ansi': build(`export * as ansi from "../src/index.js"`),
    picocolors: build(`export { default as picocolors } from "picocolors"`),
    colorette: build(`export * as colorette from "colorette"`),
    'chalk v5': build(`export * as chalk from "chalk"`),
    kleur: build(`export { default as kleur } from "kleur"`),
    'kleur/colors': build(`export * as kleurColors from "kleur/colors"`),
    'ansi-colors': build(`export { default as ansi } from "ansi-colors"`),
    nanocolors: build(`export * as nanocolors from "nanocolors"`),
    yoctocolors: build(`export * as yoctocolors from "yoctocolors"`),
});

function build(contents) {
    try {
        const result = buildSync({
            bundle: true,
            write: false,
            minify: false,
            platform: 'node',
            stdin: { contents, loader: 'js', resolveDir: root },
        });
        const code = result.outputFiles[0].text;
        const resultMinified = buildSync({
            bundle: true,
            write: false,
            minify: true,
            platform: 'node',
            stdin: { contents, loader: 'js', resolveDir: root },
        });
        const minified = resultMinified.outputFiles[0].text;
        return {
            'size (KB)': toKB(code.length),
            'minified (KB)': toKB(minified.length),
        };
    } catch {
        return { 'size (KB)': 'N/A', 'minified (KB)': 'N/A' };
    }
}

function toKB(value) {
    return (((value / 1024) * 100) | 0) / 100;
}
