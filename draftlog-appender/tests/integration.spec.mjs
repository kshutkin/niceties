import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('appender with real draftlog rendering', () => {
    let originalIsTTY;
    let originalRows;
    let originalColumns;
    let write;
    let appender;
    let Action;
    let resizeListeners;
    let exitListeners;
    const owner = {};
    const ref = new WeakRef(owner);

    beforeEach(async () => {
        vi.resetModules();
        originalIsTTY = process.stdout.isTTY;
        originalRows = process.stdout.rows;
        originalColumns = process.stdout.columns;
        process.stdout.isTTY = true;
        process.stdout.rows = 24;
        process.stdout.columns = 12;
        resizeListeners = [];
        exitListeners = [];
        const stdoutOn = process.stdout.on.bind(process.stdout);
        const processOn = process.on.bind(process);
        vi.spyOn(process.stdout, 'on').mockImplementation((event, listener) => {
            if (event === 'resize') resizeListeners.push(listener);
            return stdoutOn(event, listener);
        });
        vi.spyOn(process, 'on').mockImplementation((event, listener) => {
            if (event === 'exit') exitListeners.push(listener);
            return processOn(event, listener);
        });
        write = vi.fn();
        vi.spyOn(process.stdout, 'write').mockImplementation(write);
        const { createDraftlogAppender } = await import('../src/core.js');
        const { createFormatter } = await import('@niceties/logger/format-utils');
        ({ Action } = await import('@niceties/logger/types'));
        appender = createDraftlogAppender(
            { frames: ['-'], interval: 100 },
            createFormatter({}, { 1: '✓' }, { 1: 'i' }, tag => `[${tag}]`),
            false,
            2
        );
    });

    afterEach(() => {
        for (const listener of resizeListeners) process.stdout.removeListener('resize', listener);
        for (const listener of exitListeners) process.removeListener('exit', listener);
        vi.restoreAllMocks();
        process.stdout.isTTY = originalIsTTY;
        process.stdout.rows = originalRows;
        process.stdout.columns = originalColumns;
    });

    async function flush() {
        await new Promise(resolve => process.nextTick(resolve));
    }

    it('keeps every row of a collected multiline log above the next item', async () => {
        appender({ loglevel: 1, message: 'first\nsecond', action: Action.log });
        await flush();
        write.mockClear();
        appender({ loglevel: 1, message: 'next', action: Action.finish, inputId: 1, ref });
        await flush();

        expect(write).toHaveBeenCalledWith('\x1B[3A\r\x1B[J');
        expect(write).toHaveBeenCalledWith('i first\n  second\n');
        expect(write).toHaveBeenCalledWith('✓ next\n');
    });

    it('uses one prefix and a two-space continuation margin for both wraps and newlines', async () => {
        appender({ loglevel: 1, message: 'abcdefghijklm\n\nlast\n', action: Action.finish, inputId: 1, ref });
        await flush();
        expect(write).toHaveBeenCalledWith('✓ abcdefghij\n  klm\n\n  last\n\n');
    });

    it('reflows the original formatted message when the terminal widens', async () => {
        appender({ loglevel: 1, message: 'abcdefghijklm', action: Action.finish, inputId: 1, ref });
        await flush();
        write.mockClear();
        process.stdout.columns = 20;
        process.stdout.emit('resize');
        await flush();
        expect(write).toHaveBeenCalledWith('\x1B[2A\r\x1B[J');
        expect(write).toHaveBeenCalledWith('✓ abcdefghijklm\n');
    });

    it('updates the visible tail of an item taller than the viewport', async () => {
        process.stdout.rows = 4;
        appender({ loglevel: 1, message: 'top\nfirst\nsecond\nthird\nlast', action: Action.finish, inputId: 1, ref });
        await flush();
        write.mockClear();
        appender({ loglevel: 1, message: 'TOP\nFIRST\nSECOND\nTHIRD\nLAST', action: Action.update, inputId: 1, ref });
        await flush();
        expect(write).toHaveBeenCalledWith('\x1B[3A\r\x1B[J');
        expect(write).toHaveBeenCalledWith('  SECOND\n  THIRD\n  LAST\n');
    });
});
