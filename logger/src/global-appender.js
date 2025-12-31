/**
 * @template [ErrorContext=Error]
 * @typedef {import('./types.js').Appender<ErrorContext>} Appender
 */

/**
 * @type {Appender<unknown> | undefined}
 */
export let globalAppender;

/**
 * @template [ErrorContext=Error]
 * @param {Appender<ErrorContext>} [newAppender]
 * @returns {Appender<unknown> | undefined}
 */
export const appender = (newAppender) => {
    if (newAppender !== undefined) {
        globalAppender = /** @type {Appender<unknown>} */ (newAppender);
    }
    return globalAppender;
};