import { Action, LogLevel, LogMessage } from '@niceties/logger/types';

export const enum ItemStatus {
    finished,
    inprogress
}
export interface ModelItem {
    inputId?: number;
    text: string;
    status?: ItemStatus; // undefined means static
    loglevel: LogLevel;
    ref?: WeakRef<never>;
}

export type Model = {
    items: ModelItem[];
    skipLines: number;
    tick: number;
}

export function createModel(logAboveSpinners: boolean): [(logMessage: LogMessage) => Model, () => Model] {
    const model: Model = {
        items: [],
        skipLines: 0,
        tick: 0
    };
    const itemById = Object.create(null);
    return [({ message: text, inputId, action, loglevel, ref }: LogMessage): Model => {
        // item has status undefined, so it is static by default
        const item: ModelItem = { text, loglevel, ref };
        if (action === Action.start) {
            item.status = ItemStatus.inprogress;
        }
        if (action === Action.finish) {
            item.status = ItemStatus.finished;
        }
        if (action !== Action.log) {
            // if status still empty in the original item, or item does not exists it will remain empty and static
            updateModel(inputId as number, item);
        }
        cleanupModel();
        if (action === Action.log) {
            (logAboveSpinners ? prepend : append)(item);
        }
        return model;
    }, () => {
        cleanupModel();
        return model;
    }];

    function prepend(item: ModelItem) {
        model.items.unshift(item);
    }

    function append(item: ModelItem) {
        model.items.push(item);
    }

    function updateModel(inputId: number, options: ModelItem): void {
        const modelItem = itemById[inputId];
        if (!modelItem) {
            const item = {inputId, ...options};
            model.items.push(item);
            itemById[inputId] = item;
        } else {
            Object.assign(modelItem, options);
        }
    }

    function cleanupModel() {
        const initalSkip = model.skipLines;
        for (const item of model.items) {
            if (!item.ref?.deref()) {
                ++model.skipLines;
            } else {
                break;
            }
        }
        if (model.skipLines > initalSkip) {
            const deleted = model.items.splice(0, model.skipLines - initalSkip);
            for (const item of deleted) {
                item.inputId != null && delete itemById[item.inputId];
            }
        }
    }
}