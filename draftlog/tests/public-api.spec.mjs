import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('public draft API terminal edge cases', () => {
    let draft;
    let write;
    let originalTTY;
    let originalRows;
    let originalColumns;
    let originalResizeListeners;
    let originalExitListeners;

    const flush = () => new Promise(resolve => process.nextTick(resolve));

    beforeEach(async () => {
        vi.resetModules();
        originalTTY = process.stdout.isTTY;
        originalRows = process.stdout.rows;
        originalColumns = process.stdout.columns;
        originalResizeListeners = process.stdout.listeners('resize');
        originalExitListeners = process.listeners('exit');
        process.stdout.isTTY = true;
        process.stdout.rows = 24;
        process.stdout.columns = 8;
        write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        ({ draft } = await import('@niceties/draftlog'));
    });

    afterEach(async () => {
        await flush();
        for (const listener of process.stdout.listeners('resize')) {
            if (!originalResizeListeners.includes(listener)) process.stdout.removeListener('resize', listener);
        }
        for (const listener of process.listeners('exit')) {
            if (!originalExitListeners.includes(listener)) process.removeListener('exit', listener);
        }
        vi.restoreAllMocks();
        process.stdout.isTTY = originalTTY;
        process.stdout.rows = originalRows;
        process.stdout.columns = originalColumns;
    });

    it('preserves zero-width characters without adding a physical row', async () => {
        const update = draft('a\u200Bb');
        expect(write).toHaveBeenCalledWith('a\u200Bb\n');
        write.mockClear();
        update('next');
        await flush();
        expect(write).toHaveBeenCalledWith('\x1B[1A\r\x1B[J');
        expect(write).toHaveBeenCalledWith('next\n');
    });

    it('replays hyperlinks when clipping a draft without replaying cursor movement', async () => {
        process.stdout.rows = 3;
        const link = '\x1B]8;;https://example.com\x1B\\';
        const close = '\x1B]8;;\x1B\\';
        const update = draft(`${link}\x1B[2Ctop\nmiddle\nlast${close}`);
        write.mockClear();
        update(`${link}\x1B[2CTOP\nMIDDLE\nLAST${close}`);
        await flush();
        expect(write).toHaveBeenCalledWith(`${link}MIDDLE\nLAST${close}\n`);
        expect(write.mock.calls.flat().join('')).not.toContain('\x1B[2C');
    });

    it('passes external writes through when a resize leaves no room for drafts', () => {
        const update = draft('before');
        process.stdout.rows = 1;
        write.mockClear();
        const callback = vi.fn();
        expect(process.stdout.write('external\n', 'utf8', callback)).toBe(true);
        expect(write).toHaveBeenCalledWith('\r\x1B[J');
        expect(write).toHaveBeenCalledWith('external\n', 'utf8', callback);
        expect(write.mock.calls.flat()).not.toContain('before\n');
        update('offscreen');
    });

    it('handles a resize before any draft exists', async () => {
        process.stdout.emit('resize');
        await flush();
        expect(write).not.toHaveBeenCalled();
        draft('after resize');
        expect(write).toHaveBeenCalledWith('after re\nsize\n');
    });

    it('discards drafts when a resize removes the last visible row', async () => {
        const update = draft('before');
        write.mockClear();
        process.stdout.rows = 1;
        process.stdout.emit('resize');
        await flush();
        expect(write.mock.calls).toEqual([['\x1B[?25h']]);

        write.mockClear();
        process.stdout.rows = 24;
        update('discarded');
        process.stdout.emit('resize');
        await flush();
        expect(write).not.toHaveBeenCalled();
        draft('new');
        expect(write.mock.calls).toEqual([['new\n'], ['\x1B[?25l']]);
    });
});
