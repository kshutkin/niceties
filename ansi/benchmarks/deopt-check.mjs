import { formatter } from '../src/shared.js';

const red = formatter('\x1b[31m', '\x1b[39m');
const blue = formatter('\x1b[34m', '\x1b[39m');
const bold = formatter('\x1b[1m', '\x1b[22m', '\x1b[22m\x1b[1m');

const ITERATIONS = 200000;

function phase(name) {
    console.log(`\n--- Phase: ${name} ---`);
}

// Phase 1: Simple string input (most common path, no replaceClose)
phase('Simple strings (no nesting)');
for (let i = 0; i < ITERATIONS; i++) {
    red('Add plugin to use time limit');
}

// Phase 2: Nested colors (triggers replaceClose path)
phase('Nested colors (triggers replaceClose)');
for (let i = 0; i < ITERATIONS; i++) {
    red(`a ${blue('nested')} text`);
}

// Phase 3: Number input (triggers Smi deopt on "" + input)
phase('Number input (Smi / type change)');
for (let i = 0; i < ITERATIONS; i++) {
    red(42);
}

// Phase 4: Mixed string and number input on same formatter
phase('Mixed string and number input');
for (let i = 0; i < ITERATIONS; i++) {
    blue('hello');
    blue(i);
}

// Phase 5: Custom replace (bold/dim with 3-arg formatter)
phase('Three-arg formatter (custom replace)');
for (let i = 0; i < ITERATIONS; i++) {
    bold('important');
}

// Phase 6: Nested with custom replace
phase('Nested with custom replace');
for (let i = 0; i < ITERATIONS; i++) {
    bold(`a ${bold('double bold')} text`);
}

// Phase 7: Heavy recursion - long strings with many close sequences
phase('Heavy recursion (long repeated nested string)');
const input = 'lorem ipsum dolor sit amet';
for (let i = 0; i < 1000; i++) {
    blue(red(input).repeat(1000));
}

// Phase 8: Empty string
phase('Empty string input');
for (let i = 0; i < ITERATIONS; i++) {
    red('');
}

// Phase 9: Single character
phase('Single character input');
for (let i = 0; i < ITERATIONS; i++) {
    red('.');
}

console.log('\n--- All phases complete ---');
console.log(`
V8 deoptimization check for @niceties/ansi shared.js

Usage (run from the ansi/ directory):

  Deopt trace (look for bailout reasons other than "prepare for on stack replacement"):
    FORCE_COLOR=1 node --trace-deopt benchmarks/deopt-check.mjs 2>&1 | grep -v "node:" | grep -v "node_modules"

  Optimization trace (verify functions get optimized to TURBOFAN):
    FORCE_COLOR=1 node --trace-opt benchmarks/deopt-check.mjs 2>&1 | grep -v "node:" | grep -v "node_modules"

  Combined deopt + opt trace:
    FORCE_COLOR=1 node --trace-deopt --trace-opt benchmarks/deopt-check.mjs 2>&1 | grep -v "node:" | grep -v "node_modules"

  Inline cache trace (check for megamorphic ICs in shared.js):
    FORCE_COLOR=1 node --trace-ic benchmarks/deopt-check.mjs 2>&1 | grep "shared"

  Summary of unique deopt reasons:
    FORCE_COLOR=1 node --trace-deopt benchmarks/deopt-check.mjs 2>&1 | grep "reason:" | grep -v "node:" | grep -v "node_modules" | grep -v "prepare for on stack" | sort | uniq -c

Known expected deopts:
  - "Smi" at Phase 3: happens once when V8 first sees number input after optimizing for strings
  - "Insufficient type feedback for call": one-time warmup deopts when new call paths are first encountered
  - "prepare for on stack replacement (OSR)": normal OSR transitions, not a concern
`);
