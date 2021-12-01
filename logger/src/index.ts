import { createLogger, filterMessages, combineAppenders } from './core';
import { appender } from './details/global-appender';
import { LogLevel, LogMessage } from './types';
/* @ifdef umd
import { asciiPrefixes, colors, unicodePrefixes } from './default-formatting';
import { createConsoleAppender } from './console-appender';
import { createFormatter, terminalSupportsUnicode } from './format-utils';
// @endif */

if (!appender()) {
    // @ifdef esm
    const [
        { asciiPrefixes, colors, unicodePrefixes },
        { createConsoleAppender },
        { createFormatter, terminalSupportsUnicode }
    ] = await Promise.all([
        import('./default-formatting'),
        import('./console-appender'),
        import('./format-utils')
    ]);
    // @endif
    /* @ifdef cjs
    const { asciiPrefixes, colors, unicodePrefixes } = require('./default-formatting');
    const { createConsoleAppender } = require('./console-appender');
    const { createFormatter, terminalSupportsUnicode } = require('./format-utils');
    // @endif */
    const formatter = createFormatter(colors, terminalSupportsUnicode() ? unicodePrefixes : asciiPrefixes);
    appender(filterMessages((message: LogMessage) => (message.loglevel as number) > LogLevel.verbose, createConsoleAppender(formatter)));
}

export * from './types';
export { createLogger, appender, filterMessages, combineAppenders };
