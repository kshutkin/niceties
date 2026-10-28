import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function flushTicks() {
    await new Promise(resolve => process.nextTick(resolve));
}

const CURSOR_HIDE = '\x1B[?25l';
const CURSOR_SHOW = '\x1B[?25h';
const SYNC_ENABLE = '\x1B[?2026h';
const SYNC_DISABLE = '\x1B[?2026l';

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

    it('updates a single draft line in place', async () => {
        const updater = draftlog.draft('hello');
        writeMock.mockClear();

        updater('world');
        await flushTicks();

        // Batched update: sync enable, move up 1 row + erase to end, rewrite, sync disable
        expect(writeMock).toHaveBeenCalledWith(SYNC_ENABLE);
        expect(writeMock).toHaveBeenCalledWith('\x1B[1A\r\x1B[J');
        expect(writeMock).toHaveBeenCalledWith('world\n');
        expect(writeMock).toHaveBeenCalledWith(SYNC_DISABLE);
    });

    it('handles multiple draft lines', async () => {
        const updater1 = draftlog.draft('line1');
        const updater2 = draftlog.draft('line2');
        writeMock.mockClear();

        // updater1 updates content; batched flush rewrites all lines
        updater1('updated line1');
        await flushTicks();

        expect(writeMock).toHaveBeenCalledWith('\x1B[2A\r\x1B[J');
        expect(writeMock).toHaveBeenCalledWith('updated line1\n');
        expect(writeMock).toHaveBeenCalledWith('line2\n');

        writeMock.mockClear();

        // updater2 updates content; batched flush rewrites all lines
        updater2('updated line2');
        await flushTicks();

        expect(writeMock).toHaveBeenCalledWith('\x1B[2A\r\x1B[J');
        expect(writeMock).toHaveBeenCalledWith('updated line1\n');
        expect(writeMock).toHaveBeenCalledWith('updated line2\n');
    });

    it('handles three draft lines with correct cursor positions', async () => {
        const updater1 = draftlog.draft('a');
        const updater2 = draftlog.draft('b');
        const updater3 = draftlog.draft('c');
        writeMock.mockClear();

        // Update first line; batch flush rewrites all 3
        updater1('A');
        await flushTicks();
        expect(writeMock).toHaveBeenCalledWith('\x1B[3A\r\x1B[J');
        expect(writeMock).toHaveBeenCalledWith('A\n');
        expect(writeMock).toHaveBeenCalledWith('b\n');
        expect(writeMock).toHaveBeenCalledWith('c\n');

        writeMock.mockClear();

        // Update second line
        updater2('B');
        await flushTicks();
        expect(writeMock).toHaveBeenCalledWith('\x1B[3A\r\x1B[J');
        expect(writeMock).toHaveBeenCalledWith('A\n');
        expect(writeMock).toHaveBeenCalledWith('B\n');
        expect(writeMock).toHaveBeenCalledWith('c\n');

        writeMock.mockClear();

        // Update third line
        updater3('C');
        await flushTicks();
        expect(writeMock).toHaveBeenCalledWith('\x1B[3A\r\x1B[J');
        expect(writeMock).toHaveBeenCalledWith('A\n');
        expect(writeMock).toHaveBeenCalledWith('B\n');
        expect(writeMock).toHaveBeenCalledWith('C\n');
    });

    it('multiple updates to the same line', async () => {
        const updater = draftlog.draft('v1');
        writeMock.mockClear();

        updater('v2');
        updater('v3');
        updater('v4');
        await flushTicks();

        // Only one batched flush with the final value
        expect(writeMock).toHaveBeenCalledWith('v4\n');
        // Intermediate values should not appear
        const intermediateWrites = writeMock.mock.calls.filter(([arg]) => arg === 'v2\n' || arg === 'v3\n');
        expect(intermediateWrites).toHaveLength(0);
    });

    describe('draft height changes', () => {
        let originalColumns;
        let originalRows;

        beforeEach(() => {
            originalColumns = process.stdout.columns;
            originalRows = process.stdout.rows;
            process.stdout.columns = 80;
            process.stdout.rows = 24;
        });

        afterEach(() => {
            process.stdout.columns = originalColumns;
            process.stdout.rows = originalRows;
        });

        it.each([
            ['growing wrapped text', 'short', 'X'.repeat(161), 1, 3],
            ['shrinking wrapped text', 'X'.repeat(161), 'short', 3, 1],
            ['growing multiline text', 'short', 'first\n\nthird\n', 1, 4],
            ['shrinking multiline text', 'first\n\nthird\n', 'short', 4, 1],
            ['shrinking colored wide text', `\x1B[31m${'界'.repeat(81)}\x1B[39m`, 'short', 3, 1],
        ])('clears the previously displayed rows when %s', async (_name, initial, updated, previousRows, nextRows) => {
            const update = draftlog.draft(initial);
            writeMock.mockClear();

            update(updated);
            await flushTicks();

            expect(writeMock.mock.calls).toEqual([[SYNC_ENABLE], [`\x1B[${previousRows}A\r\x1B[J`], [`${updated}\n`], [SYNC_DISABLE]]);

            writeMock.mockClear();
            update('done');
            await flushTicks();

            expect(writeMock).toHaveBeenCalledWith(`\x1B[${nextRows}A\r\x1B[J`);
        });

        it('uses the displayed height when multiple draft updates are batched', async () => {
            const first = draftlog.draft('first');
            const second = draftlog.draft('second');
            writeMock.mockClear();

            first('X'.repeat(801));
            first('X'.repeat(161));
            second('Y'.repeat(81));
            await flushTicks();

            expect(writeMock.mock.calls).toEqual([
                [SYNC_ENABLE],
                ['\x1B[2A\r\x1B[J'],
                [`${'X'.repeat(161)}\n`],
                [`${'Y'.repeat(81)}\n`],
                [SYNC_DISABLE],
            ]);

            writeMock.mockClear();
            first('done');
            await flushTicks();
            expect(writeMock).toHaveBeenCalledWith('\x1B[5A\r\x1B[J');
        });

        it('updates the displayed height when an external write flushes a pending update', async () => {
            const update = draftlog.draft('short');
            writeMock.mockClear();

            update('X'.repeat(161));
            hookedWrite.call(process.stdout, 'external\n');
            expect(writeMock).toHaveBeenCalledWith('\x1B[1A\r\x1B[J');

            writeMock.mockClear();
            await flushTicks();
            expect(writeMock).toHaveBeenCalledWith('\x1B[3A\r\x1B[J');

            writeMock.mockClear();
            hookedWrite.call(process.stdout, 'another external\n');
            expect(writeMock).toHaveBeenCalledWith('\x1B[3A\r\x1B[J');
        });

        it('renders a growing draft even when its new height exceeds the viewport', async () => {
            process.stdout.rows = 3;
            const update = draftlog.draft('short');
            writeMock.mockClear();

            update('X'.repeat(161));
            await flushTicks();

            expect(writeMock).toHaveBeenCalledWith('\x1B[1A\r\x1B[J');
            expect(writeMock).toHaveBeenCalledWith(`${'X'.repeat(161)}\n`);
        });

        it.each([
            ['wrapped text', 'X'.repeat(161)],
            ['multiline text with a blank line', `${'X'.repeat(81)}\n\nY`],
            ['colored wide text', `\x1B[31m${'界'.repeat(81)}\x1B[39m`],
        ])('measures displayed %s at the new width when resized with a pending update', async (_name, initial) => {
            const update = draftlog.draft(initial);
            writeMock.mockClear();

            update('short');
            process.stdout.columns = 40;
            process.stdout.emit('resize');
            await flushTicks();

            expect(writeMock).toHaveBeenCalledWith('\x1B[5A\r\x1B[J');
            expect(writeMock).toHaveBeenCalledWith('short\n');
        });
    });

    it('keeps active drafts updateable after another updater is collected', async () => {
        // Create a draft that will be GC'd
        /** @type {any} */
        let updater = draftlog.draft('temp');
        // Create another draft that stays
        const keeper = draftlog.draft('keep');
        writeMock.mockClear();

        // Drop reference to updater
        void updater;
        updater = undefined;

        // Wait and trigger GC
        await new Promise(resolve => setTimeout(resolve, 50));
        /** @type {any} */ (global).gc();
        await new Promise(resolve => setTimeout(resolve, 50));

        // keeper should still work fine
        keeper('kept!');
        await flushTicks();

        // The batched flush rewrites remaining lines
        expect(writeMock).toHaveBeenCalledWith('kept!\n');
    });

    it('resize event re-renders all active lines', async () => {
        const updater1 = draftlog.draft('line1');
        const updater2 = draftlog.draft('line2');
        writeMock.mockClear();

        // Simulate resize
        process.stdout.emit('resize');
        await flushTicks();

        // Both lines should be re-rendered in one batch
        expect(writeMock).toHaveBeenCalledWith('line1\n');
        expect(writeMock).toHaveBeenCalledWith('line2\n');

        // Keep updaters alive
        void updater1;
        void updater2;
    });

    it('empty text update', async () => {
        const updater = draftlog.draft('hello');
        writeMock.mockClear();

        updater('');
        await flushTicks();

        expect(writeMock).toHaveBeenCalledWith('\n');
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

    it('hides cursor when first draft is created', () => {
        writeMock.mockClear();

        draftlog.draft('hello');

        const calls = writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        expect(calls).toContain(CURSOR_HIDE);
    });

    it('does not hide cursor again for subsequent drafts', () => {
        draftlog.draft('first');
        writeMock.mockClear();

        draftlog.draft('second');

        const calls = writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        expect(calls).not.toContain(CURSOR_HIDE);
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
            // 1. Sync enable
            expect(calls[0]).toBe(SYNC_ENABLE);
            // 2. Clear: move up 1 row, go to col 0, erase to end of screen
            expect(calls[1]).toBe('\x1B[1A\r\x1B[J');
            // 3. Passthrough: the external content
            expect(calls[2]).toBe('hello\n');
            // 4. Re-render: draft line content + newline
            expect(calls[3]).toBe('my draft\n');
            // 5. Sync disable
            expect(calls[4]).toBe(SYNC_DISABLE);
        });

        it('external write triggers clear-passthrough-rerender for multiple drafts', () => {
            draftlog.draft('first');
            draftlog.draft('second');
            draftlog.draft('third');
            writeMock.mockClear();

            externalWrite('log message\n');

            const calls = getWriteCalls();
            // 1. Sync enable
            expect(calls[0]).toBe(SYNC_ENABLE);
            // 2. Clear: move up 3 rows, erase to end of screen
            expect(calls[1]).toBe('\x1B[3A\r\x1B[J');
            // 3. Passthrough
            expect(calls[2]).toBe('log message\n');
            // 4. Re-render all drafts in order
            expect(calls[3]).toBe('first\n');
            expect(calls[4]).toBe('second\n');
            expect(calls[5]).toBe('third\n');
            // 6. Sync disable
            expect(calls[6]).toBe(SYNC_DISABLE);
        });

        it('draft updates work correctly after an external write', async () => {
            const updater = draftlog.draft('my draft');

            externalWrite('external\n');
            writeMock.mockClear();

            updater('updated');
            await flushTicks();

            // Batched flush: move up 1 row + erase, rewrite the single line
            expect(writeMock).toHaveBeenCalledWith('\x1B[1A\r\x1B[J');
            expect(writeMock).toHaveBeenCalledWith('updated\n');
        });

        it('draft updates work correctly after external write with multiple drafts', async () => {
            const updater1 = draftlog.draft('first');
            const updater2 = draftlog.draft('second');

            externalWrite('external\n');
            writeMock.mockClear();

            // Update first line
            updater1('updated first');
            await flushTicks();

            expect(writeMock).toHaveBeenCalledWith('\x1B[2A\r\x1B[J');
            expect(writeMock).toHaveBeenCalledWith('updated first\n');
            expect(writeMock).toHaveBeenCalledWith('second\n');

            writeMock.mockClear();

            // Update second line
            updater2('updated second');
            await flushTicks();

            expect(writeMock).toHaveBeenCalledWith('\x1B[2A\r\x1B[J');
            expect(writeMock).toHaveBeenCalledWith('updated first\n');
            expect(writeMock).toHaveBeenCalledWith('updated second\n');
        });

        it('multiple external writes each trigger clear-passthrough-rerender', async () => {
            const updater = draftlog.draft('my draft');
            writeMock.mockClear();

            // First external write
            externalWrite('log1\n');

            let calls = getWriteCalls();
            expect(calls[0]).toBe(SYNC_ENABLE);
            expect(calls[1]).toBe('\x1B[1A\r\x1B[J');
            expect(calls[2]).toBe('log1\n');
            expect(calls[3]).toBe('my draft\n');
            expect(calls[4]).toBe(SYNC_DISABLE);

            writeMock.mockClear();

            // Second external write - draft was re-rendered, so same clear sequence
            externalWrite('log2\n');

            calls = getWriteCalls();
            expect(calls[0]).toBe(SYNC_ENABLE);
            expect(calls[1]).toBe('\x1B[1A\r\x1B[J');
            expect(calls[2]).toBe('log2\n');
            expect(calls[3]).toBe('my draft\n');
            expect(calls[4]).toBe(SYNC_DISABLE);

            writeMock.mockClear();

            // Draft update still works via batched flush
            updater('updated');
            await flushTicks();

            expect(writeMock).toHaveBeenCalledWith('updated\n');
        });

        it('re-renders reflect the latest draft content', async () => {
            const updater = draftlog.draft('original');

            // Update draft content before external write
            updater('modified');
            writeMock.mockClear();

            // External write should re-render the latest content
            externalWrite('log\n');

            const calls = getWriteCalls();
            expect(calls[0]).toBe(SYNC_ENABLE);
            expect(calls[1]).toBe('\x1B[1A\r\x1B[J');
            expect(calls[2]).toBe('log\n');
            // Re-render uses latest content, not original
            expect(calls[3]).toBe('modified\n');
            expect(calls[4]).toBe(SYNC_DISABLE);
        });

        it('multi-line external write is passed through correctly', () => {
            draftlog.draft('draft');
            writeMock.mockClear();

            externalWrite('line1\nline2\nline3\n');

            const calls = getWriteCalls();
            expect(calls[0]).toBe(SYNC_ENABLE);
            expect(calls[1]).toBe('\x1B[1A\r\x1B[J');
            expect(calls[2]).toBe('line1\nline2\nline3\n');
            expect(calls[3]).toBe('draft\n');
            expect(calls[4]).toBe(SYNC_DISABLE);
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

        it('handles three drafts with external writes and subsequent updates', async () => {
            const updater1 = draftlog.draft('a');
            const updater2 = draftlog.draft('b');
            const updater3 = draftlog.draft('c');

            // External writes
            externalWrite('ext1\n');
            externalWrite('ext2\n');
            writeMock.mockClear();

            // Update first line; batched flush rewrites all 3
            updater1('A');
            await flushTicks();
            expect(writeMock).toHaveBeenCalledWith('\x1B[3A\r\x1B[J');
            expect(writeMock).toHaveBeenCalledWith('A\n');
            expect(writeMock).toHaveBeenCalledWith('b\n');
            expect(writeMock).toHaveBeenCalledWith('c\n');

            writeMock.mockClear();

            // Update second line
            updater2('B');
            await flushTicks();
            expect(writeMock).toHaveBeenCalledWith('\x1B[3A\r\x1B[J');
            expect(writeMock).toHaveBeenCalledWith('A\n');
            expect(writeMock).toHaveBeenCalledWith('B\n');
            expect(writeMock).toHaveBeenCalledWith('c\n');

            writeMock.mockClear();

            // Update third line
            updater3('C');
            await flushTicks();
            expect(writeMock).toHaveBeenCalledWith('\x1B[3A\r\x1B[J');
            expect(writeMock).toHaveBeenCalledWith('A\n');
            expect(writeMock).toHaveBeenCalledWith('B\n');
            expect(writeMock).toHaveBeenCalledWith('C\n');
        });

        it('draft writes (from draft()) are not intercepted as external writes', () => {
            writeMock.mockClear();

            // First draft - no existing lines, so no clear-rerender
            draftlog.draft('first');
            let calls = getWriteCalls();
            // Should have the initial text write and cursor hide
            expect(calls).toContain('first\n');
            expect(calls).toContain(CURSOR_HIDE);
            // No erase-to-end-of-screen sequence (which would indicate interception)
            expect(calls.filter(c => c.includes('\x1B[J'))).toHaveLength(0);

            writeMock.mockClear();

            // Second draft - there is 1 existing line, but this is an internal write
            // so it should NOT trigger the clear-rerender cycle
            draftlog.draft('second');
            calls = getWriteCalls();
            expect(calls).toEqual(['second\n']);
        });

        it('update writes are not intercepted as external writes', async () => {
            const updater1 = draftlog.draft('a');
            const updater2 = draftlog.draft('b');
            writeMock.mockClear();

            // Updates are batched - no immediate writes
            updater1('A');
            updater2('B');
            updater1('A2');

            // No writes yet (all deferred to nextTick)
            expect(writeMock).not.toHaveBeenCalled();

            await flushTicks();

            // After flush: should be exactly one flushUpdates sequence
            // (sync enable, cursor up + erase, content lines, sync disable)
            // and NOT a nested clear-passthrough-rerender cycle
            const calls = getWriteCalls();
            expect(calls).toEqual([SYNC_ENABLE, '\x1B[2A\r\x1B[J', 'A2\n', 'B\n', SYNC_DISABLE]);
        });
    });
});

