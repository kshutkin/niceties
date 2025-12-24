import type { Appender } from './types';

export let globalAppender: Appender<unknown>;

export const appender = <ErrorContext = Error>(appender?: Appender<ErrorContext>) => {
    if (appender !== undefined) {
        globalAppender = appender as Appender<unknown>;
    }
    return globalAppender;
};
