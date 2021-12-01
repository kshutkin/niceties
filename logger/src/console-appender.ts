import { Action, Formatter, LogMessage } from './types';

export function createConsoleAppender(formatter: Formatter) {
    return function consoleAppender({loglevel, action, message}: LogMessage) {
        console.log(formatter(message, loglevel, action === Action.finish));
    };
}
