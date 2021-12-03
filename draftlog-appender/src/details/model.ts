import { Action, LogLevel, LogMessage } from '@niceties/logger/types';

export const enum ItemStatus {
    finished,
    inprogress
}
export interface ModelItem {
    inputId_?: number;
    text_: string;
    status_?: ItemStatus; // undefined means static
    loglevel_: LogLevel;
    ref_?: WeakRef<never>;
    parentId_?: number;
    next_?: ModelItem;
    children_: ModelItem[];
    dirty_?: boolean;
}

export type Model = {
    items_: ModelItem[];
    skipLines_: number;
    tick_: number;
    spinning_: number;
}

export function createModel(logAboveSpinners: boolean): [(logMessage: LogMessage) => Model, () => Model] {
    const model: Model = {
        skipLines_: 0,
        tick_: 0,
        spinning_: 0,
        items_: []
    };
    const itemById: {[key: number]: ModelItem} = Object.create(null);
    return [({ message: text, inputId, action, loglevel, ref, parentId }: LogMessage): Model => {
        // item has status undefined, so it is static by default
        const item: ModelItem = { text_: text, loglevel_: loglevel, ref_: ref, parentId_: parentId, children_: [], dirty_: true };
        if (action === Action.start) {
            item.status_ = ItemStatus.inprogress;
        }
        if (action === Action.finish) {
            item.status_ = ItemStatus.finished;
        }
        if (action !== Action.log) {
            // if status still empty in the original item or item does not exists it will remain empty and static
            updateModel(inputId as number, item);
        }
        cleanupModel();
        if (action === Action.log) {
            append(item, logAboveSpinners);
        }
        return model;
    }, () => {
        cleanupModel();
        return model;
    }];

    function append(item: ModelItem, head: boolean) {
        model.items_[head ? 'unshift' : 'push'](item);
        model.spinning_ += (item.status_ || 0);
    }

    function updateModel(inputId: number, options: ModelItem): void {
        const modelItem = itemById[inputId];
        if (!modelItem) {
            const item: ModelItem = {inputId_: inputId, ...options};
            itemById[inputId] = item;
            const itemParentId = item.parentId_;
            if (itemParentId != null) {
                putIntoChildren(itemParentId, item);
            } else {
                append(item, false);
            }
        } else {
            const statusDiff = (options.status_ || 0) - (modelItem.status_ || 0);
            delete (options as Partial<ModelItem>).children_;
            const moveIntoParent = options.parentId_ != null && modelItem.parentId_ == null;
            Object.assign(modelItem, options);
            model.spinning_ += statusDiff;
            if (moveIntoParent) {
                model.items_ = model.items_.filter(item => item !== modelItem);
                model.spinning_ -= (modelItem.status_ || 0);
                modelItem.dirty_ = true;
                putIntoChildren(modelItem.parentId_ as number, modelItem);
            }
        }
    }

    function putIntoChildren(itemParentId: number, item: ModelItem) {
        let parent = itemById[itemParentId];
        if (!parent) {
            parent = { inputId_: itemParentId, text_: '', children_: [], loglevel_: 0, ref_: new WeakRef(model) as WeakRef<never> };
            append(parent, false);
            itemById[itemParentId] = parent;
        }
        parent.children_.push(item);
        model.spinning_ += (item.status_ || 0);
    }

    function cleanupModel() {
        for (const item of model.items_) {
            if (!item.ref_?.deref() && !item.children_.some(item => item.ref_?.deref())) {
                model.skipLines_ += 1 + item.children_.length;
                model.items_.shift();
                let currentItem: ModelItem | undefined = item;
                do {
                    currentItem.inputId_ != null && delete itemById[currentItem.inputId_];
                    model.spinning_ -= (currentItem.status_ || 0);
                } while ((currentItem = item.children_.pop()));
            } else {
                break;
            }
        }
    }
}