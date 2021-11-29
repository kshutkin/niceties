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
        interval: 500
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
    let interval: NodeJS.Timer;
    let setIntervalCopy: typeof global.setInterval;
    let consoleUpdateMock: jest.Mock<ReturnType<ReturnType<typeof console.draft>>, Parameters<ReturnType<typeof console.draft>>>;
    let consoleDraftMock: jest.MockInstance<ReturnType<typeof console.draft>, Parameters<typeof console.draft>>;
    const ref = new WeakRef(testFormatting) as WeakRef<never>;

    beforeEach(() => {
        appender = createDraftlogAppender(testOptions, testSpinners, testFormatting);
        draftLogDefaults = (draftlog as never as DraftlogConfig).defaults;
        consoleUpdateMock = jest.fn<void, any[]>();
        consoleDraftMock = jest.spyOn(global.console, 'draft').mockImplementation(() => (...args: any[]) => consoleUpdateMock(...args));
        setIntervalCopy = global.setInterval;
        global.setInterval = Object.assign(function (callback: (...args: any[]) => void, ms?: number, ...args: any[]) {
            return interval = setIntervalCopy(callback, ms, ...args);
        }, setIntervalCopy);
    });

    afterEach(() => {
        global.setInterval = setIntervalCopy;
        clearInterval(interval);
    })

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

    it('gc test 2 (don\'t remove lines when children still has refs)', async () => {
        appender({loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref: new WeakRef({}) as WeakRef<never>});
        appender({loglevel: LogLevel.info, message: 'test2', action: Action.start, inputId: 1, ref, parentId: 0});
    
        await waitFor(50);

        (global as never as any).gc();
        
        await waitFor(50);

        appender({loglevel: LogLevel.verbose, message: 'test3', action: Action.update, inputId: 2, ref});
        
        expect(consoleUpdateMock).toBeCalledTimes(6);
    });

    it('gc test 3 (remove lines when children are freed as well and not spinning)', async () => {
        appender({loglevel: LogLevel.info, message: 'test1', action: Action.update, inputId: 0, ref: new WeakRef({}) as WeakRef<never>});
        appender({loglevel: LogLevel.info, message: 'test2', action: Action.update, inputId: 1, ref: new WeakRef({}) as WeakRef<never>, parentId: 0});
    
        await waitFor(50);

        (global as never as any).gc();
        
        await waitFor(50);

        appender({loglevel: LogLevel.verbose, message: 'test3', action: Action.update, inputId: 2, ref});
        
        expect(consoleUpdateMock).toBeCalledTimes(4);
    });

    it('setInterval finishes (moving active parent)', async () => {
        appender({loglevel: LogLevel.info, message: '+test2', action: Action.start, inputId: 2, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test3', action: Action.start, inputId: 3, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test4', action: Action.start, inputId: 4, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test0', action: Action.start, inputId: 0, ref});
        appender({loglevel: LogLevel.info, message: '+test4_f', action: Action.finish, inputId: 4, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test5', action: Action.start, inputId: 5, ref, parentId: 0});
        appender({loglevel: LogLevel.info, message: '+test2_f', action: Action.finish, inputId: 2, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 3, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 5, ref, parentId: 0});
        appender({loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 0, ref});
            
        await waitFor(550);

        expect(consoleUpdateMock).toBeCalledTimes(44);
    });

    it('setInterval finishes 2 (moving static parent)', async () => {
        appender({loglevel: LogLevel.info, message: '+test2', action: Action.start, inputId: 2, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test3', action: Action.start, inputId: 3, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test4', action: Action.start, inputId: 4, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test0', action: Action.start, inputId: 0, ref});
        appender({loglevel: LogLevel.info, message: '+test4_f', action: Action.finish, inputId: 4, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test5', action: Action.update, inputId: 5, ref, parentId: 0});
        appender({loglevel: LogLevel.info, message: '+test2_f', action: Action.finish, inputId: 2, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 3, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 5, ref, parentId: 0});
        appender({loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 0, ref});
            
        await waitFor(550);

        expect(consoleUpdateMock).toBeCalledTimes(44);
    });

    it('multilevel output', () => {
        appender({loglevel: LogLevel.info, message: '+test2', action: Action.start, inputId: 2, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test3', action: Action.start, inputId: 3, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test4', action: Action.start, inputId: 4, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test0', action: Action.start, inputId: 0, ref});
        appender({loglevel: LogLevel.info, message: '+test4_f', action: Action.finish, inputId: 4, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test5', action: Action.start, inputId: 5, ref, parentId: 0});
        appender({loglevel: LogLevel.info, message: '+test2_f', action: Action.finish, inputId: 2, ref, parentId: 5});
        appender({loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 3, ref, parentId: 5});
        
        expect(consoleUpdateMock).toBeCalledWith('    ok +test3_f');
        expect(consoleUpdateMock).toBeCalledWith('    ok +test2_f');
        expect(consoleUpdateMock).toBeCalledWith('    ok +test4_f');
        expect(consoleUpdateMock).toBeCalledWith('  - +test5');
        expect(consoleUpdateMock).toBeCalledWith('- +test0');
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
