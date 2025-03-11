import { Action, type Formatter, type LogMessage } from './types';

export const createConsoleAppender = (formatter: Formatter) => {
    return (message: LogMessage) => {
        console.log(formatter(message, message.action === Action.finish));
    };
};
