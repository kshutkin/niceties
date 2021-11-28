import { combineAppenders } from './appender-utils';
import { Action, Appender, LogLevel, LogMessage, Identity } from './types';

let globalInputId = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let globalAppender: Appender<any>;

export function setAppender<ErrorContext = Error>(appender: Appender<ErrorContext>) {
    globalAppender = appender;
}

export function getAppender<ErrorContext = Error>(): Appender<ErrorContext> {
    return globalAppender;
}

export function createLogger<ErrorContext = Error>(...args: [] | [string | Identity] | [string, Identity]) {
    let initialLogLevel: number = LogLevel.info;
    
    const inputId = globalInputId++;
    
    const { tag, parentId } = getOptions(args);
    
    let myAppender = (message: LogMessage<ErrorContext>) => globalAppender(message);

    const loggerInstance = Object.assign(
        function log(message: string, loglevel: LogLevel = LogLevel.info, context?: ErrorContext) {
            append(message, Action.log, loglevel, context);
        }, {
            // Fine to be started multiple times
            start(message: string, loglevel?: LogLevel) {
                if (loglevel !== undefined) {
                    initialLogLevel = loglevel;
                }
                append(message, Action.start, initialLogLevel);
            },
            // Fine to be updated multiple times
            update(message: string, loglevel?: LogLevel) {
                append(message, Action.update, loglevel || initialLogLevel);
            },
            // Fine to be finished multiple times
            finish(message: string, loglevel?: LogLevel) {
                append(message, Action.finish, loglevel || initialLogLevel);
            },
            withAppender(appender: Appender<ErrorContext>) {
                myAppender = combineAppenders(myAppender, appender);
                return loggerInstance;
            }
        }
    );

    Object.defineProperty(loggerInstance, 'id', {
        value: inputId,
        writable: false
    });

    const ref = new WeakRef(loggerInstance);

    return loggerInstance;

    function append(message: string, action: Action, loglevel: LogLevel, context?: ErrorContext) {
        myAppender({
            action,
            inputId,
            message,
            loglevel,
            tag,
            parentId,
            ref,
            context
        } as LogMessage<ErrorContext>);
    }
}

function getOptions(options: [] | [string | Identity] | [string, Identity]): { tag?: string, parentId?: number } {
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
}
