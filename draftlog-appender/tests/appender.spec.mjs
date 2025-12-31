import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFormatter } from '@niceties/logger/format-utils';
import { Action, LogLevel } from '@niceties/logger/types';

import { createDraftlogAppender } from '../src/core.js';

vi.mock('draftlog', () => ({
    default: Object.assign(
        (console) => {
            console.draft = () => () => {};
            return {
                addLineListener() {},
            };
        },
        {
            defaults: {
                canRewrite: true,
            },
        }
    ),
}));

const testSpinner = {
    frames: ['-'],
    interval: 500,
};

/** @type {{ [index: number]: string }} */
const finishedPrefixes = ['', 'ok', 'warn', 'error'];
/** @type {{ [index: number]: ((text: string) => string) | undefined }} */
// biome-ignore lint/suspicious/noSparseArray: expected empty slots
const colors = [, , , ,];
/** @param {string} tag */
const tagFactory = (tag) => tag;

/** @param {number} milliseconds */
const waitFor = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

describe('draftlog appender', () => {
    /** @type {import('@niceties/logger/types').Appender} */
    let appender;
    /** @type {{ canReWrite: boolean; maximumLinesUp: number }} */
    let draftLogDefaults;
    /** @type {NodeJS.Timer} */
    let interval;
    /** @type {typeof global.setInterval} */
    let setIntervalCopy;
    /** @type {ReturnType<typeof vi.fn>} */
    let consoleUpdateMock;
    /** @type {ReturnType<typeof vi.spyOn<typeof console, 'draft'>>} */
    let consoleDraftMock;
    const ref = /** @type {WeakRef<never>} */ (new WeakRef(testSpinner));

    beforeEach(async () => {
        vi.clearAllMocks();
        const draftlog = await import('draftlog');
        const formatter = createFormatter(colors, finishedPrefixes, tagFactory);
        appender = createDraftlogAppender(testSpinner, formatter, false, 2);
        draftLogDefaults = /** @type {any} */ (draftlog.default).defaults;
        consoleUpdateMock = vi.fn();
        consoleDraftMock = vi.spyOn(global.console, 'draft').mockImplementation(
            () =>
                (/** @type {any[]} */ ...args) =>
                    consoleUpdateMock(...args)
        );
        setIntervalCopy = global.setInterval;
        global.setInterval = Object.assign(
            // hold interval reference
            // biome-ignore lint/suspicious/noAssignInExpressions: mock implementation
            (/** @type {(...args: any[]) => void} */ /** @type {(...args: any[]) => void} */callback, /** @type {number} */ ms, /** @type {any[]} */ ...args) => (interval = setIntervalCopy(callback, ms, ...args)),
            setIntervalCopy
        );
    });

    afterEach(() => {
        global.setInterval = setIntervalCopy;
        clearInterval(interval);
        consoleDraftMock.mockRestore();
    });

    it('smoke', () => {
        expect(console.draft).toBeDefined();
        expect(draftLogDefaults).toBeDefined();
    });

    it('start a new spinner', () => {
        appender({ loglevel: LogLevel.info, message: 'test', action: Action.start, inputId: 0, ref });
        expect(console.draft).toBeCalledTimes(1);
    });

    it('finish spinner on success (without start)', () => {
        appender({ loglevel: LogLevel.info, message: 'test', action: Action.finish, inputId: 0, ref });

        expect(consoleDraftMock).toBeCalledWith(' ');

        expect(consoleUpdateMock).toBeCalledWith('ok test');
    });

    it('finish spinner on success (with start)', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test2', action: Action.finish, inputId: 0, ref });

        expect(consoleDraftMock).toBeCalledWith(' ');

        expect(consoleUpdateMock).toBeCalledWith('- test1');

        expect(consoleUpdateMock).toBeCalledWith('ok test2');
    });

    it('finish spinner on fail (without start)', () => {
        appender({ loglevel: LogLevel.error, message: 'test', action: Action.finish, inputId: 0, ref });

        expect(consoleDraftMock).toBeCalledWith(' ');

        expect(consoleUpdateMock).toBeCalledWith('error test');
    });

    it('finish spinner on fail (with start)', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.error, message: 'test2', action: Action.finish, inputId: 0, ref });

        expect(consoleDraftMock).toBeCalledWith(' ');

        expect(consoleUpdateMock).toBeCalledWith('- test1');

        expect(consoleUpdateMock).toBeCalledWith('error test2');
    });

    it('finish spinner on update (without start)', () => {
        appender({ loglevel: LogLevel.verbose, message: 'test', action: Action.update, inputId: 0, ref });

        expect(consoleDraftMock).toBeCalledWith(' ');

        expect(consoleUpdateMock).toBeCalledWith('test');
    });

    it('finish spinner on update (with start)', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.verbose, message: 'test2', action: Action.update, inputId: 0, ref });

        expect(consoleDraftMock).toBeCalledWith(' ');

        expect(consoleUpdateMock).toBeCalledWith('- test1');

        expect(consoleUpdateMock).toBeCalledWith('- test2');
    });

    it('log static text', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.log, inputId: 0, ref });

        expect(consoleDraftMock).toBeCalledWith(' ');

        expect(consoleUpdateMock).toBeCalledWith('test1');
    });

    it('multiline log', () => {
        appender({ loglevel: LogLevel.info, message: 'test1\n123', action: Action.log, inputId: 0, ref });

        expect(consoleDraftMock).toBeCalledWith(' ');
        expect(consoleDraftMock).toBeCalledTimes(2);

        expect(consoleUpdateMock).toBeCalledWith('test1');
        expect(consoleUpdateMock).toBeCalledWith('123');
    });

    it('multiline spinner', () => {
        appender({ loglevel: LogLevel.info, message: 'test1\n123', action: Action.start, inputId: 0, ref });

        expect(consoleDraftMock).toBeCalledWith(' ');
        expect(consoleDraftMock).toBeCalledTimes(2);

        expect(consoleUpdateMock).toBeCalledWith('- test1');
        expect(consoleUpdateMock).toBeCalledWith('  123');
    });

    it('multiline clean excess lines', () => {
        appender({ loglevel: LogLevel.info, message: 'test1\n123', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.update, inputId: 0, ref });

        expect(consoleDraftMock).toBeCalledWith(' ');
        expect(consoleDraftMock).toBeCalledTimes(2);

        expect(consoleUpdateMock).toBeCalledWith('- test1');
        expect(consoleUpdateMock).toBeCalledWith('  123');
        expect(consoleUpdateMock).toBeCalledWith('');
    });

    it('gc test', async () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref: /** @type {WeakRef<never>} */ (new WeakRef({})) });

        expect(consoleDraftMock).toBeCalledWith(' ');

        expect(consoleUpdateMock).toBeCalledWith('- test1');

        await waitFor(50);

        /** @type {any} */ (global).gc();

        await waitFor(50);

        appender({ loglevel: LogLevel.verbose, message: 'test2', action: Action.update, inputId: 1, ref });

        expect(consoleUpdateMock).toBeCalledWith('test2');

        expect(consoleDraftMock).toBeCalledTimes(2);
    });

    it('gc test 2 (empty ref)', async () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref: /** @type {WeakRef<never>} */ (new WeakRef({})) });
        appender({ loglevel: LogLevel.info, message: 'test2', action: Action.start, inputId: 1, ref: /** @type {any} */ (null), parentId: 0 });

        await waitFor(50);

        /** @type {any} */ (global).gc();

        await waitFor(50);

        appender({ loglevel: LogLevel.verbose, message: 'test3', action: Action.update, inputId: 2, ref });

        expect(consoleUpdateMock).toBeCalledTimes(4);
    });

    it('gc test 3 (remove lines when children are freed as well and not spinning)', async () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.update, inputId: 0, ref: /** @type {WeakRef<never>} */ (new WeakRef({})) });
        appender({
            loglevel: LogLevel.info,
            message: 'test2',
            action: Action.update,
            inputId: 1,
            ref: /** @type {WeakRef<never>} */ (new WeakRef({})),
            parentId: 0,
        });

        await waitFor(50);

        /** @type {any} */ (global).gc();

        await waitFor(50);

        appender({ loglevel: LogLevel.verbose, message: 'test3', action: Action.update, inputId: 2, ref });

        expect(consoleUpdateMock).toBeCalledTimes(3);
    });

    it('gc test for log items', async () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref: /** @type {WeakRef<never>} */ (new WeakRef({})) });
        appender({ loglevel: LogLevel.info, message: 'test2', action: Action.log, inputId: 0, ref: /** @type {WeakRef<never>} */ (new WeakRef({})) });

        expect(consoleDraftMock).toBeCalledWith(' ');

        expect(consoleUpdateMock).toBeCalledWith('- test1');
        expect(consoleUpdateMock).toBeCalledWith('test2');

        await waitFor(50);

        /** @type {any} */ (global).gc();

        await waitFor(1050); // wait for 2 cycles after gc

        expect(consoleDraftMock).toBeCalledTimes(2);
    });

    it('setInterval finishes (moving active parent)', async () => {
        appender({ loglevel: LogLevel.info, message: '+test2', action: Action.start, inputId: 2, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test3', action: Action.start, inputId: 3, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test4', action: Action.start, inputId: 4, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test0', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.info, message: '+test4_f', action: Action.finish, inputId: 4, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test5', action: Action.start, inputId: 5, ref, parentId: 0 });
        appender({ loglevel: LogLevel.info, message: '+test2_f', action: Action.finish, inputId: 2, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 3, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 5, ref, parentId: 0 });
        appender({ loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 0, ref });

        await waitFor(550);

        expect(consoleUpdateMock).toBeCalledTimes(38);
    });

    it('setInterval finishes 2 (moving static parent)', async () => {
        appender({ loglevel: LogLevel.info, message: '+test2', action: Action.start, inputId: 2, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test3', action: Action.start, inputId: 3, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test4', action: Action.start, inputId: 4, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test0', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.info, message: '+test4_f', action: Action.finish, inputId: 4, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test5', action: Action.update, inputId: 5, ref, parentId: 0 });
        appender({ loglevel: LogLevel.info, message: '+test2_f', action: Action.finish, inputId: 2, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 3, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 5, ref, parentId: 0 });
        appender({ loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 0, ref });

        await waitFor(550);

        expect(consoleUpdateMock).toBeCalledTimes(36);
    });

    it('multilevel output', () => {
        appender({ loglevel: LogLevel.info, message: '+test2', action: Action.start, inputId: 2, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test3', action: Action.start, inputId: 3, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test4', action: Action.start, inputId: 4, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test0', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.info, message: '+test4_f', action: Action.finish, inputId: 4, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test5', action: Action.start, inputId: 5, ref, parentId: 0 });
        appender({ loglevel: LogLevel.info, message: '+test2_f', action: Action.finish, inputId: 2, ref, parentId: 5 });
        appender({ loglevel: LogLevel.info, message: '+test3_f', action: Action.finish, inputId: 3, ref, parentId: 5 });

        expect(consoleUpdateMock).toBeCalledWith('    ok +test3_f');
        expect(consoleUpdateMock).toBeCalledWith('    ok +test2_f');
        expect(consoleUpdateMock).toBeCalledWith('    ok +test4_f');
        expect(consoleUpdateMock).toBeCalledWith('  - +test5');
        expect(consoleUpdateMock).toBeCalledWith('- +test0');
    });

    it('multilevel output 2 (adding to multilevel tree)', () => {
        appender({ loglevel: LogLevel.info, message: 'top', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'level2_1', action: Action.start, inputId: 1, ref, parentId: 0 });
        appender({ loglevel: LogLevel.info, message: 'level3_1', action: Action.start, inputId: 2, ref, parentId: 1 });
        appender({ loglevel: LogLevel.info, message: 'level2_2', action: Action.start, inputId: 3, ref, parentId: 0 });

        expect(consoleUpdateMock).toBeCalledWith('- top');
        expect(consoleUpdateMock).toBeCalledWith('  - level2_1');
        expect(consoleUpdateMock).toBeCalledWith('    - level3_1');
        expect(consoleUpdateMock).toBeCalledWith('  - level2_2');
    });
});

