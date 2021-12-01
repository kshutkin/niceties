import { combineAppenders, filterMessages } from './appender-utils';
import { globalAppender, appender } from './details/global-appender';
import { Action, Appender, LogLevel, LogMessage } from './types';

export function createLogger<ErrorContext = Error>(tag?: string) {
    let myAppender = (message: LogMessage<ErrorContext>) => { globalAppender && globalAppender(message); };

    const loggerInstance = Object.assign(
        function log(message: string, loglevel: LogLevel = LogLevel.info, context?: ErrorContext) {
            myAppender({
                action: Action.log,
                message,
                loglevel,
                tag,
                context
            } as LogMessage<ErrorContext>);
        }, {
            withFilter(predicate: (logMessage: LogMessage<ErrorContext>) => boolean) {
                myAppender = filterMessages(predicate, myAppender);
                return loggerInstance;
            },
            withAppender(appender: Appender<ErrorContext>) {
                myAppender = combineAppenders(myAppender, appender);
                return loggerInstance;
            }
        }
    );

    return loggerInstance;
}

export { appender, combineAppenders, filterMessages };