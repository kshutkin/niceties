import { Action, Formatter, LogMessage } from './types';

export function createConsoleAppender(formatter: Formatter) {
    return function consoleAppender(message: LogMessage) {
        console.log(formatter(message, message.action === Action.finish));
    };
}
