import { appender, filterMessages } from '@niceties/logger/core';
import { terminalSupportsUnicode, createFormatter } from '@niceties/logger/format-utils';
import { colors, unicodePrefixes, asciiPrefixes } from '@niceties/logger/default-formatting';
import { createDraftlogAppender } from './core';
import { dots, line } from './spinners';
import { Action, LogLevel, LogMessage } from '@niceties/logger';

const supportsUnicode = terminalSupportsUnicode();
const spinner = supportsUnicode ? dots : line;
const formatter = createFormatter(colors, supportsUnicode ? unicodePrefixes : asciiPrefixes);

appender(filterMessages((message: LogMessage) => message.loglevel !== LogLevel.verbose || message.action !== Action.log, createDraftlogAppender(spinner, formatter, false, 2)));
