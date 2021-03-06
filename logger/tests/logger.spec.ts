import { createLogger } from '../src/core';
import { appender } from '../src/global-appender';
import { filterMessages } from '../src/appender-utils';
import { Action, Appender, LogLevel } from '../src/types';

describe('api tests', () => {
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
        createLogger().start('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                tag: undefined
            })
        );
    });

    it('with a tag', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        createLogger('a tag').start('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                tag: 'a tag'
            })
        );
    });

    it('with a tag and parent in options', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        createLogger('test', {id: 123}).start('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                tag: 'test',
                parentId: 123
            })
        );
    });

    it('with a tag and parent without id in options', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        createLogger('test', {}).start('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                tag: 'test'
            })
        );
    });

    it('with parent in options', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        createLogger({id: 123}).start('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                parentId: 123
            })
        );
    });

    it('with parent in options without id', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        createLogger({}).start('test message');
        expect(appenderMock).not.toBeCalledWith(
            expect.objectContaining({
                parentId: expect.any(Number)
            })
        );
    });

    describe('start', () => {
        it('with default log level', () => {
            const appenderMock = jest.fn();
            appender(appenderMock);
            createLogger().start('test message');
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.start, 
                    inputId: expect.any(Number), 
                    loglevel: LogLevel.info, 
                    message: 'test message'
                })
            );
        });

        it('with overriden log level', () => {
            const appenderMock = jest.fn();
            appender(appenderMock);
            createLogger().start('test message', LogLevel.verbose);
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.start, 
                    inputId: expect.any(Number), 
                    loglevel: LogLevel.verbose, 
                    message: 'test message'
                })
            );
        });

        it('with overriden log level', () => {
            const appenderMock = jest.fn();
            appender(appenderMock);
            createLogger().start('test message', LogLevel.info);
            createLogger().start('test message2', LogLevel.verbose);
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.start, 
                    inputId: expect.any(Number), 
                    loglevel: LogLevel.verbose, 
                    message: 'test message2'
                })
            );
        });
    });

    describe('update', () => {
        it('without start', () => {
            const appenderMock = jest.fn();
            appender(appenderMock);
            createLogger().update('test message');
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.update, 
                    inputId: expect.any(Number), 
                    loglevel: LogLevel.info, 
                    message: 'test message'
                })
            );
        });

        it('receives initial log level', () => {
            const appenderMock = jest.fn();
            appender(appenderMock);
            const instance = createLogger();
            instance.start('start', LogLevel.verbose);
            instance.update('test message');
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.update, 
                    inputId: expect.any(Number), 
                    loglevel: LogLevel.verbose, 
                    message: 'test message'
                })
            );
        });

        it('with overriden log Level', () => {
            const appenderMock = jest.fn();
            appender(appenderMock);
            const instance = createLogger();
            instance.start('start', LogLevel.verbose);
            instance.update('test message', LogLevel.warn);
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.update, 
                    inputId: expect.any(Number), 
                    loglevel: LogLevel.warn, 
                    message: 'test message'
                })
            );
        });
    });

    describe('finish', () => {
        it('without start', () => {
            const appenderMock = jest.fn();
            appender(appenderMock);
            createLogger().finish('test message', LogLevel.info);
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.finish, 
                    inputId: expect.any(Number), 
                    loglevel: LogLevel.info, 
                    message: 'test message'
                })
            );
        });

        it('receives initial log level', () => {
            const appenderMock = jest.fn();
            appender(appenderMock);
            const instance = createLogger();
            instance.start('start', LogLevel.verbose);
            instance.finish('test message');
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.finish, 
                    inputId: expect.any(Number), 
                    loglevel: LogLevel.verbose, 
                    message: 'test message'
                })
            );
        });

        it('with overriden log Level', () => {
            const appenderMock = jest.fn();
            appender(appenderMock);
            const instance = createLogger();
            instance.start('start', LogLevel.verbose);
            instance.finish('test message', LogLevel.warn);
            expect(appenderMock).toBeCalledWith(
                expect.objectContaining({
                    action: Action.finish, 
                    inputId: expect.any(Number), 
                    loglevel: LogLevel.warn, 
                    message: 'test message'
                })
            );
        });
    });

    describe('fail', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        createLogger().finish('test message', LogLevel.error);
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.finish,
                inputId: expect.any(Number),
                loglevel: LogLevel.error,
                message: 'test message'
            })
        );
    });

    describe('log with default log level', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        createLogger()('test message');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                inputId: expect.any(Number),
                loglevel: LogLevel.info,
                message: 'test message'
            })
        );
    });

    describe('log', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        createLogger()('test message', LogLevel.error);
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                inputId: expect.any(Number),
                loglevel: LogLevel.error,
                message: 'test message'
            })
        );
    });

    describe('log with additional context', () => {
        const appenderMock = jest.fn();
        appender(appenderMock);
        createLogger<string>()('test message', LogLevel.error, 'some context');
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                inputId: expect.any(Number),
                loglevel: LogLevel.error,
                message: 'test message',
                context: 'some context'
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
                inputId: expect.any(Number),
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
                inputId: expect.any(Number),
                loglevel: LogLevel.info,
                message: 'test message'
            })
        );
        expect(appenderMock).toBeCalledWith(
            expect.objectContaining({
                action: Action.log,
                inputId: expect.any(Number),
                loglevel: LogLevel.info,
                message: 'another test message'
            })
        );
    });

    describe('id is not writable', () => {
        const logger = createLogger();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => (logger as never as any)['id'] = 123).toThrow();
    });

});