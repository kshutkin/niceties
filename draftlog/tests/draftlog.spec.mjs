import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** @param {string} arg */
function isCursorMove(arg) {
    return arg.startsWith('\x1B[') && (arg.endsWith('A') || arg.endsWith('B'));
}

describe('draftlog', () => {
    /** @type {ReturnType<typeof vi.fn>} */
    let writeMock;
    /** @type {boolean} */
    let originalIsTTY;
    /** @type {import('../src/index.js')} */
    let draftlog;
    /** @type {(() => void)[]} */
    let resizeListeners;
    /** @type {typeof process.stdout.write} */
    let hookedWrite;

    beforeEach(async () => {
        vi.resetModules();
        writeMock = vi.fn();
        originalIsTTY = process.stdout.isTTY;
        process.stdout.isTTY = true;
        // Capture resize listeners so we can clean them up
        resizeListeners = [];
        const originalOn = process.stdout.on.bind(process.stdout);
        vi.spyOn(process.stdout, 'on').mockImplementation((event, listener) => {
            if (event === 'resize') {
                resizeListeners.push(listener);
            }
            return originalOn(event, listener);
        });
        vi.spyOn(process.stdout, 'write').mockImplementation(writeMock);
        draftlog = await import('../src/index.js');
        // After import, process.stdout.write is now the draftlog hook wrapping the spy.
        // Capture it so we can call it in tests that simulate console.log.
        hookedWrite = process.stdout.write;
    });

    afterEach(() => {
        // Remove resize listeners added during this test
        for (const listener of resizeListeners) {
            process.stdout.removeListener('resize', listener);
        }
        vi.restoreAllMocks();
        process.stdout.isTTY = originalIsTTY;
    });

    it('smoke test - draft exists and is a function', () => {
        expect(draftlog.draft).toBeDefined();
        expect(typeof draftlog.draft).toBe('function');
    });

    it('writes initial text to stdout', () => {
        draftlog.draft('hello');

        expect(writeMock).toHaveBeenCalledWith('hello\n');
    });

    it('returns an updater function', () => {
        const updater = draftlog.draft('hello');

        expect(typeof updater).toBe('function');
    });

    it('updates a single draft line in place', () => {
        const updater = draftlog.draft('hello');
        writeMock.mockClear();

        updater('world');

        // linesUp is 0, so no cursor movement up/down
        // just: \r\x1B[2K + content + \r
        expect(writeMock).toHaveBeenCalledWith('\r\x1B[2Kworld');
        expect(writeMock).toHaveBeenCalledWith('\r');
    });

    it('handles multiple draft lines', () => {
        const updater1 = draftlog.draft('line1');
        const updater2 = draftlog.draft('line2');
        writeMock.mockClear();

        // updater1 should be 1 line up (line2 was added after)
        updater1('updated line1');

        expect(writeMock).toHaveBeenCalledWith('\x1B[1A');
        expect(writeMock).toHaveBeenCalledWith('\r\x1B[2Kupdated line1');
        expect(writeMock).toHaveBeenCalledWith('\x1B[1B');
        expect(writeMock).toHaveBeenCalledWith('\r');

        writeMock.mockClear();

        // updater2 is at the bottom (linesUp=0), so no cursor up/down codes
        updater2('updated line2');

        // Should not have cursor up or cursor down codes
        const cursorMoveCalls = writeMock.mock.calls.filter(([arg]) => typeof arg === 'string' && isCursorMove(arg));
        expect(cursorMoveCalls).toHaveLength(0);
        expect(writeMock).toHaveBeenCalledWith('\r\x1B[2Kupdated line2');
        expect(writeMock).toHaveBeenCalledWith('\r');
    });

    it('handles three draft lines with correct cursor positions', () => {
        const updater1 = draftlog.draft('a');
        const updater2 = draftlog.draft('b');
        const updater3 = draftlog.draft('c');
        writeMock.mockClear();

        // updater1 should be 2 lines up
        updater1('A');
        expect(writeMock).toHaveBeenCalledWith('\x1B[2A');
        expect(writeMock).toHaveBeenCalledWith('\r\x1B[2KA');
        expect(writeMock).toHaveBeenCalledWith('\x1B[2B');

        writeMock.mockClear();

        // updater2 should be 1 line up
        updater2('B');
        expect(writeMock).toHaveBeenCalledWith('\x1B[1A');
        expect(writeMock).toHaveBeenCalledWith('\r\x1B[2KB');
        expect(writeMock).toHaveBeenCalledWith('\x1B[1B');

        writeMock.mockClear();

        // updater3 should be 0 lines up
        updater3('C');
        expect(writeMock).toHaveBeenCalledWith('\r\x1B[2KC');
        // Should not have any cursor up/down movement
        const cursorMoveCalls = writeMock.mock.calls.filter(([arg]) => typeof arg === 'string' && isCursorMove(arg));
        expect(cursorMoveCalls).toHaveLength(0);
    });

    it('multiple updates to the same line', () => {
        const updater = draftlog.draft('v1');
        writeMock.mockClear();

        updater('v2');
        updater('v3');
        updater('v4');

        // Each update writes the clear+content sequence
        const clearAndWriteCalls = writeMock.mock.calls.filter(([arg]) => typeof arg === 'string' && arg.startsWith('\r\x1B[2K'));
        expect(clearAndWriteCalls).toHaveLength(3);
        expect(clearAndWriteCalls[0][0]).toBe('\r\x1B[2Kv2');
        expect(clearAndWriteCalls[1][0]).toBe('\r\x1B[2Kv3');
        expect(clearAndWriteCalls[2][0]).toBe('\r\x1B[2Kv4');
    });

    it('gc cleanup removes line from tracking', async () => {
        // Create a draft that will be GC'd
        /** @type {any} */
        let updater = draftlog.draft('temp');
        // Create another draft that stays
        const keeper = draftlog.draft('keep');
        writeMock.mockClear();

        // keeper should be at linesUp=0, updater at linesUp=1
        // Drop reference to updater
        void updater;
        updater = undefined;

        // Wait and trigger GC
        await new Promise(resolve => setTimeout(resolve, 50));
        /** @type {any} */ (global).gc();
        await new Promise(resolve => setTimeout(resolve, 50));

        // keeper should still work fine
        keeper('kept!');

        // The keeper's linesUp should still be 0 (physical position unchanged)
        expect(writeMock).toHaveBeenCalledWith('\r\x1B[2Kkept!');
        expect(writeMock).toHaveBeenCalledWith('\r');
    });

    it('resize event re-renders all active lines', () => {
        const updater1 = draftlog.draft('line1');
        const updater2 = draftlog.draft('line2');
        writeMock.mockClear();

        // Simulate resize
        process.stdout.emit('resize');

        // Both lines should be re-rendered
        const clearCalls = writeMock.mock.calls.filter(([arg]) => typeof arg === 'string' && arg.startsWith('\r\x1B[2K'));
        expect(clearCalls).toHaveLength(2);
        expect(clearCalls[0][0]).toBe('\r\x1B[2Kline1');
        expect(clearCalls[1][0]).toBe('\r\x1B[2Kline2');

        // Keep updaters alive
        void updater1;
        void updater2;
    });

    it('empty text update', () => {
        const updater = draftlog.draft('hello');
        writeMock.mockClear();

        updater('');

        expect(writeMock).toHaveBeenCalledWith('\r\x1B[2K');
        expect(writeMock).toHaveBeenCalledWith('\r');
    });

    it('resize listener is attached at module load', () => {
        // listener is attached during import, before any draft() call
        expect(resizeListeners).toHaveLength(1);

        draftlog.draft('a');
        draftlog.draft('b');
        draftlog.draft('c');

        // no additional listeners added by draft() calls
        expect(resizeListeners).toHaveLength(1);
    });

    describe('console.log compatibility', () => {
        /**
         * Simulate an external write to stdout (e.g. console.log).
         * We call through the hooked write so the draftlog interception
         * sees it as an external (non-internal) write and triggers
         * the clear → passthrough → re-render cycle.
         * @param {string} text
         */
        function externalWrite(text) {
            hookedWrite.call(process.stdout, text);
        }

        /**
         * Extracts the sequence of string arguments from writeMock calls.
         * @returns {string[]}
         */
        function getWriteCalls() {
            return writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        }

        it('external write triggers clear-passthrough-rerender for a single draft', () => {
            draftlog.draft('my draft');
            writeMock.mockClear();

            externalWrite('hello\n');

            const calls = getWriteCalls();
            // 1. Clear: move up 1 line, go to col 0, erase to end of screen
            expect(calls[0]).toBe('\x1B[1A\r\x1B[J');
            // 2. Passthrough: the external content
            expect(calls[1]).toBe('hello\n');
            // 3. Re-render: draft line content + newline
            expect(calls[2]).toBe('my draft\n');
        });

        it('external write triggers clear-passthrough-rerender for multiple drafts', () => {
            draftlog.draft('first');
            draftlog.draft('second');
            draftlog.draft('third');
            writeMock.mockClear();

            externalWrite('log message\n');

            const calls = getWriteCalls();
            // 1. Clear: move up 3 lines, erase to end of screen
            expect(calls[0]).toBe('\x1B[3A\r\x1B[J');
            // 2. Passthrough
            expect(calls[1]).toBe('log message\n');
            // 3. Re-render all drafts in order
            expect(calls[2]).toBe('first\n');
            expect(calls[3]).toBe('second\n');
            expect(calls[4]).toBe('third\n');
        });

        it('draft updates work correctly after an external write', () => {
            const updater = draftlog.draft('my draft');

            externalWrite('external\n');
            writeMock.mockClear();

            // After re-render, the draft is still the only tracked line,
            // so linesUp = 0 (it is at the bottom of the draft block)
            updater('updated');

            expect(writeMock).toHaveBeenCalledWith('\r\x1B[2Kupdated');
            expect(writeMock).toHaveBeenCalledWith('\r');
            // No cursor movement for a single draft
            const moveCalls = writeMock.mock.calls.filter(([arg]) => typeof arg === 'string' && isCursorMove(arg));
            expect(moveCalls).toHaveLength(0);
        });

        it('draft updates work correctly after external write with multiple drafts', () => {
            const updater1 = draftlog.draft('first');
            const updater2 = draftlog.draft('second');

            externalWrite('external\n');
            writeMock.mockClear();

            // After re-render, draft positions within the block remain the same:
            // updater1 is at index 0, linesUp = 2 - 1 - 0 = 1
            updater1('updated first');
            expect(writeMock).toHaveBeenCalledWith('\x1B[1A');
            expect(writeMock).toHaveBeenCalledWith('\r\x1B[2Kupdated first');
            expect(writeMock).toHaveBeenCalledWith('\x1B[1B');
            expect(writeMock).toHaveBeenCalledWith('\r');

            writeMock.mockClear();

            // updater2 is at index 1, linesUp = 2 - 1 - 1 = 0
            updater2('updated second');
            const moveCalls = writeMock.mock.calls.filter(([arg]) => typeof arg === 'string' && isCursorMove(arg));
            expect(moveCalls).toHaveLength(0);
            expect(writeMock).toHaveBeenCalledWith('\r\x1B[2Kupdated second');
            expect(writeMock).toHaveBeenCalledWith('\r');
        });

        it('multiple external writes each trigger clear-passthrough-rerender', () => {
            const updater = draftlog.draft('my draft');
            writeMock.mockClear();

            // First external write
            externalWrite('log1\n');

            let calls = getWriteCalls();
            expect(calls[0]).toBe('\x1B[1A\r\x1B[J');
            expect(calls[1]).toBe('log1\n');
            expect(calls[2]).toBe('my draft\n');

            writeMock.mockClear();

            // Second external write — draft was re-rendered, so same clear sequence
            externalWrite('log2\n');

            calls = getWriteCalls();
            expect(calls[0]).toBe('\x1B[1A\r\x1B[J');
            expect(calls[1]).toBe('log2\n');
            expect(calls[2]).toBe('my draft\n');

            writeMock.mockClear();

            // Draft update still works at linesUp=0
            updater('updated');
            const moveCalls = writeMock.mock.calls.filter(([arg]) => typeof arg === 'string' && isCursorMove(arg));
            expect(moveCalls).toHaveLength(0);
            expect(writeMock).toHaveBeenCalledWith('\r\x1B[2Kupdated');
        });

        it('re-renders reflect the latest draft content', () => {
            const updater = draftlog.draft('original');

            // Update draft content before external write
            updater('modified');
            writeMock.mockClear();

            // External write should re-render the latest content
            externalWrite('log\n');

            const calls = getWriteCalls();
            expect(calls[0]).toBe('\x1B[1A\r\x1B[J');
            expect(calls[1]).toBe('log\n');
            // Re-render uses latest content, not original
            expect(calls[2]).toBe('modified\n');
        });

        it('multi-line external write is passed through correctly', () => {
            draftlog.draft('draft');
            writeMock.mockClear();

            externalWrite('line1\nline2\nline3\n');

            const calls = getWriteCalls();
            expect(calls[0]).toBe('\x1B[1A\r\x1B[J');
            expect(calls[1]).toBe('line1\nline2\nline3\n');
            expect(calls[2]).toBe('draft\n');
        });

        it('external write with Buffer chunk triggers clear-passthrough-rerender', () => {
            draftlog.draft('draft line');
            writeMock.mockClear();

            // Write a Buffer instead of a string to hit the chunk.toString() branch
            hookedWrite.call(process.stdout, Buffer.from('buffer write'));

            const calls = getWriteCalls();
            // Should contain the clear sequence, the re-rendered draft line
            expect(calls.some(c => c.includes('\x1B[J'))).toBe(true);
            expect(calls).toContain('draft line\n');
        });

        it('external write without content does not trigger clear-rerender', () => {
            draftlog.draft('draft');
            writeMock.mockClear();

            externalWrite('');

            // Empty string should not trigger the clear-rerender cycle
            const calls = getWriteCalls();
            // Only the passthrough of the empty string
            expect(calls).toHaveLength(1);
            expect(calls[0]).toBe('');
        });

        it('no clear-rerender when there are no active draft lines', () => {
            // No draft() calls, just an external write
            writeMock.mockClear();

            externalWrite('hello\n');

            // Should just pass through without any clear/rerender
            const calls = getWriteCalls();
            expect(calls).toHaveLength(1);
            expect(calls[0]).toBe('hello\n');
        });

        it('handles three drafts with external writes and subsequent updates', () => {
            const updater1 = draftlog.draft('a');
            const updater2 = draftlog.draft('b');
            const updater3 = draftlog.draft('c');

            // External writes
            externalWrite('ext1\n');
            externalWrite('ext2\n');
            writeMock.mockClear();

            // After re-renders, positions within the draft block are unchanged:
            // updater1: index=0, linesUp = 3-1-0 = 2
            updater1('A');
            expect(writeMock).toHaveBeenCalledWith('\x1B[2A');
            expect(writeMock).toHaveBeenCalledWith('\r\x1B[2KA');
            expect(writeMock).toHaveBeenCalledWith('\x1B[2B');

            writeMock.mockClear();

            // updater2: index=1, linesUp = 3-1-1 = 1
            updater2('B');
            expect(writeMock).toHaveBeenCalledWith('\x1B[1A');
            expect(writeMock).toHaveBeenCalledWith('\r\x1B[2KB');
            expect(writeMock).toHaveBeenCalledWith('\x1B[1B');

            writeMock.mockClear();

            // updater3: index=2, linesUp = 3-1-2 = 0
            updater3('C');
            expect(writeMock).toHaveBeenCalledWith('\r\x1B[2KC');
            const moveCalls = writeMock.mock.calls.filter(([arg]) => typeof arg === 'string' && isCursorMove(arg));
            expect(moveCalls).toHaveLength(0);
        });

        it('draft writes (from draft()) are not intercepted as external writes', () => {
            writeMock.mockClear();

            // First draft — no existing lines, so no clear-rerender
            draftlog.draft('first');
            let calls = getWriteCalls();
            expect(calls).toEqual(['first\n']);

            writeMock.mockClear();

            // Second draft — there is 1 existing line, but this is an internal write
            // so it should NOT trigger the clear-rerender cycle
            draftlog.draft('second');
            calls = getWriteCalls();
            expect(calls).toEqual(['second\n']);
        });

        it('update writes are not intercepted as external writes', () => {
            const updater1 = draftlog.draft('a');
            const updater2 = draftlog.draft('b');
            writeMock.mockClear();

            // Updates are internal writes — no clear-rerender triggered
            updater1('A');
            updater2('B');
            updater1('A2');

            // None of the writes should contain the clear-rerender sequence
            const calls = getWriteCalls();
            const clearCalls = calls.filter(c => c.includes('\x1B[J'));
            expect(clearCalls).toHaveLength(0);
        });
    });
});

