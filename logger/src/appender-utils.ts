import { Appender, LogMessage } from './types';

export function filterMessages<ErrorContext = Error, Api extends object = object>(predicate: (logMessage: LogMessage<ErrorContext>) => boolean, appender: Appender<ErrorContext>, api?: Api): Appender<ErrorContext> & Api {
    return Object.assign(function(logMessage: LogMessage<ErrorContext>) {
        if (predicate(logMessage)) {
            appender(logMessage);
        }
    }, api);
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