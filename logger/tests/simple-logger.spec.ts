import { createLogger, appender } from '../src/simple';
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

    describe('withAppender', () => {
        const appenderMock = jest.fn();
        const appender2Mock = jest.fn();
        appender(appenderMock);
        createLogger()
            .withAppender(appender2Mock)
            ('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                loglevel: LogLevel.info,
                message: 'test message'
            })
        );
        expect(appender2Mock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                loglevel: LogLevel.info,
                message: 'test message'
            })
        );
    });

});