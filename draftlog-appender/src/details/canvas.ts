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

export const createCanvas = (spinner: Spinner, formatter: Formatter, ident: number) => {
    draftlog(console);
    (draftlog as never as DraftlogConfig).defaults.canReWrite = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updaters: Array<(message?: any, ...optionalParams: any[]) => void> = [];

    const getPrefix = (status: ItemStatus, tick: number): string | boolean => {
        // status is truthy when it is inprogress
        return status ? spinner.frames[tick] :
            // status not null when it is finished
            status != null;
    };

    return (model: Model) => {
        if (model.skipLines) {
            updaters.splice(0, model.skipLines);
            model.skipLines = 0;
        }
        let key = 0, dirty = false;
        const stack: (ModelItem | null)[] = [];
        for (const item of model) {
            const updater = getNextUpdater();
            if (dirty || item.dirty || item.status) {
                const prefix = getPrefix(item.status as ItemStatus, model.tick);
                updater(formatter({
                    loglevel: item.loglevel,
                    message: item.message,
                    context: item.context,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    action: (item.status === undefined ? Action.log : undefined) as unknown as any,
                    tag: item.tag
                }, prefix, ident * stack.length));
                if (item.dirty) {
                    item.dirty = false;
                    dirty = true;
                }
            }
            // iterate
            ++key;
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

        function getNextUpdater() {
            let updater = updaters[Number(key)];
            if (!updater) {
                updater = console.draft(' ');
                updaters.push(updater);
            }
            return updater;
        }
    };
};
