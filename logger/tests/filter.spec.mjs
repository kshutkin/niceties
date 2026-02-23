import { describe, expect, it, vi } from 'vitest';

import { filterMessages } from '../src/appender-utils.js';
import { appender } from '../src/global-appender.js';
import { Action, LogLevel } from '../src/types.js';

describe('filter', () => {
    const ref = new WeakRef({});

    it('filter out message', () => {
        const mockAppender = vi.fn();
        const decoratedAppender = filterMessages(() => false, mockAppender);
        decoratedAppender({
            loglevel: LogLevel.info,
            message: 'test',
            action: Action.start,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (ref),
        });
        expect(mockAppender).not.toBeCalled();
    });

    it('filter passes message', () => {
        const mockAppender = vi.fn();
        const decoratedAppender = filterMessages(() => true, mockAppender);
        decoratedAppender({
            loglevel: LogLevel.info,
            message: 'test',
            action: Action.start,
            inputId: 0,
            ref: /** @type {WeakRef<never>} */ (ref),
        });
        expect(mockAppender).toBeCalledWith({ loglevel: LogLevel.info, message: 'test', action: Action.start, inputId: 0, ref });
    });

    it('forwards api from inner appender', () => {
        const mockAppender = vi.fn();
        const api = { setMinLevel(/** @type {number} */ _level) {} };
        mockAppender.api = api;
        const decoratedAppender = filterMessages(() => true, mockAppender);
        expect(decoratedAppender.api).toBe(api);
    });

    it('does not set api when inner appender has no api', () => {
        const mockAppender = vi.fn();
        const decoratedAppender = filterMessages(() => true, mockAppender);
        expect(decoratedAppender.api).toBeUndefined();
    });
});

describe('global appender property forwarding', () => {
    it('forwards appender api properties onto the appender function', () => {
        let minLevel = LogLevel.info;
        const mockAppender = vi.fn();
        const filtered = filterMessages(
            (/** @type {import('../src/types.js').LogMessage} */ msg) => /** @type {number} */ (msg.loglevel) >= minLevel,
            mockAppender
        );
        filtered.api = {
            /** @param {number} level */
            setMinLevel(level) {
                minLevel = level;
            },
        };
        appender(filtered);
        expect(/** @type {any} */ (appender).setMinLevel).toBe(filtered.api.setMinLevel);
    });

    it('cleans up old api properties when swapping appenders', () => {
        const mockAppender1 = vi.fn();
        const filtered1 = filterMessages(() => true, mockAppender1);
        filtered1.api = {
            customMethod1() {
                return 'one';
            },
        };
        appender(filtered1);
        expect(/** @type {any} */ (appender).customMethod1).toBeDefined();

        const mockAppender2 = vi.fn();
        const filtered2 = filterMessages(() => true, mockAppender2);
        filtered2.api = {
            customMethod2() {
                return 'two';
            },
        };
        appender(filtered2);
        expect(/** @type {any} */ (appender).customMethod1).toBeUndefined();
        expect(/** @type {any} */ (appender).customMethod2).toBeDefined();
    });

    it('cleans up api properties when swapping to appender without api', () => {
        const mockAppender1 = vi.fn();
        const filtered1 = filterMessages(() => true, mockAppender1);
        filtered1.api = {
            customMethod() {
                return 'value';
            },
        };
        appender(filtered1);
        expect(/** @type {any} */ (appender).customMethod).toBeDefined();

        appender(vi.fn());
        expect(/** @type {any} */ (appender).customMethod).toBeUndefined();
    });

    it('forwarded method works correctly on the appender function', () => {
        let minLevel = LogLevel.info;
        const mockAppender = vi.fn();
        const filtered = filterMessages(
            (/** @type {import('../src/types.js').LogMessage} */ msg) => /** @type {number} */ (msg.loglevel) >= minLevel,
            mockAppender
        );
        filtered.api = {
            /** @param {number} level */
            setMinLevel(level) {
                minLevel = level;
            },
        };
        appender(filtered);

        /** @type {any} */ (appender).setMinLevel(LogLevel.error);
        appender()?.({
            loglevel: LogLevel.info,
            message: 'should be filtered',
            action: Action.log,
        });
        expect(mockAppender).not.toBeCalled();

        appender()?.({
            loglevel: LogLevel.error,
            message: 'should pass',
            action: Action.log,
        });
        expect(mockAppender).toBeCalled();
    });
});
