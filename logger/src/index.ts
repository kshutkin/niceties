import { createLogger } from './core';
import { appender } from "./details/global-appender";
import { LogLevel, LogMessage } from './types';
/* @ifdef umd
import { asciiPrefixes, colors, unicodePrefixes } from './default-formatting';
import { createConsoleAppender } from './console-appender';
import { filterMessages } from './appender-utils';
import { createFormatter, terminalSupportsUnicode } from './format-utils';
// @endif */

if (!appender()) {
    // @ifdef esm
    const [
        { asciiPrefixes, colors, unicodePrefixes },
        { createConsoleAppender },
        { filterMessages },
        { createFormatter, terminalSupportsUnicode }
    ] = await Promise.all([
        import('./default-formatting'),
        import('./console-appender'),
        import('./appender-utils'),
        import('./format-utils')
    ]);
    // @endif
    /* @ifdef cjs
    const { asciiPrefixes, colors, unicodePrefixes } = require('./default-formatting');
    const { createConsoleAppender } = require('./console-appender');
    const { filterMessages } = require('./appender-utils');
    const { createFormatter, terminalSupportsUnicode } = require('./format-utils');
    // @endif */
    const formatter = createFormatter(colors, terminalSupportsUnicode() ? unicodePrefixes : asciiPrefixes);
    appender(filterMessages((message: LogMessage) => (message.loglevel as number) > LogLevel.verbose, createConsoleAppender(formatter)));
}

export * from './types';
export { createLogger, appender };
