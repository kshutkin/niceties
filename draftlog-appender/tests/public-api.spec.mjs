import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('public draftlog appender registration', () => {
    const platform = Object.getOwnPropertyDescriptor(process, 'platform');
    const hasColors = Object.getOwnPropertyDescriptor(process.stdout, 'hasColors');
    let originalTTY;
    let write;

    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
        vi.stubEnv('CI', '');
        vi.stubEnv('TERM_PROGRAM', '');
        vi.stubEnv('WT_SESSION', '');
        originalTTY = process.stdout.isTTY;
        process.stdout.isTTY = false;
        Object.defineProperty(process.stdout, 'hasColors', { configurable: true, value: () => false });
        write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        process.stdout.isTTY = originalTTY;
        Object.defineProperty(process, 'platform', platform);
        if (hasColors) Object.defineProperty(process.stdout, 'hasColors', hasColors);
        else delete process.stdout.hasColors;
    });

    it.each([
        ['linux', 'ℹ', '✓', '⠋', '⠙', 50],
        ['win32', 'i', '+', '-', '\\', 130],
    ])('registers formatting, animation, and level control on %s', async (os, info, success, first, next, interval) => {
        Object.defineProperty(process, 'platform', { value: os });
        await import('@niceties/draftlog-appender');
        const { appender, createLogger, LogLevel } = await import('@niceties/logger');
        const logger = createLogger('build');

        logger('hidden', LogLevel.verbose);
        expect(write).not.toHaveBeenCalled();
        logger('ready');
        expect(write).toHaveBeenCalledWith(`${info} ready\n`);
        logger.start('working');
        expect(write).toHaveBeenCalledWith(`${first} working\n`);
        vi.advanceTimersByTime(interval);
        expect(write).toHaveBeenCalledWith(`${next} working\n`);
        logger.finish('done');
        expect(write).toHaveBeenCalledWith(`${success} done\n`);
        expect(vi.getTimerCount()).toBe(0);

        write.mockClear();
        appender.setMinLevel(LogLevel.error);
        logger('hidden info');
        expect(write).not.toHaveBeenCalled();
        logger('failure', LogLevel.error);
        expect(write).toHaveBeenCalledWith(`${info} failure\n`);

        appender.setMinLevel(LogLevel.verbose);
        logger('details', LogLevel.verbose);
        expect(write).toHaveBeenCalledWith(`${info} [build] details\n`);
    });

    it('keeps the registered appender when imported in CI', async () => {
        vi.stubEnv('CI', 'true');
        const { appender } = await import('@niceties/logger/global-appender');
        const custom = vi.fn();
        appender(custom);
        await import('@niceties/draftlog-appender');
        const { createLogger } = await import('@niceties/logger');
        createLogger()('CI output');
        expect(appender()).toBe(custom);
        expect(custom).toHaveBeenCalledWith(expect.objectContaining({ message: 'CI output' }));
        expect(write).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });
});
