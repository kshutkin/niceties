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
});
