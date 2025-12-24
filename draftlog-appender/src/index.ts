import { LogLevel, type LogMessage } from '@niceties/logger';
import { filterMessages } from '@niceties/logger/appender-utils';
import { asciiPrefixes, colors, tagFactory, unicodePrefixes } from '@niceties/logger/default-formatting';
import { createFormatter, terminalSupportsUnicode } from '@niceties/logger/format-utils';
import { appender } from '@niceties/logger/global-appender';

import { createDraftlogAppender } from './core';
import { dots, line } from './spinners';

if (!process.env.CI) {
    const supportsUnicode = terminalSupportsUnicode();
    const spinner = supportsUnicode ? dots : line;
    const formatter = createFormatter(colors, supportsUnicode ? unicodePrefixes : asciiPrefixes, tagFactory);

    let minLogLevel = LogLevel.info;
    appender(
        filterMessages<Error, { setMinLevel(logLevel: LogLevel): void }>(
            (message: LogMessage) => message.loglevel >= minLogLevel,
            createDraftlogAppender(spinner, formatter, true, 2),
            {
                setMinLevel(logLevel: LogLevel) {
                    minLogLevel = logLevel;
                },
            }
        )
    );
}
