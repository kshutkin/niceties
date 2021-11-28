import draftlog from 'draftlog';

import { formatMessage } from '@niceties/logger/format-utils';
import { Formatting } from '@niceties/logger/types';

import { Model, ModelItem } from './model';
import { Spinner } from '../spinners';

interface DraftlogConfig {
    defaults: {
        canReWrite: boolean,
        maximumLinesUp: number
    }
}

export function createCanvas(spinner: Spinner, formatting: Formatting) {
    draftlog(console);
    (draftlog as never as DraftlogConfig).defaults.canReWrite = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updaters: Array<(message?: any, ...optionalParams: any[]) => void> = [];

    return (model: Model) => {
        if (model.skipLines_) {
            updaters.splice(0, model.skipLines_);
            model.skipLines_ = 0;
        }
        let item = model.head_, key = 0;
        while (item) {
            let updater = updaters[Number(key)];
            if (!updater) {
                updater = console.draft(' ');
                updaters.push(updater);
            }
            const [color, prefix] = getMessageFormat(item, model.tick_);
            updater('  '.repeat(item.ident_) + formatMessage(color, prefix, item.text_));
            // iterate
            item = item.next_;
            ++key;
        }
    };

    function getMessageFormat({loglevel_: loglevel, status_: status}: ModelItem, tick: number): [((message: string) => string) | undefined, string] {
        // status is truthy when it is inprogress
        const prefix = status ? (spinner.frames[tick] + ' ') :
            // status not null when it is finished
            (status != null ? formatting.finishedPrefixes[loglevel] : '');
        const color = formatting.colors[loglevel];
        return [ color, prefix ];
    }
}
