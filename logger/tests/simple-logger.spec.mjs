import { describe, expect, it, vi } from 'vitest';

import { filterMessages } from '../src/appender-utils.js';
import { appender } from '../src/global-appender.js';
import { createLogger } from '../src/simple.js';
import { Action, LogLevel } from '../src/types.js';

describe('simple logger api tests', () => {
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
        createLogger()('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                tag: undefined,
                message: 'test message',
            })
        );
    });

    it('with a tag', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        createLogger('a tag')('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                tag: 'a tag',
                message: 'test message',
            })
        );
    });

    it('with a loglevel', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        createLogger()('test message', LogLevel.error);
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                message: 'test message',
                loglevel: LogLevel.error,
            })
        );
    });

    it('with a context', () => {
        const appenderMock = vi.fn();
        appender(appenderMock);
        const context = {};
        createLogger()('test message', LogLevel.error, /** @type {any} */ (context));
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                message: 'test message',
                loglevel: LogLevel.error,
                context,
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
        logger.appender(
            filterMessages(() => filter, appenderMock, {
                /** @param {boolean} value */
                setFilter(value) {
                    filter = value;
                },
            })
        );
        logger('test message');
        /** @type {any} */ (logger.appender()).setFilter(true);
        logger('another test message');
        expect(appenderMock).not.toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                loglevel: LogLevel.info,
                message: 'test message',
            })
        );
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                loglevel: LogLevel.info,
                message: 'another test message',
            })
        );
    });
});
