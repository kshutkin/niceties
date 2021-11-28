import { Action, Appender, Formatting, LogLevel } from '@niceties/logger/types';
import draftlog from 'draftlog';
import { createDraftlogAppender } from '../src/core';

jest.mock('draftlog');

interface DraftlogDefaults {
    canReWrite: boolean,
    maximumLinesUp: number
}

interface DraftlogConfig {
    defaults: DraftlogDefaults
}

const testOptions = {
    defaultSpinner: 'test',
    fallbackSpinner: 'test',
    logAboveSpinners: false
};

const testSpinners = {
    test: {
        frames: ['-'],
        interval: 1000
    }
};

const testFormatting: Formatting = {
    finishedPrefixes: ['', 'ok ', 'warn ', 'error '],
    colors: [,,,,]
};

const waitFor = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

describe('draftlog appender', () => {

    let appender: Appender;
    let draftLogDefaults: DraftlogDefaults;
    let consoleUpdateMock: jest.Mock<ReturnType<ReturnType<typeof console.draft>>, Parameters<ReturnType<typeof console.draft>>>;
    let consoleDraftMock: jest.MockInstance<ReturnType<typeof console.draft>, Parameters<typeof console.draft>>;
    const ref = new WeakRef(testFormatting) as WeakRef<never>;

    beforeEach(() => {
        appender = createDraftlogAppender(testOptions, testSpinners, testFormatting);
        draftLogDefaults = (draftlog as never as DraftlogConfig).defaults;
        consoleUpdateMock = jest.fn<void, any[]>();
        consoleDraftMock = jest.spyOn(global.console, 'draft').mockImplementation(() => (...args: any[]) => consoleUpdateMock(...args));
    });

    it('smoke', () => {
        expect(console.draft).toBeDefined();
        expect(draftLogDefaults).toBeDefined();
    });

    it('start a new spinner', () => {
        appender({loglevel: LogLevel.info, message: 'test', action: Action.start, inputId: 0, ref});
        expect(console.draft).toBeCalledTimes(1);
    });

    it('finish spinner on success (without start)', () => {
        appender({loglevel: LogLevel.info, message: 'test', action: Action.finish, inputId: 0, ref});

        expect(consoleDraftMock).toBeCalledWith(' ');

        expect(consoleUpdateMock).toBeCalledWith('ok test');
    });

    it('finish spinner on success (with start)', () => {
        appender({loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref});
        appender({loglevel: LogLevel.info, message: 'test2', action: Action.finish, inputId: 0, ref});

        expect(consoleDraftMock).toBeCalledWith(' ');
        
        expect(consoleUpdateMock).toBeCalledWith('- test1');

        expect(consoleUpdateMock).toBeCalledWith('ok test2');
    });

    it('finish spinner on fail (without start)', () => {
        appender({loglevel: LogLevel.error, message: 'test', action: Action.finish, inputId: 0, ref});

        expect(consoleDraftMock).toBeCalledWith(' ');
        
        expect(consoleUpdateMock).toBeCalledWith('error test');
    });

    it('finish spinner on fail (with start)', () => {
        appender({loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref});
        appender({loglevel: LogLevel.error, message: 'test2', action: Action.finish, inputId: 0, ref});

        expect(consoleDraftMock).toBeCalledWith(' ');
        
        expect(consoleUpdateMock).toBeCalledWith('- test1');

        expect(consoleUpdateMock).toBeCalledWith('error test2');
    });

    it('finish spinner on update (without start)', () => {
        appender({loglevel: LogLevel.verbose, message: 'test', action: Action.update, inputId: 0, ref});

        expect(consoleDraftMock).toBeCalledWith(' ');
        
        expect(consoleUpdateMock).toBeCalledWith('test');
    });

    it('finish spinner on update (with start)', () => {
        appender({loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref});
        appender({loglevel: LogLevel.verbose, message: 'test2', action: Action.update, inputId: 0, ref});

        expect(consoleDraftMock).toBeCalledWith(' ');
        
        expect(consoleUpdateMock).toBeCalledWith('- test1');

        expect(consoleUpdateMock).toBeCalledWith('- test2');
    });

    it('log static text', () => {
        appender({loglevel: LogLevel.info, message: 'test1', action: Action.log, inputId: 0, ref});

        expect(consoleDraftMock).toBeCalledWith(' ');
        
        expect(consoleUpdateMock).toBeCalledWith('test1');
    });

    it('gc test', async () => {
        appender({loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref: new WeakRef({}) as WeakRef<never>});
    
        expect(consoleDraftMock).toBeCalledWith(' ');
        
        expect(consoleUpdateMock).toBeCalledWith('- test1');

        await waitFor(50);

        (global as never as any).gc();
        
        await waitFor(50);

        appender({loglevel: LogLevel.verbose, message: 'test2', action: Action.update, inputId: 1, ref});
        
        expect(consoleUpdateMock).toBeCalledWith('test2');
        
        expect(consoleDraftMock).toBeCalledTimes(2);
    });
});

const testSpinners2 = {
    test: {
        frames: ['-', '+'],
        interval: 10
    }
};

describe('draftlog appender animation', () => {

    let appender: Appender;
    let consoleUpdateMock: jest.Mock<ReturnType<ReturnType<typeof console.draft>>, Parameters<ReturnType<typeof console.draft>>>;
    let consoleDraftMock: jest.MockInstance<ReturnType<typeof console.draft>, Parameters<typeof console.draft>>;
    const ref = new WeakRef(testFormatting) as WeakRef<never>;

    beforeEach(() => {
        appender = createDraftlogAppender(testOptions, testSpinners2, testFormatting);
        consoleUpdateMock = jest.fn<void, any[]>();
        consoleDraftMock = jest.spyOn(global.console, 'draft').mockImplementation(() => (...args: any[]) => consoleUpdateMock(...args));
    });

    it('test animation', async () => {
        appender({loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref});
    
        expect(consoleDraftMock).toBeCalledWith(' ');
        
        expect(consoleUpdateMock).toBeCalledWith('- test1');
        
        await waitFor(100);
        
        expect(consoleUpdateMock).toBeCalledWith('+ test1');
    });

});

describe('prepend config', () => {

    let appender: Appender;
    let consoleUpdateMock: jest.Mock<ReturnType<ReturnType<typeof console.draft>>, Parameters<ReturnType<typeof console.draft>>>;
    let consoleDraftMock: jest.MockInstance<ReturnType<typeof console.draft>, Parameters<typeof console.draft>>;
    const ref = new WeakRef(testFormatting) as WeakRef<never>;

    beforeEach(() => {
        appender = createDraftlogAppender({...testOptions, logAboveSpinners: true}, testSpinners, testFormatting);
        consoleUpdateMock = jest.fn<void, any[]>();
        consoleDraftMock = jest.spyOn(global.console, 'draft').mockImplementation(() => (...args: any[]) => consoleUpdateMock(...args));
    });

    it('prepend log', () => {
        appender({loglevel: LogLevel.info, message: 'test1', action: Action.log, inputId: 0, ref});

        expect(consoleDraftMock).toBeCalledWith(' ');
        
        expect(consoleUpdateMock).toBeCalledWith('test1');
    });

});
