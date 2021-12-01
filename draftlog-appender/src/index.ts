import { appender } from '@niceties/logger/core';
import { terminalSupportsUnicode, createFormatter } from '@niceties/logger/format-utils';
import { colors, unicodePrefixes, asciiPrefixes } from '@niceties/logger/default-formatting';
import { createDraftlogAppender } from './core';
import { dots, line } from './spinners';

const supportsUnicode = terminalSupportsUnicode();
const spinner = supportsUnicode ? dots : line;
const formatter = createFormatter(colors, supportsUnicode ? unicodePrefixes : asciiPrefixes);

appender(createDraftlogAppender(spinner, formatter, false, 2));

