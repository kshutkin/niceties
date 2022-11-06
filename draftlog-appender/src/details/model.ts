import { Action, LogLevel, LogMessage } from '@niceties/logger/types';
import { append, appendRange, List, ListNode, prepend, remove, removeRange } from '@slimlib/list';

export const enum ItemStatus {
    finished,
    inprogress
}
export interface ModelItem extends Partial<ListNode> {
    inputId?: number;
    message: string;
    status?: ItemStatus; // undefined means static
    loglevel: LogLevel;
    ref?: WeakRef<never>;
    parentId?: number;
    dirty?: boolean;
    lastLeaf?: ModelItem;
    tag?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context?: any;
}

export type Model = List<ModelItem> & {
    skipLines: number;
    tick: number;
    spinning: number;
}

export function createModel(logAboveSpinners: boolean): [(logMessage: LogMessage) => Model, () => Model] {
    const model: Model = new List<ModelItem>() as Model;
    const itemById: { [key: number]: ModelItem; } = Object.create(null);

    model.tick = model.skipLines = model.spinning = 0;

    return [({ action, ...item }: LogMessage & ModelItem) => {
        // item has status undefined, so it is static by default
        item.dirty = true;
        const { inputId } = item;
        if (action === Action.start) {
            item.status = ItemStatus.inprogress;
        }
        if (action === Action.finish) {
            item.status = ItemStatus.finished;
        }
        if (action !== Action.log) {
            // if status still empty in the original item or item does not exists it will remain empty and static
            updateModel(inputId as number, item);
        }
        cleanupModel();
        if (action === Action.log) {
            appendToModel(item, logAboveSpinners);
        }
        return model;
    }, () => {
        cleanupModel();
        return model;
    }];

    function appendToModel(item: ModelItem, head: boolean) {
        if (head) {
            prepend(model, item);
        } else {
            append(model, item);
        }
        model.spinning += (item.status || 0);
    }

    function updateModel(inputId: number, options: ModelItem): void {
        const modelItem = itemById[inputId];
        if (!modelItem) {
            const item: ModelItem = { inputId: inputId, ...options };
            itemById[inputId] = item;
            const itemParentId = item.parentId;
            if (itemParentId != null) {
                putIntoChildren(itemParentId, item, item);
            } else {
                appendToModel(item, false);
            }
        } else {
            const statusDiff = (options.status || 0) - (modelItem.status || 0);
            const moveIntoParent = options.parentId != null && modelItem.parentId == null;
            Object.assign(modelItem, options);
            model.spinning += statusDiff;
            if (moveIntoParent) {
                const lastLeaf = getLastLeaf(modelItem);
                model.spinning -= (modelItem.status || 0);
                modelItem.dirty = true;
                removeRange(modelItem as ListNode, lastLeaf as ListNode);
                putIntoChildren(modelItem.parentId as number, modelItem, lastLeaf);
            }
        }
    }

    function putIntoChildren(itemParentId: number, begin: ModelItem, end: ModelItem) {
        let parent = itemById[itemParentId];
        if (!parent) {
            parent = { inputId: itemParentId, message: '', loglevel: 0, ref: new WeakRef(model) as WeakRef<never> } as ModelItem;
            appendToModel(parent, false);
            itemById[itemParentId] = parent;
        }
        appendRange((getLastLeaf(parent)) as ListNode, begin as ListNode, end as ListNode);
        parent.lastLeaf = begin;
        model.spinning += (begin.status || 0);
    }

    function cleanupModel() {
        for (const item of model) {
            if (!item.ref?.deref()) {
                model.skipLines += 1;
                item.inputId != null && delete itemById[item.inputId];
                remove(item);
            } else {
                break;
            }
        }
    }
}

function getLastLeaf(modelItem: ModelItem) {
    let lastLeaf = modelItem;
    while (lastLeaf.lastLeaf) {
        lastLeaf = lastLeaf.lastLeaf;
    }
    return lastLeaf;
}
