import { filterMessages } from '@niceties/logger/appender-utils';
import { appender } from '@niceties/logger/global-appender';
import { terminalSupportsUnicode, createFormatter } from '@niceties/logger/format-utils';
import { colors, unicodePrefixes, asciiPrefixes } from '@niceties/logger/default-formatting';
import { createDraftlogAppender } from './core';
import { dots, line } from './spinners';
import { Action, LogLevel, LogMessage } from '@niceties/logger';

const supportsUnicode = terminalSupportsUnicode();
const spinner = supportsUnicode ? dots : line;
const formatter = createFormatter(colors, supportsUnicode ? unicodePrefixes : asciiPrefixes);

let minLogLevel = LogLevel.info;
appender(filterMessages<Error, { setMinLevel(logLevel: LogLevel): void; }>(
    (message: LogMessage) => message.loglevel >= minLogLevel || message.action !== Action.log,
    createDraftlogAppender(spinner, formatter, false, 2), // eslint-disable-line indent
    { setMinLevel(logLevel: LogLevel) { minLogLevel = logLevel; } } // eslint-disable-line indent
));
