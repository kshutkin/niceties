/**
 * @template [ErrorContext=Error]
 * @typedef {import('./types.js').Appender<ErrorContext>} Appender
 */

/**
 * @template [ErrorContext=Error]
 * @typedef {import('./types.js').LogMessage<ErrorContext>} LogMessage
 */

import { globalAppender } from './global-appender.js';
import { Action, LogLevel } from './types.js';

/**
 * @template [ErrorContext=Error]
 * @param {string} [tag]
 * @returns {((message: string, loglevel?: number, context?: ErrorContext) => void) & {
 *   appender(appender?: Appender<ErrorContext>): (message: LogMessage<ErrorContext>) => void;
 * }}
 */
export const createLogger = tag => {
    /** @type {(message: LogMessage<ErrorContext>) => void} */
    let myAppender = message => {
        globalAppender?.(message);
    };

    return Object.assign(
        /**
         * @param {string} message
         * @param {number} [loglevel]
         * @param {ErrorContext} [context]
         */
        (message, loglevel = LogLevel.info, context) => {
            myAppender?.(
                /** @type {LogMessage<ErrorContext>} */ ({
                    action: Action.log,
                    message,
                    loglevel,
                    tag,
                    context,
                })
            );
        },
        {
            /**
             * @param {Appender<ErrorContext>} [appender]
             * @returns {(message: LogMessage<ErrorContext>) => void}
             */
            appender(appender) {
                if (appender !== undefined) {
                    myAppender = appender;
                }
                return myAppender;
            },
        }
    );
};
