import { createLogger } from './core';
import { appender } from "./details/global-appender";
import { LogLevel, LogMessage } from './types';
/* @ifdef umd
import { formatting } from './default-formatting';
import { createConsoleAppender } from './console-appender';
import { filterMessages } from './appender-utils';
// @endif */

if (!appender()) {
    // @ifdef esm
    const [{ formatting }, { createConsoleAppender }, { filterMessages }] = await Promise.all([import('./default-formatting'), import('./console-appender'), import('./appender-utils')]);
    // @endif
    /* @ifdef cjs
    const { formatting } = require('./default-formatting');
    const { createConsoleAppender } = require('./console-appender');
    const { filterMessages } = require('./appender-utils');
    // @endif */
    appender(filterMessages((message: LogMessage) => (message.loglevel as number) > LogLevel.verbose, createConsoleAppender(formatting)));
}

export * from './types';
export { createLogger, appender };
