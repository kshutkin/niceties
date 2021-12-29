import { blue, green, red, yellow } from 'kleur';
import { createConsoleAppender } from '../src/console-appender';
import { colors, unicodePrefixes, tagFactory } from '../src/default-formatting';
import { createFormatter } from '../src/format-utils';
import { Action, LogLevel, Appender } from '../src/types';

describe('console appender', () => {

    let consoleLogMock: jest.MockInstance<void, string[]>;
    let consoleAppender: Appender;
    const ref = new WeakRef({});

    beforeEach(() => {
        consoleLogMock = jest.spyOn(global.console, 'log').mockImplementation();
        const formatter = createFormatter(colors, unicodePrefixes, tagFactory);
        consoleAppender = createConsoleAppender(formatter);
    });

    afterEach(() => {
        consoleLogMock.mockRestore();
    });

    it('start (with info)', () => {
        consoleAppender({loglevel: LogLevel.info, message: 'test', action: Action.start, inputId: 0, ref: ref as WeakRef<never>});

        expect(consoleLogMock).toBeCalledWith('test');
    });

    it('start (with warning)', () => {
        consoleAppender({loglevel: LogLevel.warn, message: 'test', action: Action.start, inputId: 0, ref: ref as WeakRef<never>});

        expect(consoleLogMock).toBeCalledWith(`${yellow('test')}`);
    });

    it('update (info)', () => {
        consoleAppender({loglevel: LogLevel.info, message: 'test', action: Action.update, inputId: 0, ref: ref as WeakRef<never>});

        expect(consoleLogMock).toBeCalledWith('test');
    });

    it('finish with info (success)', () => {
        consoleAppender({loglevel: LogLevel.info, message: 'test', action: Action.finish, inputId: 0, ref: ref as WeakRef<never>});

        expect(consoleLogMock).toBeCalledWith(`${green('✓')} test`);
    });

    it('finish with warning', () => {
        consoleAppender({loglevel: LogLevel.warn, message: 'test', action: Action.finish, inputId: 0, ref: ref as WeakRef<never>});

        expect(consoleLogMock).toBeCalledWith(`${yellow('⚠ test')}`);
    });

    it('finish with error', () => {
        consoleAppender({loglevel: LogLevel.error, message: 'test', action: Action.finish, inputId: 0, ref: ref as WeakRef<never>});

        expect(consoleLogMock).toBeCalledWith(`${red('✕ test')}`);
    });

    it('log with info (success)', () => {
        consoleAppender({loglevel: LogLevel.info, message: 'test', action: Action.log, inputId: 0, ref: ref as WeakRef<never>});

        expect(consoleLogMock).toBeCalledWith('test');
    });

    it('log with warning', () => {
        consoleAppender({loglevel: LogLevel.warn, message: 'test', action: Action.log, inputId: 0, ref: ref as WeakRef<never>});

        expect(consoleLogMock).toBeCalledWith(`${yellow('test')}`);
    });

    it('log with error', () => {
        consoleAppender({loglevel: LogLevel.error, message: 'test', action: Action.log, inputId: 0, ref: ref as WeakRef<never>});

        expect(consoleLogMock).toBeCalledWith(`${red('test')}`);
    });

    it('log with visible tag', () => {
        consoleAppender({loglevel: LogLevel.verbose, message: 'test', action: Action.log, inputId: 0, tag: 'atag', ref: ref as WeakRef<never>});

        expect(consoleLogMock).toBeCalledWith(`[${blue('atag')}] test`);
    });

    it('log with context', () => {
        consoleAppender({loglevel: LogLevel.error, message: 'test', action: Action.log, inputId: 0, context: Error('error'), ref: ref as WeakRef<never>});

        expect(consoleLogMock).toBeCalledWith(`${red('test Error: error')}`);
    });
});
