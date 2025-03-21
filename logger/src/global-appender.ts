import type { Appender } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let globalAppender: Appender<any>;

export const appender = <ErrorContext = Error>(appender?: Appender<ErrorContext>) => {
    if (appender !== undefined) {
        globalAppender = appender;
    }
    return globalAppender;
};
