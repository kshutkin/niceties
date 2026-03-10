import { blue, cyan, gray, green, red, yellow } from 'picocolors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createConsoleAppender } from '../src/console-appender.js';
import { colors, tagFactory, unicodeLogPrefixes, unicodePrefixes } from '../src/default-formatting.js';
import { createFormatter } from '../src/format-utils.js';
import { Action, LogLevel } from '../src/types.js';

describe('console appender', () => {
    /** @type {ReturnType<typeof vi.spyOn<typeof console, 'log'>>} */
    let consoleLogMock;
    /** @type {import('../src/types.js').Appender} */
    let consoleAppender;
    const ref = new WeakRef({});

    beforeEach(() => {
        consoleLogMock = vi.spyOn(global.console, 'log').mockImplementation(() => {});
        const formatter = createFormatter(colors, unicodePrefixes, unicodeLogPrefixes, tagFactory);
        consoleAppender = createConsoleAppender(formatter);
    });

    afterEach(() => {
        consoleLogMock.mockRestore();
    });

    it('start (with info)', () => {
        consoleAppender({
            loglevel: LogLevel.info,
            message: 'test',
            action: Action.start,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (ref),
        });

        expect(consoleLogMock).toBeCalledWith('test');
    });

    it('start (with warning)', () => {
        consoleAppender({
            loglevel: LogLevel.warn,
            message: 'test',
            action: Action.start,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (ref),
        });

        expect(consoleLogMock).toBeCalledWith(`${yellow('test')}`);
    });

    it('update (info)', () => {
        consoleAppender({
            loglevel: LogLevel.info,
            message: 'test',
            action: Action.update,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (ref),
        });

        expect(consoleLogMock).toBeCalledWith('test');
    });

    it('finish with info (success)', () => {
        consoleAppender({
            loglevel: LogLevel.info,
            message: 'test',
            action: Action.finish,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (ref),
        });

        expect(consoleLogMock).toBeCalledWith(`${green('✓')} test`);
    });

    it('finish with warning', () => {
        consoleAppender({
            loglevel: LogLevel.warn,
            message: 'test',
            action: Action.finish,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (ref),
        });

        expect(consoleLogMock).toBeCalledWith(`${yellow('⚠ test')}`);
    });

    it('finish with error', () => {
        consoleAppender({
            loglevel: LogLevel.error,
            message: 'test',
            action: Action.finish,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (ref),
        });

        expect(consoleLogMock).toBeCalledWith(`${red('✕ test')}`);
    });

    it('log with info (success)', () => {
        consoleAppender({
            loglevel: LogLevel.info,
            message: 'test',
            action: Action.log,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (ref),
        });

        expect(consoleLogMock).toBeCalledWith(`${cyan('ℹ')} test`);
    });

    it('log with warning', () => {
        consoleAppender({
            loglevel: LogLevel.warn,
            message: 'test',
            action: Action.log,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (ref),
        });

        expect(consoleLogMock).toBeCalledWith(`${yellow('ℹ test')}`);
    });

    it('log with error', () => {
        consoleAppender({
            loglevel: LogLevel.error,
            message: 'test',
            action: Action.log,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (ref),
        });

        expect(consoleLogMock).toBeCalledWith(`${red('ℹ test')}`);
    });

    it('log with visible tag', () => {
        consoleAppender({
            loglevel: LogLevel.verbose,
            message: 'test',
            action: Action.log,
            inputId: 0,
            tag: 'atag',
            ref: /** @type {WeakRef<never>} */ (ref),
        });

        expect(consoleLogMock).toBeCalledWith(`${gray('ℹ')} [${blue('atag')}] test`);
    });

    it('log with context', () => {
        consoleAppender({
            loglevel: LogLevel.error,
            message: 'test',
            action: Action.log,
            inputId: 0,
            context: Error('error'),
            ref: /** @type {WeakRef<never>} */ (ref),
        });

        expect(consoleLogMock).toBeCalledWith(`${red('ℹ test Error: error')}`);
    });
});
