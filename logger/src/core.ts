import { globalAppender } from './global-appender';
import { Action, Appender, LogLevel, LogMessage, Identity } from './types';

let globalInputId = 0;

const getOptions = (options: [] | [string | Identity | undefined] | [string, Identity]): { tag?: string, parentId?: number } => {
    let parentId, tag;
    if (options.length === 1) {
        if (typeof options[0] === 'string') {
            tag = options[0];
        } else {
            parentId = options[0]?.id;
        }
    } else if (options.length === 2) {
        tag = options[0];
        parentId = options[1]?.id;
    }
    return { parentId, tag };
};

export const createLogger = <ErrorContext = Error>(...args: [] | [string | Identity | undefined] | [string, Identity]) => {
    let initialLogLevel: number = LogLevel.info;

    let myAppender = (message: LogMessage<ErrorContext>) => { globalAppender && globalAppender(message); };
    
    const inputId = globalInputId++;
    
    const { tag, parentId } = getOptions(args);
    
    const append = (message: string, action: Action, loglevel: LogLevel, context?: ErrorContext) => {
        myAppender && myAppender({
            action,
            inputId,
            message,
            loglevel,
            tag,
            parentId,
            ref,
            context
        } as LogMessage<ErrorContext>);
    };

    const loggerInstance = Object.assign(
        (message: string, loglevel: LogLevel = LogLevel.info, context?: ErrorContext) => {
            append(message, Action.log, loglevel, context);
        }, {
            // Fine to be started multiple times
            start(message: string, loglevel?: LogLevel, context?: ErrorContext) {
                if (loglevel !== undefined) {
                    initialLogLevel = loglevel;
                }
                append(message, Action.start, initialLogLevel, context);
            },
            // Fine to be updated multiple times
            update(message: string, loglevel?: LogLevel, context?: ErrorContext) {
                append(message, Action.update, loglevel ?? initialLogLevel, context);
            },
            // Fine to be finished multiple times
            finish(message: string, loglevel?: LogLevel, context?: ErrorContext) {
                append(message, Action.finish, loglevel ?? initialLogLevel, context);
            },
            appender(appender?: Appender<ErrorContext>) {
                if (appender !== undefined) {
                    myAppender = appender;
                }
                return myAppender;
            }
        }
    );

    Object.defineProperty(loggerInstance, 'id', {
        value: inputId,
        writable: false
    });

    const ref = new WeakRef(loggerInstance);

    return loggerInstance as typeof loggerInstance & Identity;
};
