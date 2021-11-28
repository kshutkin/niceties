import { setAppender } from '@niceties/logger/core';
import { formatting } from '@niceties/logger/default-formatting';
import { createDraftlogAppender } from './core';
import { spinners } from './spinners';

setAppender(createDraftlogAppender({
    logAboveSpinners: false,
    defaultSpinner: 'dots',
    fallbackSpinner: 'line'
}, spinners, formatting));
