import { describe, expect, it, vi } from 'vitest';

import { filterMessages } from '../src/appender-utils.js';
import { createLogger } from '../src/core.js';
import { appender } from '../src/global-appender.js';
import { Action, LogLevel } from '../src/types.js';

describe('api tests', () => {
    it('set/get appender', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        expect(appender()).toBe(appenderMock);
    });

    it('null appender does not throw', () => {
        const logger = createLogger();
        appender(/** @type {any} */ (null));
        expect(() => logger('')).not.toThrow();
    });

    it('without a tag', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        createLogger().start('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                tag: undefined,
            })
        );
    });

    it('with a tag', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        createLogger('a tag').start('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                tag: 'a tag',
            })
        );
    });

    it('with a tag and parent in options', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        createLogger('test', { id: 123 }).start('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                tag: 'test',
                parentId: 123,
            })
        );
    });

    it('with a tag and parent without id in options', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        createLogger('test', {}).start('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                tag: 'test',
            })
        );
    });

    it('with parent in options', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        createLogger({ id: 123 }).start('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                parentId: 123,
            })
        );
    });

    it('with parent in options without id', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        createLogger({}).start('test message');
        expect(appenderMock).not.toBeCalledWith(
            expect.objectContaining({
                parentId: expect.any(Number),
            })
        );
    });

    describe('start', () => {
        it('with default log level', () => {
            const appenderMock = vi.fn();
            appender(appenderMock);
            createLogger().start('test message');
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.start,
                    inputId: expect.any(Number),
                    loglevel: LogLevel.info,
                    message: 'test message',
                })
            );
        });

        it('with overriden log level', () => {
            const appenderMock = vi.fn();
            appender(appenderMock);
            createLogger().start('test message', LogLevel.verbose);
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.start,
                    inputId: expect.any(Number),
                    loglevel: LogLevel.verbose,
                    message: 'test message',
                })
            );
        });

        it('with overriden log level', () => {
            const appenderMock = vi.fn();
            appender(appenderMock);
            createLogger().start('test message', LogLevel.info);
            createLogger().start('test message2', LogLevel.verbose);
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.start,
                    inputId: expect.any(Number),
                    loglevel: LogLevel.verbose,
                    message: 'test message2',
                })
            );
        });
    });

    describe('update', () => {
        it('without start', () => {
            const appenderMock = vi.fn();
            appender(appenderMock);
            createLogger().update('test message');
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.update,
                    inputId: expect.any(Number),
                    loglevel: LogLevel.info,
                    message: 'test message',
                })
            );
        });

        it('receives initial log level', () => {
            const appenderMock = vi.fn();
            appender(appenderMock);
            const instance = createLogger();
            instance.start('start', LogLevel.verbose);
            instance.update('test message');
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.update,
                    inputId: expect.any(Number),
                    loglevel: LogLevel.verbose,
                    message: 'test message',
                })
            );
        });

        it('with overriden log Level', () => {
            const appenderMock = vi.fn();
            appender(appenderMock);
            const instance = createLogger();
            instance.start('start', LogLevel.verbose);
            instance.update('test message', LogLevel.warn);
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.update,
                    inputId: expect.any(Number),
                    loglevel: LogLevel.warn,
                    message: 'test message',
                })
            );
        });
    });

    describe('finish', () => {
        it('without start', () => {
            const appenderMock = vi.fn();
            appender(appenderMock);
            createLogger().finish('test message', LogLevel.info);
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.finish,
                    inputId: expect.any(Number),
                    loglevel: LogLevel.info,
                    message: 'test message',
                })
            );
        });

        it('receives initial log level', () => {
            const appenderMock = vi.fn();
            appender(appenderMock);
            const instance = createLogger();
            instance.start('start', LogLevel.verbose);
            instance.finish('test message');
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.finish,
                    inputId: expect.any(Number),
                    loglevel: LogLevel.verbose,
                    message: 'test message',
                })
            );
        });

        it('with overriden log Level', () => {
            const appenderMock = vi.fn();
            appender(appenderMock);
            const instance = createLogger();
            instance.start('start', LogLevel.verbose);
            instance.finish('test message', LogLevel.warn);
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.finish,
                    inputId: expect.any(Number),
                    loglevel: LogLevel.warn,
                    message: 'test message',
                })
            );
        });
    });

    it('fail', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        createLogger().finish('test message', LogLevel.error);
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.finish,
                inputId: expect.any(Number),
                loglevel: LogLevel.error,
                message: 'test message',
            })
        );
    });

    it('log with default log level', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        createLogger()('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                inputId: expect.any(Number),
                loglevel: LogLevel.info,
                message: 'test message',
            })
        );
    });

    it('log', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        createLogger()('test message', LogLevel.error);
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                inputId: expect.any(Number),
                loglevel: LogLevel.error,
                message: 'test message',
            })
        );
    });

    it('log with additional context', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        createLogger()('test message', LogLevel.error, 'some context');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                inputId: expect.any(Number),
                loglevel: LogLevel.error,
                message: 'test message',
                context: 'some context',
            })
        );
    });

    it('appender', () => {
        const appenderMock = vi.fn();
        const logger = createLogger();
        logger.appender(appenderMock);
        logger('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                inputId: expect.any(Number),
                loglevel: LogLevel.info,
                message: 'test message',
            })
        );
        expect(logger.appender()).toBe(appenderMock);
    });

    it('appender API', () => {
        const appenderMock = vi.fn();
        const logger = createLogger();
        let filter = false;
        const filtered = filterMessages(() => filter, appenderMock);
        filtered.api = {
            /** @param {boolean} value */
            setFilter(value) {
                filter = value;
            },
        };
        logger.appender(filtered);
        logger('test message');
        /** @type {any} */ (logger).setFilter(true);
        logger('another test message');
        expect(appenderMock).not.toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                inputId: expect.any(Number),
                loglevel: LogLevel.info,
                message: 'test message',
            })
        );
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                inputId: expect.any(Number),
                loglevel: LogLevel.info,
                message: 'another test message',
            })
        );
    });

    it('appender api properties are cleaned up on swap', () => {
        const logger = createLogger();
        const filtered1 = filterMessages(() => true, vi.fn());
        filtered1.api = {
            customMethod() {
                return 'first';
            },
        };
        logger.appender(filtered1);
        expect(/** @type {any} */ (logger).customMethod()).toBe('first');

        const filtered2 = filterMessages(() => true, vi.fn());
        filtered2.api = {
            otherMethod() {
                return 'second';
            },
        };
        logger.appender(filtered2);
        expect(/** @type {any} */ (logger).customMethod).toBeUndefined();
        expect(/** @type {any} */ (logger).otherMethod()).toBe('second');
    });

    it('appender api properties are cleaned up when swapping to appender without api', () => {
        const logger = createLogger();
        const filtered = filterMessages(() => true, vi.fn());
        filtered.api = {
            customMethod() {
                return 'value';
            },
        };
        logger.appender(filtered);
        expect(/** @type {any} */ (logger).customMethod()).toBe('value');

        logger.appender(vi.fn());
        expect(/** @type {any} */ (logger).customMethod).toBeUndefined();
    });

    it('id is not writable', () => {
        const logger = createLogger();
        expect(() => {
            /** @type {any} */ (logger).id = 123;
        }).toThrow();
    });
});
