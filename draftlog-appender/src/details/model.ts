import { Action, LogLevel, LogMessage } from '@niceties/logger/types';
import { append, appendRange, List, ListNode, prepend, remove, removeRange } from '@slimlib/list';

export const enum ItemStatus {
    finished,
    inprogress
}
export interface ModelItem extends Partial<ListNode> {
    inputId_?: number;
    text_: string;
    status_?: ItemStatus; // undefined means static
    loglevel_: LogLevel;
    ref_?: WeakRef<never>;
    parentId_?: number;
    dirty_?: boolean;
    lastLeaf_?: ModelItem;
    tag_?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context_?: any;
}

export type Model = List<ModelItem> & {
    skipLines_: number;
    tick_: number;
    spinning_: number;
}

export const createModel = (logAboveSpinners: boolean): [(logMessage: LogMessage) => Model, () => Model] => {
    const model: Model = new List<ModelItem>() as Model;
    const itemById: {[key: number]: ModelItem} = Object.create(null);

    const appendToModel = (item: ModelItem, head: boolean) => {
        if (head) {
            prepend(model, item);
        } else {
            append(model, item);
        }
        model.spinning_ += (item.status_ || 0);
    };

    const updateModel = (inputId: number, options: ModelItem): void => {
        const modelItem = itemById[inputId];
        if (!modelItem) {
            const item: ModelItem = {inputId_: inputId, ...options};
            itemById[inputId] = item;
            const itemParentId = item.parentId_;
            if (itemParentId != null) {
                putIntoChildren(itemParentId, item, item);
            } else {
                appendToModel(item, false);
            }
        } else {
            const statusDiff = (options.status_ || 0) - (modelItem.status_ || 0);
            const moveIntoParent = options.parentId_ != null && modelItem.parentId_ == null;
            Object.assign(modelItem, options);
            model.spinning_ += statusDiff;
            if (moveIntoParent) {
                let lastLeaf = modelItem;
                while(lastLeaf.lastLeaf_) {
                    lastLeaf = lastLeaf.lastLeaf_;
                }
                model.spinning_ -= (modelItem.status_ || 0);
                modelItem.dirty_ = true;
                removeRange(modelItem as ListNode, lastLeaf as ListNode);
                putIntoChildren(modelItem.parentId_ as number, modelItem, lastLeaf);
            }
        }
    };

    const putIntoChildren = (itemParentId: number, begin: ModelItem, end: ModelItem) => {
        let parent = itemById[itemParentId];
        if (!parent) {
            parent = { inputId_: itemParentId, text_: '', loglevel_: 0, ref_: new WeakRef(model) as WeakRef<never> } as ModelItem;
            appendToModel(parent, false);
            itemById[itemParentId] = parent;
        }
        appendRange((parent.lastLeaf_ || parent) as ListNode, begin as ListNode, end as ListNode);
        parent.lastLeaf_ = begin;
        model.spinning_ += (begin.status_ || 0);
    };

    const cleanupModel = () => {
        for (const item of model) {
            if (!item.ref_?.deref()) {
                model.skipLines_ += 1;
                item.inputId_ != null && delete itemById[item.inputId_];
                remove(item);
            } else {
                break;
            }
        }
    };

    model.tick_ = model.skipLines_ = model.spinning_ = 0;

    return [({ message: text, inputId, action, loglevel, ref, parentId, context, tag }: LogMessage): Model => {
        // item has status undefined, so it is static by default
        const item: ModelItem = { text_: text, loglevel_: loglevel, ref_: ref, parentId_: parentId, dirty_: true, context_: context, tag_: tag };
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
            appendToModel(item, logAboveSpinners);
        }
        return model;
    }, () => {
        cleanupModel();
        return model;
    }];
};
