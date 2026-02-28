import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFormatter } from '@niceties/logger/format-utils';
import { Action, LogLevel } from '@niceties/logger/types';

import { createDraftlogAppender } from '../src/core.js';

/** @type {ReturnType<typeof vi.fn>} */
let draftMock;

vi.mock('@niceties/draftlog', () => ({
    draft: (...args) => draftMock(...args),
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
const tagFactory = tag => tag;

/** @param {number} milliseconds */
const waitFor = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

describe('draftlog appender', () => {
    /** @type {import('@niceties/logger/types').Appender} */
    let appender;
    /** @type {NodeJS.Timer} */
    let interval;
    /** @type {typeof global.setInterval} */
    let setIntervalCopy;
    /** @type {ReturnType<typeof vi.fn>} */
    let consoleUpdateMock;
    const ref = /** @type {WeakRef<never>} */ (new WeakRef(testSpinner));

    beforeEach(async () => {
        vi.clearAllMocks();
        const formatter = createFormatter(colors, finishedPrefixes, tagFactory);
        appender = createDraftlogAppender(testSpinner, formatter, false, 2);
        consoleUpdateMock = vi.fn();
        draftMock = vi.fn().mockImplementation(
            () =>
                (/** @type {any[]} */ ...args) =>
                    consoleUpdateMock(...args)
        );
        setIntervalCopy = global.setInterval;
        global.setInterval = Object.assign(
            // hold interval reference
            (
                /** @type {(...args: any[]) => void} */ /** @type {(...args: any[]) => void} */ callback,
                /** @type {number} */ ms,
                /** @type {any[]} */ ...args
            ) => (interval = setIntervalCopy(callback, ms, ...args)),
            setIntervalCopy
        );
    });

    afterEach(() => {
        global.setInterval = setIntervalCopy;
        clearInterval(interval);
    });

    it('smoke', () => {
        expect(draftMock).toBeDefined();
    });

    it('start a new spinner', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref });
        expect(draftMock).toBeCalledWith('');
        expect(consoleUpdateMock).toBeCalledWith('- test1');
    });

    it('finish spinner on success (without start)', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.finish, inputId: 0, ref });

        expect(draftMock).toBeCalledWith('');

        expect(consoleUpdateMock).toBeCalledWith('ok test1');
    });

    it('finish spinner on success (with start)', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.finish, inputId: 0, ref });

        expect(draftMock).toBeCalledWith('');
        expect(draftMock).toBeCalledTimes(1);

        expect(consoleUpdateMock).toBeCalledWith('ok test1');
    });

    it('finish spinner on fail (without start)', () => {
        appender({ loglevel: LogLevel.error, message: 'test1', action: Action.finish, inputId: 0, ref });

        expect(draftMock).toBeCalledWith('');

        expect(consoleUpdateMock).toBeCalledWith('error test1');
    });

    it('finish spinner on fail (with start)', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.error, message: 'test1', action: Action.finish, inputId: 0, ref });

        expect(draftMock).toBeCalledWith('');
        expect(draftMock).toBeCalledTimes(1);

        expect(consoleUpdateMock).toBeCalledWith('error test1');
    });

    it('finish spinner on update (without start)', () => {
        appender({ loglevel: LogLevel.verbose, message: 'test1', action: Action.update, inputId: 0, ref });

        expect(draftMock).toBeCalledWith('');

        expect(consoleUpdateMock).toBeCalledWith('test1');
    });

    it('finish spinner on update (with start)', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.verbose, message: 'test1', action: Action.update, inputId: 0, ref });

        expect(draftMock).toBeCalledWith('');
        expect(draftMock).toBeCalledTimes(1);

        expect(consoleUpdateMock).toBeCalledWith('- test1');
    });

    it('log static text', () => {
        appender({ loglevel: LogLevel.verbose, message: 'test1', action: Action.log, inputId: 0, ref });

        expect(draftMock).toBeCalledWith('');

        expect(consoleUpdateMock).toBeCalledWith('test1');
    });

    it('multiline log', () => {
        appender({ loglevel: LogLevel.verbose, message: 'test1'.padEnd(200, '.'), action: Action.log, inputId: 0, ref });

        expect(draftMock).toBeCalledWith('');

        expect(draftMock).toBeCalledTimes(3);
    });

    it('multiline spinner', () => {
        appender({ loglevel: LogLevel.info, message: 'test1'.padEnd(200, '.'), action: Action.start, inputId: 0, ref });

        expect(draftMock).toBeCalledWith('');

        expect(draftMock).toBeCalledTimes(3);
    });

    it('multiline clean excess lines', () => {
        appender({ loglevel: LogLevel.info, message: 'test1'.padEnd(200, '.'), action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.finish, inputId: 0, ref });

        expect(draftMock).toBeCalledTimes(3);
        expect(consoleUpdateMock).toBeCalledWith('');
    });

    it('gc test', async () => {
        appender({
            loglevel: LogLevel.info,
            message: 'test1',
            action: Action.start,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (new WeakRef({})),
        });

        expect(draftMock).toBeCalledWith('');

        expect(consoleUpdateMock).toBeCalledWith('- test1');

        await waitFor(50);

        /** @type {any} */ (global).gc();

        await waitFor(50);

        appender({ loglevel: LogLevel.verbose, message: 'test2', action: Action.update, inputId: 1, ref });

        expect(consoleUpdateMock).toBeCalledWith('test2');

        expect(draftMock).toBeCalledTimes(2);
    });

    it('gc test 2 (empty ref)', async () => {
        appender({
            loglevel: LogLevel.info,
            message: 'test1',
            action: Action.start,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (new WeakRef({})),
        });
        appender({
            loglevel: LogLevel.info,
            message: 'test2',
            action: Action.start,
            inputId: 1,
            ref: /** @type {any} */ (null),
            parentId: 0,
        });

        await waitFor(50);

        /** @type {any} */ (global).gc();

        await waitFor(50);

        appender({ loglevel: LogLevel.verbose, message: 'test3', action: Action.update, inputId: 2, ref });

        expect(consoleUpdateMock).toBeCalledTimes(4);
    });

    it('gc test 3 (remove lines when children are freed as well and not spinning)', async () => {
        appender({
            loglevel: LogLevel.info,
            message: 'test1',
            action: Action.start,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (new WeakRef({})),
        });
        appender({
            loglevel: LogLevel.info,
            message: 'test2',
            action: Action.start,
            inputId: 1,
            ref: /** @type {WeakRef<never>} */ (new WeakRef({})),
            parentId: 0,
        });

        await waitFor(50);

        /** @type {any} */ (global).gc();

        await waitFor(50);

        appender({ loglevel: LogLevel.verbose, message: 'test3', action: Action.update, inputId: 2, ref });

        expect(consoleUpdateMock).toBeCalledTimes(4);
    });

    it('gc test for log items', async () => {
        appender({
            loglevel: LogLevel.info,
            message: 'test1',
            action: Action.log,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (new WeakRef({})),
        });
        appender({
            loglevel: LogLevel.info,
            message: 'test2',
            action: Action.log,
            inputId: 1,
            ref: /** @type {WeakRef<never>} */ (new WeakRef({})),
        });

        await waitFor(50);

        /** @type {any} */ (global).gc();

        await waitFor(50);

        expect(draftMock).toBeCalledTimes(2);
    });

    it('setInterval finishes (moving active parent)', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 1, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test2', action: Action.start, inputId: 2, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test3', action: Action.start, inputId: 3, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test0', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.finish, inputId: 1, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test2', action: Action.finish, inputId: 2, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test3', action: Action.finish, inputId: 3, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test0', action: Action.finish, inputId: 0, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test0', action: Action.finish, inputId: 0, ref });

        expect(interval._destroyed).toBe(true);
    });

    it('setInterval finishes 2 (moving static parent)', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 1, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test2', action: Action.start, inputId: 2, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test3', action: Action.start, inputId: 3, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test0', action: Action.update, inputId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.finish, inputId: 1, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test2', action: Action.finish, inputId: 2, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test3', action: Action.finish, inputId: 3, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test0', action: Action.finish, inputId: 0, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test0', action: Action.finish, inputId: 0, ref });

        expect(interval._destroyed).toBe(true);
    });

    it('multilevel output', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 1, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test2', action: Action.start, inputId: 2, parentId: 1, ref });
        appender({ loglevel: LogLevel.info, message: 'test3', action: Action.start, inputId: 3, parentId: 2, ref });
        appender({ loglevel: LogLevel.info, message: 'test0', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.finish, inputId: 1, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test2', action: Action.finish, inputId: 2, parentId: 1, ref });
        appender({ loglevel: LogLevel.info, message: 'test3', action: Action.finish, inputId: 3, parentId: 2, ref });
        appender({ loglevel: LogLevel.info, message: 'test0', action: Action.finish, inputId: 0, ref });
    });

    it('multilevel output 2 (adding to multilevel tree)', () => {
        appender({ loglevel: LogLevel.info, message: 'test0', action: Action.start, inputId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 1, parentId: 0, ref });
        appender({ loglevel: LogLevel.info, message: 'test2', action: Action.start, inputId: 2, parentId: 1, ref });
        appender({ loglevel: LogLevel.info, message: 'test3', action: Action.start, inputId: 3, parentId: 2, ref });
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
    const ref = /** @type {WeakRef<never>} */ (new WeakRef(testSpinner));

    beforeEach(() => {
        vi.clearAllMocks();
        const formatter = createFormatter(colors, finishedPrefixes, tagFactory);
        appender = createDraftlogAppender(testSpinner2, formatter, false, 2);
        consoleUpdateMock = vi.fn();
        draftMock = vi.fn().mockImplementation(
            () =>
                (/** @type {any[]} */ ...args) =>
                    consoleUpdateMock(...args)
        );
    });

    it('test animation', async () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.start, inputId: 0, ref });

        expect(draftMock).toBeCalledWith('');

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
    const ref = /** @type {WeakRef<never>} */ (new WeakRef(testSpinner));

    beforeEach(() => {
        vi.clearAllMocks();
        const formatter = createFormatter(colors, finishedPrefixes, tagFactory);
        appender = createDraftlogAppender(testSpinner, formatter, true, 2);
        consoleUpdateMock = vi.fn();
        draftMock = vi.fn().mockImplementation(
            () =>
                (/** @type {any[]} */ ...args) =>
                    consoleUpdateMock(...args)
        );
    });

    it('prepend log', () => {
        appender({ loglevel: LogLevel.info, message: 'test1', action: Action.log, inputId: 0, ref });

        expect(draftMock).toBeCalledWith('');

        expect(consoleUpdateMock).toBeCalledWith('test1');
    });
});
