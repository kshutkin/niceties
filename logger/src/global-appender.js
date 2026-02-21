/**
 * @template [ErrorContext=Error]
 * @template [Api=import('./default-extended-api.js').DefaultExtendedApi]
 * @typedef {import('./types.js').Appender<ErrorContext, Api>} Appender
 */

/**
 * @type {Appender<unknown> | undefined}
 */
export let globalAppender;

/**
 * @template [ErrorContext=Error]
 * @template [Api=import('./default-extended-api.js').DefaultExtendedApi]
 * @param {Appender<ErrorContext, Api>} [newAppender]
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