describe('draftlog - collected drafts', () => {
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
    let originalColumns;
    let originalRows;

    beforeEach(async () => {
        vi.resetModules();
        writeMock = vi.fn();
        originalIsTTY = process.stdout.isTTY;
        originalColumns = process.stdout.columns;
        originalRows = process.stdout.rows;
        process.stdout.isTTY = true;
        process.stdout.columns = 80;
        process.stdout.rows = 24;
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
        process.stdout.columns = originalColumns;
        process.stdout.rows = originalRows;
    });

    /** @param {(text: string) => void} updater */
    function collect(updater) {
        const entry = registeredEntries.find(e => e.target === updater);
        expect(entry).toBeDefined();
        finalizationCallback(entry.heldValue);
    }

    it.each([0, 1, 2])('preserves text and row positions when draft %i is collected', async collectedIndex => {
        const texts = ['first', 'second', 'third'];
        const updaters = texts.map(text => draftlog.draft(text));
        collect(updaters[collectedIndex]);
        writeMock.mockClear();

        const updatedIndex = collectedIndex === 0 ? 1 : 0;
        updaters[updatedIndex]('UPDATED');
        texts[updatedIndex] = 'UPDATED';
        await flushTicks();

        expect(writeMock.mock.calls).toEqual([[SYNC_ENABLE], ['\x1B[3A\r\x1B[J'], ...texts.map(text => [`${text}\n`]), [SYNC_DISABLE]]);
    });

    it.each(['X'.repeat(161), 'first\n\nthird'])('reserves all rows occupied by a collected draft: %j', async text => {
        const update = draftlog.draft('active');
        const retired = draftlog.draft(text);
        collect(retired);
        writeMock.mockClear();

        update('UPDATED');
        await flushTicks();

        expect(writeMock.mock.calls).toEqual([[SYNC_ENABLE], ['\x1B[4A\r\x1B[J'], ['UPDATED\n'], [`${text}\n`], [SYNC_DISABLE]]);
    });

    it('preserves collected rows around active drafts during external writes', () => {
        draftlog.draft('first');
        const retired = draftlog.draft('second');
        draftlog.draft('third');
        collect(retired);
        writeMock.mockClear();

        process.stdout.write('external\n');

        expect(writeMock.mock.calls).toEqual([
            [SYNC_ENABLE],
            ['\x1B[3A\r\x1B[J'],
            ['external\n'],
            ['first\n'],
            ['second\n'],
            ['third\n'],
            [SYNC_DISABLE],
        ]);
    });

    it('retains the latest pending text when an updater is collected before the flush', async () => {
        const update = draftlog.draft('active');
        const retired = draftlog.draft('old');
        retired('latest');
        collect(retired);
        writeMock.mockClear();

        update('UPDATED');
        await flushTicks();

        expect(writeMock.mock.calls).toEqual([[SYNC_ENABLE], ['\x1B[2A\r\x1B[J'], ['UPDATED\n'], ['latest\n'], [SYNC_DISABLE]]);
    });

    it('does not bring collected drafts back after they scroll off screen', async () => {
        process.stdout.rows = 3;
        const retired = draftlog.draft('retired');
        collect(retired);
        const first = draftlog.draft('first');
        draftlog.draft('second');
        writeMock.mockClear();

        process.stdout.rows = 24;
        first('UPDATED');
        await flushTicks();

        expect(writeMock.mock.calls).toEqual([[SYNC_ENABLE], ['\x1B[2A\r\x1B[J'], ['UPDATED\n'], ['second\n'], [SYNC_DISABLE]]);
    });

    it('retains partially visible collected drafts until all their rows scroll off screen', async () => {
        process.stdout.rows = 3;
        const retired = draftlog.draft('retired\nsecond row');
        collect(retired);
        const first = draftlog.draft('first');
        writeMock.mockClear();

        process.stdout.rows = 24;
        first('UPDATED');
        await flushTicks();
        expect(writeMock.mock.calls).toEqual([
            [SYNC_ENABLE],
            ['\x1B[3A\r\x1B[J'],
            ['retired\nsecond row\n'],
            ['UPDATED\n'],
            [SYNC_DISABLE],
        ]);

        process.stdout.rows = 3;
        draftlog.draft('second');
        writeMock.mockClear();
        process.stdout.rows = 24;
        first('DONE');
        await flushTicks();
        expect(writeMock.mock.calls).toEqual([[SYNC_ENABLE], ['\x1B[2A\r\x1B[J'], ['DONE\n'], ['second\n'], [SYNC_DISABLE]]);
    });

    it('discards collected rows pushed off screen by a growing active draft', async () => {
        process.stdout.rows = 4;
        const retired = draftlog.draft('retired');
        collect(retired);
        const update = draftlog.draft('active');
        update('X'.repeat(161));
        await flushTicks();
        writeMock.mockClear();

        process.stdout.rows = 24;
        update('done');
        await flushTicks();

        expect(writeMock.mock.calls).toEqual([[SYNC_ENABLE], ['\x1B[3A\r\x1B[J'], ['done\n'], [SYNC_DISABLE]]);
    });

    it('updater called after collection is a no-op', async () => {
        const updater = draftlog.draft('hello');
        writeMock.mockClear();

        // Simulate collection while retaining the updater to exercise the guard.
        const entry = registeredEntries.find(e => e.target === updater);
        expect(entry).toBeDefined();
        finalizationCallback(entry.heldValue);

        // No active drafts remain, so the cursor is restored.
        const showCursorCalls = writeMock.mock.calls.filter(([arg]) => typeof arg === 'string' && arg === CURSOR_SHOW);
        expect(showCursorCalls).toHaveLength(1);

        writeMock.mockClear();

        // Collected drafts retain their text and cannot be updated.
        updater('updated');
        await flushTicks();

        expect(writeMock).not.toHaveBeenCalled();
    });

    it('hides the cursor for a new active draft while retaining earlier static text', async () => {
        const retired = draftlog.draft('retired');
        collect(retired);
        writeMock.mockClear();

        const update = draftlog.draft('active');
        expect(writeMock.mock.calls).toEqual([['active\n'], [CURSOR_HIDE]]);
        writeMock.mockClear();
        update('UPDATED');
        await flushTicks();
        expect(writeMock.mock.calls).toEqual([[SYNC_ENABLE], ['\x1B[2A\r\x1B[J'], ['retired\n'], ['UPDATED\n'], [SYNC_DISABLE]]);
    });

    it('ignores late collection of an offscreen draft when counting active updaters', () => {
        process.stdout.rows = 2;
        const offscreen = draftlog.draft('offscreen');
        const active = draftlog.draft('active');
        writeMock.mockClear();

        collect(offscreen);
        expect(writeMock).not.toHaveBeenCalled();
        collect(active);
        collect(active);
        expect(writeMock.mock.calls).toEqual([[CURSOR_SHOW]]);
    });

    it('resize preserves collected text alongside active drafts', async () => {
        const updater = draftlog.draft('line1');
        draftlog.draft('line2');
        writeMock.mockClear();

        // Simulate collection of the first line.
        const entry = registeredEntries.find(e => e.target === updater);
        expect(entry).toBeDefined();
        finalizationCallback(entry.heldValue);

        // Trigger a resize with both physical rows still on screen.
        writeMock.mockClear();
        for (const listener of resizeListeners) {
            listener();
        }
        await flushTicks();

        expect(writeMock.mock.calls).toEqual([[SYNC_ENABLE], ['\x1B[2A\r\x1B[J'], ['line1\n'], ['line2\n'], [SYNC_DISABLE]]);
    });

    it('shows cursor when the last active updater is collected', () => {
        const updater = draftlog.draft('only');
        writeMock.mockClear();

        // Simulate finalization of the only line
        const entry = registeredEntries.find(e => e.target === updater);
        expect(entry).toBeDefined();
        finalizationCallback(entry.heldValue);

        expect(writeMock).toHaveBeenCalledWith(CURSOR_SHOW);
    });

    it('does not show cursor while another active updater remains', () => {
        const updater1 = draftlog.draft('line1');
        draftlog.draft('line2');
        writeMock.mockClear();

        // Simulate finalization of the first line (one still remains)
        const entry = registeredEntries.find(e => e.target === updater1);
        expect(entry).toBeDefined();
        finalizationCallback(entry.heldValue);

        const showCursorCalls = writeMock.mock.calls.filter(([arg]) => typeof arg === 'string' && arg === CURSOR_SHOW);
        expect(showCursorCalls).toHaveLength(0);
    });
});

