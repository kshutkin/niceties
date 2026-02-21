/**
 * @template [ErrorContext=Error]
 * @typedef {import('./types.js').Appender<ErrorContext>} Appender
 */

/**
 * @template [ErrorContext=Error]
 * @typedef {import('./types.js').LogMessage<ErrorContext>} LogMessage
 */

/**
 * @typedef {import('./types.js').Identity} Identity
 */

import { globalAppender } from './global-appender.js';
import { Action, LogLevel } from './types.js';

let globalInputId = 0;

/**
 * @param {[] | [string | Identity | undefined] | [string, Identity]} options
 * @returns {{ tag?: string; parentId?: number }}
 */
const getOptions = options => {
    /** @type {number | undefined} */
    let parentId;
    /** @type {string | undefined} */
    let tag;
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

/**
 * @template [ErrorContext=Error]
 * @param {...(string | Identity | undefined)} args
 * @returns {((message: string, loglevel?: number, context?: ErrorContext) => void) & {
 *   start(message: string, loglevel?: number, context?: ErrorContext): void;
 *   update(message: string, loglevel?: number, context?: ErrorContext): void;
 *   finish(message: string, loglevel?: number, context?: ErrorContext): void;
 *   appender(appender?: Appender<ErrorContext>): (message: LogMessage<ErrorContext>) => void;
 * } & Identity}
 */
export const createLogger = (...args) => {
    let initialLogLevel = LogLevel.info;

    /** @type {(message: LogMessage<ErrorContext>) => void} */
    let myAppender = message => {
        globalAppender?.(message);
    };

    const inputId = globalInputId++;

    const { tag, parentId } = getOptions(/** @type {[] | [string | Identity | undefined] | [string, Identity]} */ (args));

    /**
     * @param {string} message
     * @param {number} action
     * @param {number} loglevel
     * @param {ErrorContext} [context]
     */
    const append = (message, action, loglevel, context) => {
        myAppender?.(
            /** @type {LogMessage<ErrorContext>} */ ({
                action,
                inputId,
                message,
                loglevel,
                tag,
                parentId,
                ref,
                context,
            })
        );
    };

    const loggerInstance = Object.assign(
        /**
         * @param {string} message
         * @param {number} [loglevel]
         * @param {ErrorContext} [context]
         */
        (message, loglevel = LogLevel.info, context) => {
            append(message, Action.log, loglevel, context);
        },
        {
            /**
             * @param {string} message
             * @param {number} [loglevel]
             * @param {ErrorContext} [context]
             */
            start(message, loglevel, context) {
                if (loglevel !== undefined) {
                    initialLogLevel = loglevel;
                }
                append(message, Action.start, initialLogLevel, context);
            },
            /**
             * @param {string} message
             * @param {number} [loglevel]
             * @param {ErrorContext} [context]
             */
            update(message, loglevel, context) {
                append(message, Action.update, loglevel ?? initialLogLevel, context);
            },
            /**
             * @param {string} message
             * @param {number} [loglevel]
             * @param {ErrorContext} [context]
             */
            finish(message, loglevel, context) {
                append(message, Action.finish, loglevel ?? initialLogLevel, context);
            },
            /**
             * @param {Appender<ErrorContext>} [appender]
             * @returns {(message: LogMessage<ErrorContext>) => void}
             */
            appender(appender) {
                if (appender !== undefined) {
                    myAppender = appender;
                    const api = appender.api;
                    if (api != null) {
                        Object.setPrototypeOf(api, Function.prototype);
                        Object.setPrototypeOf(loggerInstance, api);
                    } else {
                        Object.setPrototypeOf(loggerInstance, Function.prototype);
                    }
                }
                return myAppender;
            },
        }
    );

    Object.defineProperty(loggerInstance, 'id', {
        value: inputId,
        writable: false,
    });

    const ref = new WeakRef(loggerInstance);

    return /** @type {typeof loggerInstance & Identity} */ (loggerInstance);
};
