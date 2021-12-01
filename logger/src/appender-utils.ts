import { Appender, LogMessage } from './types';

export function filterMessages<ErrorContext = Error>(predicate: (logMessage: LogMessage<ErrorContext>) => boolean, appender: Appender<ErrorContext> ): Appender<ErrorContext> {
    return function(logMessage: LogMessage<ErrorContext>) {
        if (predicate(logMessage)) {
            appender(logMessage);
        }
    };
}

export function combineAppenders<ErrorContext = Error>(...appenders: Appender<ErrorContext>[]): Appender<ErrorContext> {
    return (message: LogMessage<ErrorContext>) => {
        for(const appender of appenders) {
            try {
                appender(message);
            } catch(e) { /* eat the error */ }
        }
    };
}