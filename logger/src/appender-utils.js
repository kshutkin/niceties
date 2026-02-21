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
 * @param {(logMessage: LogMessage<ErrorContext>) => boolean} predicate
 * @param {Appender<ErrorContext>} appender
 * @returns {Appender<ErrorContext>}
 */
export const filterMessages = (predicate, appender) => {
    /** @type {Appender<ErrorContext>} */
    const result = /** @param {LogMessage<ErrorContext>} logMessage */ logMessage => {
        if (predicate(logMessage)) {
            appender(logMessage);
        }
    };
    if (appender.api) {
        result.api = appender.api;
    }
    return result;
};

/**
 * @template [ErrorContext=Error]
 * @param {...Appender<ErrorContext>} appenders
 * @returns {Appender<ErrorContext>}
 */
export const combineAppenders = (...appenders) => {
    /** @type {Appender<ErrorContext>} */
    const result = (/** @type {LogMessage<ErrorContext>} */ message) => {
        for (const appender of appenders) {
            try {
                appender(message);
            } catch {
                /* eat the error */
            }
        }
    };
    const apis = appenders.map(a => a.api).filter(Boolean);
    if (apis.length > 0) {
        result.api = Object.assign({}, ...apis);
    }
    return result;
};
