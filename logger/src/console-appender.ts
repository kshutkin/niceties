import { Action, Formatting, LogLevel, LogMessage } from './types';
import { formatMessage } from './format-utils';

export function createConsoleAppender(formatting: Formatting) {
    return function consoleAppender({loglevel, action, message}: LogMessage) {
        const [ color, prefix ] = getMessageFormat(action === Action.finish, loglevel);
        console.log(formatMessage(color, prefix, message));
    };

    function getMessageFormat(finished: boolean, loglevel: LogLevel): [((message: string) => string) | undefined, string] {
        const prefix = finished ? formatting.finishedPrefixes[loglevel] : '';
        const color = formatting.colors[loglevel];
        return [ color, prefix ];
    }
}
