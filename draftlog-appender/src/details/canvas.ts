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
        const prefix = status ? spinner.frames[tick] :
            // status not null when it is finished
            status != null;
        return prefix;
    };

    return (model: Model) => {
        if (model.skipLines_) {
            updaters.splice(0, model.skipLines_);
            model.skipLines_ = 0;
        }
        let key = 0, dirty = false;
        const stack: (ModelItem | null)[] = [];
        for (const item of model) {
            let updater = updaters[Number(key)];
            if (!updater) {
                updater = console.draft(' ');
                updaters.push(updater);
            }
            if (dirty || item.dirty_ || item.status_) {
                const prefix = getPrefix(item.status_ as ItemStatus, model.tick_);
                updater(formatter({
                    loglevel: item.loglevel_,
                    message: item.text_,
                    context: item.context_,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    action: (item.status_ === undefined ? Action.log : undefined) as unknown as any,
                    tag: item.tag_
                }, prefix, ident * stack.length));
                if (item.dirty_) {
                    item.dirty_ = false;
                    dirty = true;
                }
            }
            // iterate
            ++key;
            if (stack[stack.length - 1] === item) {
                stack[stack.length - 1] = null;
            }
            if (item.lastLeaf_) {
                stack.push(item.lastLeaf_);
            }
            while (stack.length && stack[stack.length - 1] == null) {
                stack.pop();
            }
        }
    };
};
