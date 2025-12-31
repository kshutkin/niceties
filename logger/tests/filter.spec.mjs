import { describe, expect, it, vi } from 'vitest';

import { filterMessages } from '../src/appender-utils.js';
import { Action, LogLevel } from '../src/types.js';

describe('filter', () => {
    const ref = new WeakRef({});

    it('filter out message', () => {
        const mockAppender = vi.fn();
        const decoratedAppender = filterMessages(() => false, mockAppender);
        decoratedAppender({ loglevel: LogLevel.info, message: 'test', action: Action.start, inputId: 0, ref: /** @type {WeakRef<never>} */ (ref) });
        expect(mockAppender).not.toBeCalled();
    });

    it('filter passes message', () => {
        const mockAppender = vi.fn();
        const decoratedAppender = filterMessages(() => true, mockAppender);
        decoratedAppender({ loglevel: LogLevel.info, message: 'test', action: Action.start, inputId: 0, ref: /** @type {WeakRef<never>} */ (ref) });
        expect(mockAppender).toBeCalledWith({ loglevel: LogLevel.info, message: 'test', action: Action.start, inputId: 0, ref });
    });
});