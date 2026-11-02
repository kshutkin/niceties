import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { combineAppenders } from '@niceties/logger/appender-utils';
import { createLogger } from '@niceties/logger/core';
import { createFormatter, terminalSupportsUnicode } from '@niceties/logger/format-utils';

describe('public logger entry points', () => {
    const platform = Object.getOwnPropertyDescriptor(process, 'platform');
    const hasColors = Object.getOwnPropertyDescriptor(process.stdout, 'hasColors');
    let log;

    beforeEach(() => {
        vi.resetModules();
        vi.stubEnv('TERM_PROGRAM', '');
        vi.stubEnv('WT_SESSION', '');
        Object.defineProperty(process.stdout, 'hasColors', { configurable: true, value: () => false });
        log = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        Object.defineProperty(process, 'platform', platform);
        if (hasColors) Object.defineProperty(process.stdout, 'hasColors', hasColors);
        else delete process.stdout.hasColors;
    });

    it.each([
        ['linux', '', '', true],
        ['win32', '', '', false],
        ['win32', 'vscode', '', true],
        ['win32', '', 'windows-terminal', true],
    ])('detects Unicode on %s with TERM_PROGRAM=%s and WT_SESSION=%s', (os, term, session, expected) => {
        Object.defineProperty(process, 'platform', { value: os });
        vi.stubEnv('TERM_PROGRAM', term);
        vi.stubEnv('WT_SESSION', session);
        expect(terminalSupportsUnicode()).toBe(expected);
    });

    it.each([
        ['linux', 'ℹ', '✓'],
        ['win32', 'i', '+'],
    ])('installs the default console appender on %s and exposes its level control', async (os, info, success) => {
        Object.defineProperty(process, 'platform', { value: os });
        const { appender, createLogger, LogLevel } = await import('@niceties/logger');
        const logger = createLogger('build');

        logger('hidden', LogLevel.verbose);
        logger('ready');
        logger.finish('done');
        expect(log.mock.calls).toEqual([[`${info} ready`], [`${success} done`]]);

        log.mockClear();
        appender.setMinLevel(LogLevel.error);
        logger('hidden info');
        logger('failure', LogLevel.error);
        expect(log.mock.calls).toEqual([[`${info} failure`]]);

        appender.setMinLevel(LogLevel.verbose);
        logger('details', LogLevel.verbose);
        expect(log).toHaveBeenLastCalledWith(`${info} [build] details`);
    });

    it('preserves an appender registered before importing the root entry point', async () => {
        const { appender } = await import('@niceties/logger/global-appender');
        const custom = vi.fn();
        appender(custom);
        const { createLogger } = await import('@niceties/logger');
        createLogger()('custom output');
        expect(appender()).toBe(custom);
        expect(custom).toHaveBeenCalledWith(expect.objectContaining({ message: 'custom output' }));
        expect(log).not.toHaveBeenCalled();
    });

    it('merges appender APIs, with later methods winning, and forwards them to a logger', () => {
        const first = Object.assign(vi.fn(), { api: { shared: () => 'first', firstOnly: () => 1 } });
        const second = vi.fn();
        const third = Object.assign(vi.fn(), { api: { shared: () => 'third', thirdOnly: () => 3 } });
        const combined = combineAppenders(first, second, third);
        const logger = createLogger();
        logger.appender(combined);

        expect(logger.shared()).toBe('third');
        expect(logger.firstOnly()).toBe(1);
        expect(logger.thirdOnly()).toBe(3);
        logger('all three');
        for (const appender of [first, second, third]) {
            expect(appender).toHaveBeenCalledOnce();
            expect(appender).toHaveBeenCalledWith(expect.objectContaining({ message: 'all three' }));
        }
        expect(first.api.shared()).toBe('first');
    });

    it('formats an explicit progress prefix with indentation and context', () => {
        const formatter = createFormatter({}, {}, {}, tag => `[${tag}]`);
        expect(formatter({ loglevel: 1, message: 'working', context: new Error('retrying') }, '→', 2)).toBe('  → working Error: retrying');
    });
});
