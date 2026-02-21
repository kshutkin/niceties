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
export const appender = newAppender => {
    if (newAppender !== undefined) {
        globalAppender = /** @type {Appender<unknown>} */ (newAppender);
        const api = newAppender != null ? newAppender.api : undefined;
        if (api != null) {
            Object.setPrototypeOf(api, Function.prototype);
            Object.setPrototypeOf(appender, api);
        } else {
            Object.setPrototypeOf(appender, Function.prototype);
        }
    }
    return globalAppender;
};
