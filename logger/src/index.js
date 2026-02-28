/**
 * @template [ErrorContext=Error]
 * @typedef {import('./types.js').LogMessage<ErrorContext>} LogMessage
 */

import { createLogger } from './core.js';
import { appender } from './global-appender.js';
import { LogLevel } from './types.js';

if (!appender()) {
    const [
        { asciiPrefixes, asciiLogPrefixes, colors, unicodePrefixes, unicodeLogPrefixes, tagFactory },
        { createConsoleAppender },
        { createFormatter, terminalSupportsUnicode },
        { filterMessages },
    ] = await Promise.all([
        import('./default-formatting.js'),
        import('./console-appender.js'),
        import('./format-utils.js'),
        import('./appender-utils.js'),
    ]);
    const unicode = terminalSupportsUnicode();
    const formatter = createFormatter(
        colors,
        unicode ? unicodePrefixes : asciiPrefixes,
        unicode ? unicodeLogPrefixes : asciiLogPrefixes,
        tagFactory
    );
    let minLogLevel = LogLevel.info;
    const filtered = filterMessages(
        /** @param {LogMessage} message */
        message => /** @type {number} */ (message.loglevel) >= minLogLevel,
        createConsoleAppender(formatter)
    );
    filtered.api = {
        /**
         * @param {number} logLevel
         */
        setMinLevel(logLevel) {
            minLogLevel = logLevel;
        },
    };
    appender(filtered);
}

export * from './types.js';
export { createLogger, appender };