const testSpinner2 = {
    frames: ['-', '+'],
    interval: 10,
};

describe('draftlog appender animation', () => {
    /** @type {import('@niceties/logger/types').Appender} */
    let appender;
    /** @type {ReturnType<typeof vi.fn>} */
    let consoleUpdateMock;
    /** @type {ReturnType<typeof vi.spyOn<typeof console, 'draft'>>} */
    let consoleDraftMock;
    const ref = /** @type {WeakRef<never>} */ (new WeakRef(testSpinner));

    beforeEach(() => {
        vi.clearAllMocks();
        const formatter = createFormatter(colors, finishedPrefixes, tagFactory);
        appender = createDraftlogAppender(testSpinner2, formatter, false, 2);
        consoleUpdateMock = vi.fn();
        consoleDraftMock = vi.spyOn(global.console, 'draft').mockImplementation(
            () =>
                (/** @type {any[]} */ ...args) =>
                    consoleUpdateMock(...args)
        );
    });

    afterEach(() => {
        consoleDraftMock.mockRestore();
    });

    it('test animation', async () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref });

        expect(consoleDraftMock).toBeCalledWith(' ');

        expect(consoleUpdateMock).toBeCalledWith('- test1');

        await waitFor(100);

        expect(consoleUpdateMock).toBeCalledWith('+ test1');
    });
});

describe('prepend config', () => {
    /** @type {import('@niceties/logger/types').Appender} */
    let appender;
    /** @type {ReturnType<typeof vi.fn>} */
    let consoleUpdateMock;
    /** @type {ReturnType<typeof vi.spyOn<typeof console, 'draft'>>} */
    let consoleDraftMock;
    const ref = /** @type {WeakRef<never>} */ (new WeakRef(testSpinner));

    beforeEach(() => {
        vi.clearAllMocks();
        const formatter = createFormatter(colors, finishedPrefixes, tagFactory);
        appender = createDraftlogAppender(testSpinner, formatter, true, 2);
        consoleUpdateMock = vi.fn();
        consoleDraftMock = vi.spyOn(global.console, 'draft').mockImplementation(
            () =>
                (/** @type {any[]} */ ...args) =>
                    consoleUpdateMock(...args)
        );
    });

    afterEach(() => {
        consoleDraftMock.mockRestore();
    });

    it('prepend log', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.log, inputId: 0, ref });

        expect(consoleDraftMock).toBeCalledWith(' ');

        expect(consoleUpdateMock).toBeCalledWith('test1');
    });
});
