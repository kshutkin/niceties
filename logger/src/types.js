/** @typedef {import('./default-extended-api.js').DefaultExtendedApi} DefaultExtendedApi */

/**
 * @readonly
 * @enum {number}
 */
export const LogLevel = /** @type {const} */ ({
    /** for debugging logs, not for displaying on screen in normal cases */
    verbose: /** @type {number} */ (0),
    /** should be printed to user but not an error */
    info: /** @type {number} */ (1),
    /** something is probably wrong, but we can continue */
    warn: /** @type {number} */ (2),
    /** operation completely failed */
    error: /** @type {number} */ (3),
});

/**
 * @readonly
 * @enum {number}
 */
export const Action = /** @type {const} */ ({
    start: 0,
    update: 1,
    finish: 2,
    log: 3,
});

/**
 * @template [ErrorContext=Error]
 * @typedef {Object} LogMessageBase
 * @property {number} loglevel
 * @property {string} message
 * @property {string} [tag]
 * @property {number} [parentId]
 * @property {ErrorContext} [context]
 */

/**
 * @template [ErrorContext=Error]
 * @typedef {LogMessageBase<ErrorContext> & { inputId: number; action: 0 | 1 | 2; ref: WeakRef<never> }} LogMessageWithInput
 */

/**
 * @template [ErrorContext=Error]
 * @typedef {LogMessageBase<ErrorContext> & { inputId?: number; action: 3; ref?: WeakRef<never> }} LogMessageLog
 */

/**
 * @template [ErrorContext=Error]
 * @typedef {LogMessageWithInput<ErrorContext> | LogMessageLog<ErrorContext>} LogMessage
 */

/**
 * @template [ErrorContext=Error]
 * @template [Api=DefaultExtendedApi]
 * @typedef {((message: LogMessage<ErrorContext>) => void) & { api?: Api }} Appender
 */

/**
 * @typedef {Object} Identity
 * @property {number} [id]
 */

/**
 * @typedef {{ [index: number]: string }} Prefixes
 */

/**
 * @typedef {{ [index: number]: ((text: string) => string) | undefined }} ColorFormatters
 */

/**
 * @template [ErrorContext=Error]
 * @callback Formatter
 * @param {LogMessage<ErrorContext>} message
 * @param {string | boolean} [usePrefix]
 * @param {number} [indentation]
 * @returns {string}
 */

/**
 * @template [ErrorContext=Error]
 * @template [Api=DefaultExtendedApi]
 * @typedef {((message: string, loglevel?: number, context?: ErrorContext) => void) & {
 *   start(message: string, loglevel?: number, context?: ErrorContext): void;
 *   update(message: string, loglevel?: number, context?: ErrorContext): void;
 *   finish(message: string, loglevel?: number, context?: ErrorContext): void;
 *   appender(appender?: Appender<ErrorContext, Api>): (message: LogMessage<ErrorContext>) => void;
 * } & Identity & Api} Logger
 */
