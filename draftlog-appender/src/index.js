/**
 * @typedef {import('@niceties/logger/types').LogMessage} LogMessage
 */

import { filterMessages } from '@niceties/logger/appender-utils';
import {
    asciiLogPrefixes,
    asciiPrefixes,
    colors,
    tagFactory,
    unicodeLogPrefixes,
    unicodePrefixes,
} from '@niceties/logger/default-formatting';
import { createFormatter, terminalSupportsUnicode } from '@niceties/logger/format-utils';
import { appender } from '@niceties/logger/global-appender';
import { LogLevel } from '@niceties/logger/types';

import { createDraftlogAppender } from './core.js';
import { dots, line } from './spinners.js';

if (!process.env.CI) {
    const supportsUnicode = terminalSupportsUnicode();
    const spinner = supportsUnicode ? dots : line;
    const formatter = createFormatter(
        colors,
        supportsUnicode ? unicodePrefixes : asciiPrefixes,
        supportsUnicode ? unicodeLogPrefixes : asciiLogPrefixes,
        tagFactory
    );

    let minLogLevel = LogLevel.info;
    const filtered = filterMessages(
        /** @param {LogMessage} message */
        message => /** @type {number} */ (message.loglevel) >= minLogLevel,
        createDraftlogAppender(spinner, formatter, true, 2)
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
