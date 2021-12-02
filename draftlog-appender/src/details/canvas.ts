import draftlog from 'draftlog';

import { Formatter } from '@niceties/logger/types';

import { ItemStatus, Model, ModelItem } from './model';
import { Spinner } from '../spinners';

interface DraftlogConfig {
    defaults: {
        canReWrite: boolean,
        maximumLinesUp: number
    }
}

export function createCanvas(spinner: Spinner, formatter: Formatter, ident: number) {
    draftlog(console).addLineListener(process.stdin);
    (draftlog as never as DraftlogConfig).defaults.canReWrite = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updaters: Array<(message?: any, ...optionalParams: any[]) => void> = [];

    return (model: Model) => {
        if (model.skipLines_) {
            updaters.splice(0, model.skipLines_);
            model.skipLines_ = 0;
        }
        if (!model.items_.length) {
            return;
        }
        let key = 0;
        const stack = [[...model.items_]];
        while (stack.length) {
            const item = stack[stack.length - 1].shift() as ModelItem;
            let updater = updaters[Number(key)];
            if (!updater) {
                updater = console.draft(' ');
                updaters.push(updater);
            }
            const prefix = getMessageFormat(item.status_ as ItemStatus, model.tick_);
            updater(formatter(item.text_, item.loglevel_, prefix, ident * (stack.length - 1)));
            // iterate
            ++key;
            if (item.children_.length) {
                stack.push([...item.children_]);
            }
            while (stack.length && stack[stack.length - 1].length === 0) {
                stack.pop();
            }
        }
    };

    function getMessageFormat(status: ItemStatus, tick: number): string | boolean {
        // status is truthy when it is inprogress
        const prefix = status ? (spinner.frames[tick]) :
            // status not null when it is finished
            status != null;
        return prefix;
    }
}
