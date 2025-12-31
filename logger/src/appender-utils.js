/**
 * @template [ErrorContext=Error]
 * @typedef {import('./types.js').LogMessage<ErrorContext>} LogMessage
 */

/**
 * @template [ErrorContext=Error]
 * @typedef {import('./types.js').Appender<ErrorContext>} Appender
 */

/**
 * @template [ErrorContext=Error]
 * @template {object} [Api=object]
 * @param {(logMessage: LogMessage<ErrorContext>) => boolean} predicate
 * @param {Appender<ErrorContext>} appender
 * @param {Api} [api]
 * @returns {Appender<ErrorContext> & Api}
 */
export const filterMessages = (predicate, appender, api) => {
    return Object.assign(
        /** @param {LogMessage<ErrorContext>} logMessage */
        logMessage => {
            if (predicate(logMessage)) {
                appender(logMessage);
            }
        },
        api
    );
};

/**
 * @template [ErrorContext=Error]
 * @param {...Appender<ErrorContext>} appenders
 * @returns {Appender<ErrorContext>}
 */
export const combineAppenders = (...appenders) => {
    return (/** @type {LogMessage<ErrorContext>} */ message) => {
        for (const appender of appenders) {
            try {
                appender(message);
            } catch {
                /* eat the error */
            }
        }
    };
};
