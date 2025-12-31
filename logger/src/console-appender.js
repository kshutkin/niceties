/**
 * @typedef {import('./types.js').Formatter} Formatter
 * @typedef {import('./types.js').LogMessage} LogMessage
 * @typedef {import('./types.js').Appender} Appender
 */

import { Action } from './types.js';

/**
 * @param {Formatter} formatter
 * @returns {Appender}
 */
export const createConsoleAppender = formatter => {
    return (/** @type {LogMessage} */ message) => {
        console.log(formatter(message, message.action === Action.finish));
    };
};
