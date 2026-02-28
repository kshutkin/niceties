// Performance benchmark for @niceties/draftlog
// Run: node perf.mjs

import { performance } from 'node:perf_hooks';

import { draft } from '../src/index.js';

const LINES = 40;
const UPDATES = 200;
const WARMUP = 3;
const ITERATIONS = 10;

async function run() {
    const updaters = [];
    for (let i = 0; i < LINES; i++) {
        updaters.push(draft(`task ${i}: [${'.'.repeat(50)}] 0%`));
    }
    for (let r = 0; r < UPDATES; r++) {
        const pct = ((r / UPDATES) * 100) | 0;
        const filled = ((pct / 100) * 50) | 0;
        const bar = `[${'█'.repeat(filled)}${'.'.repeat(50 - filled)}] ${pct}%`;
        for (let i = 0; i < LINES; i++) {
            updaters[i](`task ${i}: ${bar}`);
        }
        await Promise.resolve();
    }
}

for (let i = 0; i < WARMUP; i++) await run();

const durations = [];
for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    await run();
    durations.push(performance.now() - start);
}

const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
const sorted = [...durations].sort((a, b) => a - b);
const med = sorted[sorted.length >> 1];
const min = Math.min(...durations);
const max = Math.max(...durations);

const log = (msg = '') => process.stderr.write(`${msg}\n`);
log();
log(`  @niceties/draftlog perf — ${LINES} lines × ${UPDATES} update rounds`);
log(`  avg ${avg.toFixed(2)}ms | med ${med.toFixed(2)}ms | min ${min.toFixed(2)}ms | max ${max.toFixed(2)}ms`);
log();
