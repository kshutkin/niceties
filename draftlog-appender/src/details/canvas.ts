import draftlog from 'draftlog';

import { Formatter } from '@niceties/logger/types';

import { ItemStatus, Model, ModelItem } from './model';
import { Spinner } from '../spinners';
import { Action } from '@niceties/logger';

interface DraftlogConfig {
    defaults: {
        canReWrite: boolean,
        maximumLinesUp: number
    }
}

export function createCanvas(spinner: Spinner, formatter: Formatter, ident: number) {
    draftlog(console);
    (draftlog as never as DraftlogConfig).defaults.canReWrite = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updaters: Array<(message?: any, ...optionalParams: any[]) => void> = [];    

    return (model: Model) => {
        if (model.skipLines) {
            updaters.splice(0, model.skipLines);
            model.skipLines = 0;
        }
        let key = 0, dirty = false;
        const stack: (ModelItem | null)[] = [];
        for (const item of model) {
            if (dirty || item.dirty || item.status) {
                let prefix = getPrefix(item.status as ItemStatus, model.tick), prefixUpdated = false;
                const subitems = substrings(item.message);
                for (const message of subitems) {
                    let updater = updaters[key++];
                    if (!updater) {
                        updater = console.draft(' ');
                        updaters.push(updater);
                    }
                    updater(formatter({
                        loglevel: item.loglevel,
                        message,
                        context: item.context,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        action: (item.status === undefined ? Action.log : undefined) as unknown as any,
                        tag: item.tag
                    }, prefix, ident * stack.length));
                    if (subitems.length > 1 && typeof prefix === 'string' && !prefixUpdated) {
                        prefix = prefix.replaceAll(/./g, ' ');
                        prefixUpdated = true;
                    }
                }
                if (item.dirty) {
                    item.dirty = false;
                    dirty = true;
                }
            } else {
                // iterate
                key += substrings(item.message).length;
            }
            if (stack[stack.length - 1] === item) {
                stack[stack.length - 1] = null;
            }
            if (item.lastLeaf) {
                stack.push(item.lastLeaf);
            }
            while (stack.length && stack[stack.length - 1] == null) {
                stack.pop();
            }
        }

        while(key !== updaters.length) {
            updaters[key++]('');
        }
    };

    function getPrefix(status: ItemStatus, tick: number): string | boolean {
        // status is truthy when it is inprogress
        return status ? spinner.frames[tick] :
            // status not null when it is finished
            status != null;
    }
}

function substrings(message: string): string[] {
    return message
        .match(/.{1,80}/g) ?? [];
}
