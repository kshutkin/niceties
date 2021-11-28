import { Appender, LogMessage } from './types';

export function filterMessages(predicate: (logMessage: LogMessage) => boolean, appender: Appender ): Appender {
    return function(logMessage: LogMessage) {
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