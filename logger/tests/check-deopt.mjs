/**
 * V8 Deoptimization Check for @niceties/logger
 *
 * Exercises all major logger code paths in hot loops and checks for
 * V8 deoptimizations using two complementary approaches:
 *
 *   1. --trace-deopt --trace-file-names: captures bailout traces and filters
 *      for lines referencing logger source files. Each workload pattern runs
 *      in its own isolated child process to prevent cross-contamination
 *      between different usage patterns.
 *
 *   2. --allow-natives-syntax: uses %GetOptimizationStatus to verify that
 *      key hot functions remain optimized after realistic usage patterns.
 *
 * The script spawns itself as a child process with the required V8 flags,
 * so the only invocation needed is:
 *
 *   node logger/tests/check-deopt.mjs
 */

import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---- detect which phase we are running in ---------------------------------

const phase = process.env.__DEOPT_CHECK_PHASE;

if (!phase) {
    await orchestrate();
} else if (phase === 'natives') {
    await nativesWorkload();
} else {
    // All other phases are trace workloads keyed by name
    await traceWorkload(phase);
}

// ---------------------------------------------------------------------------
// Phase 0 – orchestrator (no special V8 flags)
// ---------------------------------------------------------------------------

async function orchestrate() {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const run = promisify(execFile);

    const srcDir = resolve(__dirname, '..', 'src');
    const srcMatch = srcDir.split(sep).join('/');
    let failed = false;

    // ---- Phase 1: --trace-deopt (one subprocess per workload pattern) -----

    const traceWorkloads = [
        'trace-steady-lifecycle',
        'trace-steady-log',
        'trace-parent-child',
        'trace-per-instance-appender',
        'trace-combine-appenders',
        'trace-filter-messages',
        'trace-formatter',
        'trace-console-appender',
        'trace-simple-logger',
        'trace-global-appender',
        'trace-default-appender',
    ];

    for (const workloadName of traceWorkloads) {
        let stdout = '';
        let stderr = '';
        try {
            const result = await run(process.execPath, ['--trace-deopt', '--trace-file-names', __filename], {
                env: { ...process.env, NODE_OPTIONS: '', __DEOPT_CHECK_PHASE: workloadName },
                maxBuffer: 100 * 1024 * 1024,
                timeout: 60_000,
            });
            stdout = result.stdout ?? '';
            stderr = result.stderr ?? '';
        } catch (err) {
            stdout = err.stdout ?? '';
            stderr = err.stderr ?? '';
        }

        // V8 may write trace output to stdout or stderr depending on version
        const lines = `${stdout}\n${stderr}`.split('\n');

        const deoptLines = lines.filter(line => {
            const lower = line.toLowerCase();
            if (!lower.includes('bailout') && !lower.includes('deoptimiz')) return false;
            const normalised = line.split(sep).join('/');
            return normalised.includes(srcMatch) || normalised.includes('/logger/src/');
        });

        if (deoptLines.length === 0) {
            console.log(`\x1b[32m✓\x1b[0m trace-deopt [${workloadName}]: no deoptimizations detected.`);
        } else {
            failed = true;
            console.error(`\x1b[31m✕\x1b[0m trace-deopt [${workloadName}]: found ${deoptLines.length} deoptimization(s):`);
            const seen = new Set();
            for (const line of deoptLines) {
                const trimmed = line.trim();
                if (!seen.has(trimmed)) {
                    seen.add(trimmed);
                    console.error(`    ${trimmed}`);
                }
            }
        }
    }

    // ---- Phase 2: --allow-natives-syntax -----------------------------------
    {
        let stdout = '';
        let stderr = '';
        try {
            const result = await run(process.execPath, ['--allow-natives-syntax', __filename], {
                env: { ...process.env, NODE_OPTIONS: '', __DEOPT_CHECK_PHASE: 'natives' },
                maxBuffer: 10 * 1024 * 1024,
                timeout: 60_000,
            });
            stdout = result.stdout ?? '';
            stderr = result.stderr ?? '';
        } catch (err) {
            stdout = err.stdout ?? '';
            stderr = err.stderr ?? '';
        }

        const lines = stdout.split('\n').filter(Boolean);
        const failures = lines.filter(l => l.startsWith('FAIL:'));
        const passes = lines.filter(l => l.startsWith('PASS:'));

        for (const p of passes) {
            console.log(`\x1b[32m✓\x1b[0m opt-status: ${p.slice(6)}`);
        }
        for (const f of failures) {
            failed = true;
            console.error(`\x1b[31m✕\x1b[0m opt-status: ${f.slice(6)}`);
        }

        if (stderr.trim()) {
            console.error(stderr.trim());
        }

        if (failures.length === 0 && passes.length === 0) {
            failed = true;
            console.error('\x1b[31m✕\x1b[0m opt-status: no optimization status output received.');
            if (stdout.trim()) console.error('  stdout:', stdout.trim());
        }
    }

    console.log('');
    if (failed) {
        console.error('\x1b[31mDeoptimization check failed.\x1b[0m');
    } else {
        console.log('\x1b[32mAll deoptimization checks passed.\x1b[0m');
    }

    process.exit(failed ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Phase 1 – individual trace workloads (each run under --trace-deopt)
// ---------------------------------------------------------------------------

async function traceWorkload(name) {
    const { appender } = await import('../src/global-appender.js');
    const { createLogger } = await import('../src/core.js');
    const { createLogger: createSimpleLogger } = await import('../src/simple.js');
    const { filterMessages, combineAppenders } = await import('../src/appender-utils.js');
    const { createConsoleAppender } = await import('../src/console-appender.js');
    const { createFormatter, terminalSupportsUnicode } = await import('../src/format-utils.js');
    const { asciiPrefixes, unicodePrefixes, colors, tagFactory } = await import('../src/default-formatting.js');
    const { Action, LogLevel } = await import('../src/types.js');

    // Suppress console output during the workload
    const origLog = console.log;
    console.log = () => {};

    const N = 10_000;
    const noop = () => {};

    switch (name) {
        // Steady-state: one logger instance, repeated lifecycle calls
        case 'trace-steady-lifecycle': {
            appender(noop);
            const logger = createLogger('steady');
            for (let i = 0; i < N; i++) {
                logger.start('starting');
                logger.update('updating');
                logger.finish('done');
            }
            // Also with explicit log levels
            for (let i = 0; i < N; i++) {
                logger.start('starting', LogLevel.verbose);
                logger.update('updating', LogLevel.warn);
                logger.finish('done', LogLevel.error);
            }
            break;
        }

        // Steady-state: one logger instance, repeated log() calls
        case 'trace-steady-log': {
            appender(noop);
            const logger = createLogger('log-bench');
            for (let i = 0; i < N; i++) {
                logger('message');
                logger('message', LogLevel.error);
                logger('message', LogLevel.warn, new Error('ctx'));
            }
            break;
        }

        // Parent-child relationship
        case 'trace-parent-child': {
            appender(noop);
            const parent = createLogger('parent');
            const child = createLogger('child', parent);
            for (let i = 0; i < N; i++) {
                child.start('starting');
                child.update('updating');
                child.finish('done');
            }
            break;
        }

        // Per-instance appender set once, then used in steady state
        case 'trace-per-instance-appender': {
            const mock = () => {};
            const logger = createLogger('per-instance');
            logger.appender(mock);
            for (let i = 0; i < N; i++) {
                logger.start('starting');
                logger.update('updating');
                logger.finish('done');
            }
            break;
        }

        // combineAppenders in steady state
        case 'trace-combine-appenders': {
            const a = () => {};
            const b = () => {};
            const combined = combineAppenders(a, b);
            appender(combined);
            const logger = createLogger('combined');
            for (let i = 0; i < N; i++) {
                logger.start('starting');
                logger.update('updating');
                logger.finish('done');
                logger('log msg');
            }
            break;
        }

        // filterMessages in steady state
        case 'trace-filter-messages': {
            const inner = () => {};
            const filtered = filterMessages(m => m.loglevel >= LogLevel.warn, inner);
            appender(filtered);
            const logger = createLogger();
            for (let i = 0; i < N; i++) {
                logger('verbose', LogLevel.verbose);
                logger('info', LogLevel.info);
                logger('warn', LogLevel.warn);
                logger('error', LogLevel.error);
            }
            break;
        }

        // Formatter hot loop
        case 'trace-formatter': {
            const prefixes = terminalSupportsUnicode() ? unicodePrefixes : asciiPrefixes;
            const formatter = createFormatter(colors, prefixes, tagFactory);
            for (let i = 0; i < N; i++) {
                formatter({ action: Action.log, loglevel: LogLevel.info, message: 'msg', tag: 'tag' }, false, 0);
                formatter(
                    { action: Action.finish, loglevel: LogLevel.error, message: 'fail', context: new Error('e'), tag: 'tag' },
                    true,
                    2
                );
                formatter({ action: Action.log, loglevel: LogLevel.verbose, message: 'verbose', tag: 'tag' }, 'custom', 0);
                formatter({ action: Action.start, loglevel: LogLevel.warn, message: 'warn' }, true, 0);
            }
            break;
        }

        // Console appender steady state (console.log suppressed)
        case 'trace-console-appender': {
            const prefixes = terminalSupportsUnicode() ? unicodePrefixes : asciiPrefixes;
            const formatter = createFormatter(colors, prefixes, tagFactory);
            const consoleApp = createConsoleAppender(formatter);
            appender(consoleApp);
            const logger = createLogger('console');
            for (let i = 0; i < N; i++) {
                logger.start('starting');
                logger.update('updating');
                logger.finish('done');
            }
            break;
        }

        // Simple logger steady state
        case 'trace-simple-logger': {
            appender(noop);
            const logger = createSimpleLogger('simple-tag');
            for (let i = 0; i < N; i++) {
                logger('message');
                logger('message', LogLevel.error);
                logger('message', LogLevel.warn, new Error('ctx'));
            }
            break;
        }

        // Global appender get/set steady state
        case 'trace-global-appender': {
            for (let i = 0; i < N; i++) {
                appender(noop);
                appender();
            }
            break;
        }

        // Default appender (filterMessages + consoleAppender) as in index.js
        case 'trace-default-appender': {
            const prefixes = terminalSupportsUnicode() ? unicodePrefixes : asciiPrefixes;
            const formatter = createFormatter(colors, prefixes, tagFactory);
            let minLogLevel = LogLevel.info;
            const filtered = filterMessages(
                message => /** @type {number} */ (message.loglevel) >= minLogLevel,
                createConsoleAppender(formatter)
            );
            filtered.api = {
                setMinLevel(logLevel) {
                    minLogLevel = logLevel;
                },
            };
            appender(filtered);
            const logger = createLogger('default-app');
            for (let i = 0; i < N; i++) {
                logger.start('starting');
                logger.update('updating');
                logger.finish('done');
                logger('log msg');
            }
            // Exercise setMinLevel in steady state
            for (let i = 0; i < N; i++) {
                logger.setMinLevel(LogLevel.verbose);
                logger('verbose msg', LogLevel.verbose);
                logger.setMinLevel(LogLevel.warn);
                logger('filtered out', LogLevel.info);
                logger('passes', LogLevel.warn);
            }
            break;
        }
    }

    console.log = origLog;
}

// ---------------------------------------------------------------------------
// Phase 2 – natives workload (runs under --allow-natives-syntax)
// ---------------------------------------------------------------------------

async function nativesWorkload() {
    const { appender } = await import('../src/global-appender.js');
    const { createLogger } = await import('../src/core.js');
    const { createLogger: createSimpleLogger } = await import('../src/simple.js');
    const { filterMessages, combineAppenders } = await import('../src/appender-utils.js');
    const { createConsoleAppender } = await import('../src/console-appender.js');
    const { createFormatter, terminalSupportsUnicode } = await import('../src/format-utils.js');
    const { asciiPrefixes, unicodePrefixes, colors, tagFactory } = await import('../src/default-formatting.js');
    const { Action, LogLevel } = await import('../src/types.js');

    // Use direct eval so that `fn` from the enclosing scope is accessible.
    // The %-prefixed intrinsics are only valid syntax under --allow-natives-syntax;
    // wrapping them in eval strings avoids parse errors when this file is loaded
    // without that flag (i.e. in the orchestrator phase).
    // biome-ignore lint/correctness/noUnusedVariables: fn is used inside eval at runtime
    // biome-ignore lint/security/noGlobalEval: required to defer parsing of V8 native syntax
    const Prepare = fn => eval('%PrepareFunctionForOptimization(fn)');
    // biome-ignore lint/correctness/noUnusedVariables: fn is used inside eval at runtime
    // biome-ignore lint/security/noGlobalEval: required to defer parsing of V8 native syntax
    const Optimize = fn => eval('%OptimizeFunctionOnNextCall(fn)');
    // biome-ignore lint/correctness/noUnusedVariables: fn is used inside eval at runtime
    // biome-ignore lint/security/noGlobalEval: required to defer parsing of V8 native syntax
    const GetStatus = fn => eval('%GetOptimizationStatus(fn)');

    // Bit 16 = kOptimized in the status bitmask
    const kOptimized = 16;
    // Bit 2 = kNeverOptimize
    const kNeverOptimize = 2;

    const results = [];

    function checkOptimized(label, fn, exercise) {
        try {
            Prepare(fn);
            exercise();
            exercise();
            Optimize(fn);
            exercise();

            const status = GetStatus(fn);

            if (status & kNeverOptimize) {
                // V8 decided this function is not eligible for optimization
                // (e.g. too small or a builtin). This is not a deopt.
                results.push(`PASS: ${label} (not eligible for optimization, status=${status})`);
                return;
            }

            if (status & kOptimized) {
                results.push(`PASS: ${label} (optimized, status=${status})`);
            } else {
                results.push(`FAIL: ${label} was NOT optimized after warm-up (status=${status})`);
            }
        } catch (e) {
            results.push(`FAIL: ${label} - error during check: ${e.message}`);
        }
    }

    // Suppress console output
    const origLog = console.log;
    console.log = () => {};

    const noop = () => {};
    appender(noop);

    // -- core createLogger --------------------------------------------------
    checkOptimized('core createLogger', createLogger, () => {
        createLogger('tag');
    });

    // -- core logger lifecycle methods (on a single instance) ---------------
    {
        const logger = createLogger('bench');
        checkOptimized('core logger.start', logger.start, () => {
            logger.start('msg');
        });
        checkOptimized('core logger.update', logger.update, () => {
            logger.update('msg');
        });
        checkOptimized('core logger.finish', logger.finish, () => {
            logger.finish('msg');
        });
    }

    // -- core logger callable -----------------------------------------------
    {
        const logger = createLogger('bench-call');
        checkOptimized('core logger() call', logger, () => {
            logger('msg');
        });
    }

    // -- simple logger ------------------------------------------------------
    checkOptimized('simple createLogger', createSimpleLogger, () => {
        createSimpleLogger('tag');
    });

    {
        const sLogger = createSimpleLogger('bench');
        checkOptimized('simple logger() call', sLogger, () => {
            sLogger('msg');
        });
    }

    // -- filterMessages result ----------------------------------------------
    {
        const inner = () => {};
        const filtered = filterMessages(m => m.loglevel >= LogLevel.warn, inner);
        checkOptimized('filterMessages result', filtered, () => {
            filtered({ action: Action.log, loglevel: LogLevel.warn, message: 'msg' });
        });
    }

    // -- combineAppenders result --------------------------------------------
    {
        const a = () => {};
        const b = () => {};
        const combined = combineAppenders(a, b);
        checkOptimized('combineAppenders result', combined, () => {
            combined({ action: Action.log, loglevel: LogLevel.info, message: 'msg' });
        });
    }

    // -- formatter ----------------------------------------------------------
    {
        const prefixes = terminalSupportsUnicode() ? unicodePrefixes : asciiPrefixes;
        const formatter = createFormatter(colors, prefixes, tagFactory);
        checkOptimized('formatter', formatter, () => {
            formatter({ action: Action.log, loglevel: LogLevel.info, message: 'msg', tag: 'tag' }, true, 0);
        });
    }

    // -- console appender ---------------------------------------------------
    {
        const prefixes = terminalSupportsUnicode() ? unicodePrefixes : asciiPrefixes;
        const formatter = createFormatter(colors, prefixes, tagFactory);
        const consoleApp = createConsoleAppender(formatter);
        checkOptimized('consoleAppender', consoleApp, () => {
            consoleApp({ action: Action.finish, loglevel: LogLevel.info, message: 'msg' });
        });
    }

    // -- global appender ----------------------------------------------------
    checkOptimized('global appender()', appender, () => {
        appender(noop);
    });

    // -- default appender (filterMessages + consoleAppender) as in index.js -
    {
        const prefixes = terminalSupportsUnicode() ? unicodePrefixes : asciiPrefixes;
        const formatter = createFormatter(colors, prefixes, tagFactory);
        let minLogLevel = LogLevel.info;
        const filtered = filterMessages(
            message => /** @type {number} */ (message.loglevel) >= minLogLevel,
            createConsoleAppender(formatter)
        );
        filtered.api = {
            setMinLevel(logLevel) {
                minLogLevel = logLevel;
            },
        };
        appender(filtered);
        const logger = createLogger('default-app');
        checkOptimized('default appender (filtered consoleAppender)', filtered, () => {
            filtered({ action: Action.finish, loglevel: LogLevel.info, message: 'msg' });
        });
        checkOptimized('default appender logger lifecycle', logger.start, () => {
            logger.start('msg');
        });
        checkOptimized('default appender setMinLevel', filtered.api.setMinLevel, () => {
            filtered.api.setMinLevel(LogLevel.warn);
        });
    }

    console.log = origLog;

    // Print results to stdout for the orchestrator to parse
    for (const r of results) {
        console.log(r);
    }
}