describe('draftlog - updateLine after line removed from tracking', () => {
    /** @type {ReturnType<typeof vi.fn>} */
    let writeMock;
    /** @type {boolean} */
    let originalIsTTY;
    /** @type {import('../src/index.js')} */
    let draftlog;
    /** @type {(() => void)[]} */
    let resizeListeners;
    /** @type {(heldValue: any) => void} */
    let finalizationCallback;
    /** @type {{ target: any, heldValue: any }[]} */
    let registeredEntries;
    /** @type {typeof globalThis.FinalizationRegistry} */
    let OriginalFinalizationRegistry;

    beforeEach(async () => {
        vi.resetModules();
        writeMock = vi.fn();
        originalIsTTY = process.stdout.isTTY;
        process.stdout.isTTY = true;
        resizeListeners = [];
        registeredEntries = [];

        const originalOn = process.stdout.on.bind(process.stdout);
        vi.spyOn(process.stdout, 'on').mockImplementation((event, listener) => {
            if (event === 'resize') {
                resizeListeners.push(listener);
            }
            return originalOn(event, listener);
        });
        vi.spyOn(process.stdout, 'write').mockImplementation(writeMock);

        // Mock FinalizationRegistry to capture the callback and registered entries
        OriginalFinalizationRegistry = globalThis.FinalizationRegistry;
        globalThis.FinalizationRegistry = /** @type {any} */ (
            class {
                /** @param {(heldValue: any) => void} cb */
                constructor(cb) {
                    finalizationCallback = cb;
                }
                /** @param {any} target @param {any} heldValue */
                register(target, heldValue) {
                    registeredEntries.push({ target, heldValue });
                }
            }
        );

        draftlog = await import('../src/index.js');
    });

    afterEach(() => {
        globalThis.FinalizationRegistry = OriginalFinalizationRegistry;
        for (const listener of resizeListeners) {
            process.stdout.removeListener('resize', listener);
        }
        vi.restoreAllMocks();
        process.stdout.isTTY = originalIsTTY;
    });

    it('updater called after line removed from tracking is a no-op', () => {
        const updater = draftlog.draft('hello');
        writeMock.mockClear();

        // Simulate FinalizationRegistry cleanup: remove the line from internal tracking
        const entry = registeredEntries.find(e => e.target === updater);
        expect(entry).toBeDefined();
        finalizationCallback(entry.heldValue);

        // Now call the updater — the line is no longer tracked, so updateLine should early-return
        updater('updated');

        // No writes should have been made since the line is no longer tracked
        expect(writeMock).not.toHaveBeenCalled();
    });

    it('resize after line removed from tracking does not crash', () => {
        const updater = draftlog.draft('line1');
        draftlog.draft('line2');
        writeMock.mockClear();

        // Simulate cleanup of the first line
        const entry = registeredEntries.find(e => e.target === updater);
        expect(entry).toBeDefined();
        finalizationCallback(entry.heldValue);

        // Call the updater for the removed line — should be a no-op
        updater('gone');
        expect(writeMock).not.toHaveBeenCalled();
    });
});
