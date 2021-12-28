import { filterMessages } from '../src/appender-utils';
import { appender } from '../src/global-appender';
import { createLogger } from '../src/simple';
import { Action, Appender, LogLevel } from '../src/types';

describe('simple logger api tests', () => {
    it('set/get appender', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        expect(appender()).toBe(appenderMock);
    });

    it('null appender does not throw', () => {
        const logger = createLogger();
        appender(null as never as Appender);
        expect(() => logger('')).not.toThrow();
    });

    it('without a tag', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        createLogger()('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                tag: undefined,
                message: 'test message'
            })
        );
    });

    it('with a tag', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        createLogger('a tag')('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                tag: 'a tag',
                message: 'test message'
            })
        );
    });

    it('with a loglevel', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        createLogger()('test message', LogLevel.error);
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                message: 'test message',
                loglevel: LogLevel.error
            })
        );
    });

    it('with a context', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        const context = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createLogger()('test message', LogLevel.error, context as any);
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                message: 'test message',
                loglevel: LogLevel.error,
                context
            })
        );
    });

    describe('appender', () => {
        const appenderMock = jest.fn();
        const logger = createLogger();
        logger.appender(appenderMock);
        logger('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                loglevel: LogLevel.info,
                message: 'test message'
            })
        );
        expect(logger.appender()).toBe(appenderMock);
    });

    describe('appender API', () => {
        const appenderMock = jest.fn();
        const logger = createLogger();
        let filter = false;
        logger.appender(filterMessages<Error, { setFilter(value: boolean): void; }>(
            () => filter,
            appenderMock, // eslint-disable-line indent
            { setFilter(value: boolean) { filter = value; } } // eslint-disable-line indent
        ));
        logger('test message');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (logger.appender() as any).setFilter(true);
        logger('another test message');
        expect(appenderMock).not.toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                loglevel: LogLevel.info,
                message: 'test message'
            })
        );
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                loglevel: LogLevel.info,
                message: 'another test message'
            })
        );
    });

});