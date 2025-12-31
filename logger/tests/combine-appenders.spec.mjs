import { jest, describe, it, expect } from '@jest/globals';
import { combineAppenders } from '../src/appender-utils.js';
import { Action, LogLevel } from '../src/types.js';

describe('combine appenders', () => {
    const ref = new WeakRef({});

    it('passes message to all appenders', () => {
        const appender1 = jest.fn();
        const appender2 = jest.fn();
        const combinedAppender = combineAppenders(appender1, appender2);
        combinedAppender({ loglevel: LogLevel.info, message: 'test', action: Action.start, inputId: 0, ref: /** @type {WeakRef<never>} */ (ref) });
        expect(appender1).toBeCalled();
        expect(appender2).toBeCalled();
    });

    it('passes message to all appenders when one of them throws', () => {
        const appender1 = jest.fn(() => {
            throw new Error();
        });
        const appender2 = jest.fn();
        const combinedAppender = combineAppenders(appender1, appender2);
        combinedAppender({ loglevel: LogLevel.info, message: 'test', action: Action.start, inputId: 0, ref: /** @type {WeakRef<never>} */ (ref) });
        expect(appender1).toBeCalled();
        expect(appender2).toBeCalled();
    });
});