describe('draftlog - non-TTY', () => {
    /** @type {ReturnType<typeof vi.fn>} */
    let writeMock;
    /** @type {boolean} */
    let originalIsTTY;
    /** @type {import('../src/index.js')} */
    let draftlog;

    beforeEach(async () => {
        vi.resetModules();
        writeMock = vi.fn();
        originalIsTTY = process.stdout.isTTY;
        process.stdout.isTTY = /** @type {any} */ (false);
        vi.spyOn(process.stdout, 'write').mockImplementation(writeMock);
        draftlog = await import('../src/index.js');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        process.stdout.isTTY = originalIsTTY;
    });

    it('draft exists and is a function', () => {
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

    it('updater writes new line to stdout', () => {
        const updater = draftlog.draft('hello');
        writeMock.mockClear();

        updater('updated');
        expect(writeMock).toHaveBeenCalledWith('updated\n');
    });

    it('does not emit any ANSI escape sequences', () => {
        const updater = draftlog.draft('hello');
        updater('world');

        const allWrites = writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        for (const write of allWrites) {
            expect(write).not.toContain('\x1B');
        }
    });

    it('does not intercept external writes', () => {
        draftlog.draft('draft line');
        writeMock.mockClear();

        // stdout.write should not have been overridden - calling the mock directly
        // simulates an external write; it should go straight through with no extras
        process.stdout.write('external\n');

        const calls = writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        expect(calls).toEqual(['external\n']);
    });

    it('multiple drafts each print their own line', () => {
        draftlog.draft('first');
        draftlog.draft('second');
        draftlog.draft('third');

        const calls = writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        expect(calls).toEqual(['first\n', 'second\n', 'third\n']);
    });

    it('multiple updates each print a new line', () => {
        const updater = draftlog.draft('v1');
        writeMock.mockClear();

        updater('v2');
        updater('v3');
        updater('v4');

        const calls = writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        expect(calls).toEqual(['v2\n', 'v3\n', 'v4\n']);
    });
});

describe('draftlog - viewport overflow', () => {
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
    /** @type {number | undefined} */
    let originalRows;

    beforeEach(async () => {
        vi.resetModules();
        writeMock = vi.fn();
        originalIsTTY = process.stdout.isTTY;
        originalRows = process.stdout.rows;
        process.stdout.isTTY = true;
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
        hookedWrite = process.stdout.write;
    });

    afterEach(() => {
        for (const listener of resizeListeners) {
            process.stdout.removeListener('resize', listener);
        }
        vi.restoreAllMocks();
        process.stdout.isTTY = originalIsTTY;
        process.stdout.rows = originalRows;
    });

    it('external writes pass through when all drafts have scrolled off screen', () => {
        // rows=1 means maxRows=0, so no draft line fits in the viewport
        process.stdout.rows = 1;

        draftlog.draft('offscreen');
        writeMock.mockClear();

        hookedWrite.call(process.stdout, 'external\n');

        const calls = writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        expect(calls).toEqual(['external\n']);
    });

    it('computeVisibleDraft breaks when lines exceed viewport (only last line rendered)', async () => {
        // rows=2 means maxRows=1, so only 1 draft row fits
        process.stdout.rows = 2;

        draftlog.draft('first');
        draftlog.draft('second');
        writeMock.mockClear();

        // External write triggers re-render with only the visible (last) line
        hookedWrite.call(process.stdout, 'log\n');

        const calls = writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        // Only the second (last) draft line should be re-rendered
        expect(calls).toContain('second\n');
        expect(calls).not.toContain('first\n');
        // Should move up 1 row (only 1 visible line)
        expect(calls).toContain('\x1B[1A\r\x1B[J');
    });

    it('flushUpdates returns early when rowCount is 0', async () => {
        // rows=1 means maxRows=0, no lines fit
        process.stdout.rows = 1;

        const updater = draftlog.draft('hello');
        writeMock.mockClear();

        // Schedule an update - flushUpdates should return early because rowCount=0
        updater('updated');
        await new Promise(resolve => process.nextTick(resolve));

        // No sync/render writes should have occurred (early return)
        const calls = writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        expect(calls).toHaveLength(0);
    });

    it('offscreen updaters stop redrawing while visible drafts remain updateable', async () => {
        // rows=3 means maxRows=2, so only 2 of 3 lines fit
        process.stdout.rows = 3;

        const updater1 = draftlog.draft('a');
        const updater2 = draftlog.draft('b');
        draftlog.draft('c');
        writeMock.mockClear();

        updater1('A');
        await new Promise(resolve => process.nextTick(resolve));

        expect(writeMock).not.toHaveBeenCalled();

        updater2('B');
        await flushTicks();
        const calls = writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        // Only last 2 lines should be rendered (b and c), first line scrolled off
        expect(calls).toContain('B\n');
        expect(calls).toContain('c\n');
        expect(calls).not.toContain('A\n');
        expect(calls).not.toContain('a\n');
    });
});

describe('draftlog - exit handler', () => {
    /** @type {ReturnType<typeof vi.fn>} */
    let writeMock;
    /** @type {boolean} */
    let originalIsTTY;
    /** @type {import('../src/index.js')} */
    let draftlog;
    /** @type {(() => void)[]} */
    let resizeListeners;
    /** @type {(() => void)[]} */
    let exitListeners;

    beforeEach(async () => {
        vi.resetModules();
        writeMock = vi.fn();
        originalIsTTY = process.stdout.isTTY;
        process.stdout.isTTY = true;
        resizeListeners = [];
        exitListeners = [];
        const originalStdoutOn = process.stdout.on.bind(process.stdout);
        vi.spyOn(process.stdout, 'on').mockImplementation((event, listener) => {
            if (event === 'resize') {
                resizeListeners.push(listener);
            }
            return originalStdoutOn(event, listener);
        });
        const originalProcessOn = process.on.bind(process);
        vi.spyOn(process, 'on').mockImplementation((event, listener) => {
            if (event === 'exit') {
                exitListeners.push(/** @type {() => void} */ (listener));
            }
            return originalProcessOn(event, listener);
        });
        vi.spyOn(process.stdout, 'write').mockImplementation(writeMock);
        draftlog = await import('../src/index.js');
    });

    afterEach(() => {
        for (const listener of resizeListeners) {
            process.stdout.removeListener('resize', listener);
        }
        for (const listener of exitListeners) {
            process.removeListener('exit', listener);
        }
        vi.restoreAllMocks();
        process.stdout.isTTY = originalIsTTY;
    });

    it('exit handler shows cursor when draft lines are active', () => {
        draftlog.draft('active line');
        writeMock.mockClear();

        // Invoke the captured exit listener
        expect(exitListeners.length).toBeGreaterThan(0);
        for (const listener of exitListeners) {
            listener();
        }

        const calls = writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        expect(calls).toContain(CURSOR_SHOW);
    });

    it('exit handler does not show cursor when no draft lines exist', () => {
        // No draft() calls - lines array is empty
        writeMock.mockClear();

        expect(exitListeners.length).toBeGreaterThan(0);
        for (const listener of exitListeners) {
            listener();
        }

        const calls = writeMock.mock.calls.map(([arg]) => arg).filter(arg => typeof arg === 'string');
        expect(calls).not.toContain(CURSOR_SHOW);
    });
});
