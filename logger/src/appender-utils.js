/**
 * @template [ErrorContext=Error]
 * @typedef {import('./types.js').LogMessage<ErrorContext>} LogMessage
 */

/**
 * @template [ErrorContext=Error]
 * @template [Api=import('./default-extended-api.js').DefaultExtendedApi]
 * @typedef {import('./types.js').Appender<ErrorContext, Api>} Appender
 */

/**
 * @template [ErrorContext=Error]
 * @template [Api=import('./default-extended-api.js').DefaultExtendedApi]
 * @param {(logMessage: LogMessage<ErrorContext>) => boolean} predicate
 * @param {Appender<ErrorContext, Api>} appender
 * @returns {Appender<ErrorContext, Api>}
 */
export const filterMessages = (predicate, appender) => {
    /** @type {Appender<ErrorContext, Api>} */
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
 * @template [Api=import('./default-extended-api.js').DefaultExtendedApi]
 * @param {...Appender<ErrorContext, Api>} appenders
 * @returns {Appender<ErrorContext, Api>}
 */
export const combineAppenders = (...appenders) => {
    /** @type {Appender<ErrorContext, Api>} */
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
        result.api = /** @type {Api} */ (Object.assign({}, ...apis));
    }
    return result;
};
