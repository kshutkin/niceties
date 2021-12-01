import { filterMessages } from '../src/appender-utils';
import { Action, LogLevel } from '../src/types';

describe('filter', () => {

    const ref = new WeakRef({});

    it('filter out message', () => {
        const mockAppender = jest.fn();
        const decoratedAppender = filterMessages(() => false, mockAppender);
        decoratedAppender({loglevel: LogLevel.info, message: 'test', action: Action.start, inputId: 0, ref: ref as WeakRef<never>});
        expect(mockAppender).not.toBeCalled();
    });

    it('filter passes message', () => {
        const mockAppender = jest.fn();
        const decoratedAppender = filterMessages(() => true, mockAppender);
        decoratedAppender({loglevel: LogLevel.info, message: 'test', action: Action.start, inputId: 0, ref: ref as WeakRef<never>});
        expect(mockAppender).toBeCalledWith({loglevel: LogLevel.info, message: 'test', action: Action.start, inputId: 0, ref});
    });

});