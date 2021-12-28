import { createLogger } from './core';
import { appender } from './global-appender';
import { LogLevel, LogMessage } from './types';
/* @ifdef umd
import { asciiPrefixes, colors, unicodePrefixes } from './default-formatting';
import { createConsoleAppender } from './console-appender';
import { createFormatter, terminalSupportsUnicode } from './format-utils';
import { filterMessages } from './appender-utils';
// @endif */

if (!appender()) {
    // @ifdef esm
    const [
        { asciiPrefixes, colors, unicodePrefixes },
        { createConsoleAppender },
        { createFormatter, terminalSupportsUnicode },
        { filterMessages }
    ] = await Promise.all([
        import('./default-formatting'),
        import('./console-appender'),
        import('./format-utils'),
        import('./appender-utils')
    ]);
    // @endif
    /* @ifdef cjs
    const { asciiPrefixes, colors, unicodePrefixes } = require('./default-formatting.cjs');
    const { createConsoleAppender } = require('./console-appender.cjs');
    const { createFormatter, terminalSupportsUnicode } = require('./format-utils.cjs');
    const { filterMessages } = require('./appender-utils.cjs');
    // @endif */
    const formatter = createFormatter(colors, terminalSupportsUnicode() ? unicodePrefixes : asciiPrefixes);
    let minLogLevel = LogLevel.info;
    appender(filterMessages(
        (message: LogMessage) => (message.loglevel as number) >= minLogLevel,
        createConsoleAppender(formatter), // eslint-disable-line indent
        { setMinLevel(logLevel: LogLevel) { minLogLevel = logLevel; } }  // eslint-disable-line indent
    ));
}

export * from './types';
export { createLogger, appender };
