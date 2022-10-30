import { globalAppender } from './global-appender';
import { Action, Appender, LogLevel, LogMessage } from './types';

export const createLogger = <ErrorContext = Error>(tag?: string) => {
    let myAppender = (message: LogMessage<ErrorContext>) => { globalAppender && globalAppender(message); };

    return Object.assign(
        (message: string, loglevel: LogLevel = LogLevel.info, context?: ErrorContext) => {
            myAppender && myAppender({
                action: Action.log,
                message,
                loglevel,
                tag,
                context
            } as LogMessage<ErrorContext>);
        }, {
            appender(appender?: Appender<ErrorContext>) {
                if (appender !== undefined) {
                    myAppender = appender;
                }
                return myAppender;
            }
        }
    );
};
