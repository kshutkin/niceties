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
        if (model.skipLines) {
            updaters.splice(0, model.skipLines);
            model.skipLines = 0;
        }
        while (model.items.length > updaters.length) {
            updaters.push(console.draft(' '));
        }
        for (const [key, item] of Object.entries(model.items)) {
            const updater = updaters[Number(key)];
            const [color, prefix] = getMessageFormat(item, model.tick);
            updater(formatMessage(color, prefix, item.text));
        }
    };

    function getMessageFormat({loglevel, status}: ModelItem, tick: number): [((message: string) => string) | undefined, string] {
        const prefix = status ? (spinner.frames[tick] + ' ') :
            (status != null ? formatting.finishedPrefixes[loglevel] : '');
        const color = formatting.colors[loglevel];
        return [ color, prefix ];
    }
}
