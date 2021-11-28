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
    // new fields
    leafs_: number;
    parentId_?: number;
    next_?: ModelItem;
    prev_?: ModelItem;
    ident_: number;
}

export type Model = {
    head_?: ModelItem;
    tail_?: ModelItem;
    skipLines_: number;
    tick_: number;
    spinning_: number;
}

export function createModel(logAboveSpinners: boolean): [(logMessage: LogMessage) => Model, () => Model] {
    const model: Model = {
        skipLines_: 0,
        tick_: 0,
        spinning_: 0
    };
    const itemById: {[key: number]: ModelItem} = Object.create(null);
    const lostChildren: {[key: number]: ModelItem[]} = Object.create(null);
    return [({ message: text, inputId, action, loglevel, ref, parentId }: LogMessage): Model => {
        // item has status undefined, so it is static by default
        const item: ModelItem = { text_: text, loglevel_: loglevel, ref_: ref, leafs_: 0, parentId_: parentId, ident_: 0 };
        if (action === Action.start) {
            item.status_ = ItemStatus.inprogress;
        }
        if (action === Action.finish) {
            item.status_ = ItemStatus.finished;
        }
        if (action !== Action.log) {
            // if status still empty in the original item, or item does not exists it will remain empty and static
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
        if (!model.tail_) {
            model.tail_ = model.head_ = item;
        } else if (head) {
            if (model.head_) {
                item.next_ = model.head_;
                model.head_.prev_ = item;
            }
            model.head_ = item;
        } else {
            if (model.tail_) {
                item.prev_ = model.tail_;
                model.tail_.next_ = item;
            }
            model.tail_ = item;
        }
        model.spinning_ += (item.status_ || 0);
    }

    function updateModel(inputId: number, options: ModelItem): void {
        const modelItem = itemById[inputId];
        if (!modelItem) {
            const item: ModelItem = {inputId_: inputId, ...options};
            itemById[inputId] = item;
            const itemParentId = item.parentId_;
            if (itemParentId != null) {
                const parent = itemById[itemParentId];
                if (parent) {
                    let child = parent, n = 0;
                    while (n < parent.leafs_) {
                        child = child.next_ as ModelItem;
                        ++n;
                        n -= child.leafs_;
                    }
                    ++parent.leafs_;
                    item.next_ = child.next_;
                    child.next_ = item;
                    item.prev_ = child;
                    if (!item.next_) {
                        model.tail_ = item;
                    }
                    item.ident_ = parent.ident_ + 1;
                    return;
                } else {
                    // lostChildren[itemParentId] = [...lostChildren[itemParentId] || [], item];
                    const siblings = lostChildren[itemParentId];
                    if (siblings) {
                        siblings.push(item);
                    } else {
                        lostChildren[itemParentId] = [item];
                    }
                }
            }
            append(item, false);
            if (item.inputId_ != null) {
                const lost = lostChildren[item.inputId_];
                if (lost) {
                    for (let child of lost) {
                        // TODO second etc lost should be inserted after prev items...
                        const beginCut = child.prev_;
                        const itemNext = item.next_;
                        item.next_ = child;
                        child.prev_ = item;
                        child.ident_ = item.ident_ + 1;
                        let remaining = child.leafs_;
                        while (remaining--) {
                            child = child.next_ as ModelItem;
                            ++child.ident_;
                            remaining += child.leafs_;
                        }
                        if (beginCut) {
                            beginCut.next_ = child.next_;
                        } else {
                            model.head_ = child.next_;
                        }
                        if (child.next_) {
                            child.next_.prev_ = beginCut;
                        } else {
                            model.tail_ = child;
                        }
                        child.next_ = itemNext;
                        ++item.leafs_;
                    }
                }
                delete lostChildren[item.inputId_];
            }
        } else {
            const statusDiff = (options.status_ || 0) - (modelItem.status_ || 0);
            delete (options as any).ident_;
            delete (options as any).leafs_;
            Object.assign(modelItem, options);
            model.spinning_ += statusDiff;
        }
    }

    function cleanupModel() {
        let item = model.head_;
        while (item) {
            if (!item.ref_?.deref()) {
                ++model.skipLines_;
                model.head_ = item.next_;
                if (!model.head_) {
                    model.tail_ = model.head_;
                }
                item.inputId_ != null && delete itemById[item.inputId_];
                // delete only child from bucket?
                item.parentId_ != null && delete lostChildren[item.parentId_];
            } else {
                break;
            }
            item = item.next_;
        }
    }
}