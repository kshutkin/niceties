/**
 * @typedef {import('@niceties/logger/types').LogMessage} LogMessage
 * @typedef {import('@niceties/logger/types').LogLevel} LogLevel
 */

/**
 * @typedef {import('@slimlib/list').ListNode} ListNode
 */

import { Action } from '@niceties/logger/types';
import { append, appendRange, List, prepend, remove, removeRange } from '@slimlib/list';

/**
 * @readonly
 * @enum {number}
 */
export const ItemStatus = /** @type {const} */ ({
    finished: 0,
    inprogress: 1,
});

/**
 * @typedef {Object} ModelItem
 * @property {number} [inputId]
 * @property {string} message
 * @property {number} [status] - undefined means static
 * @property {number} loglevel
 * @property {WeakRef<never>} [ref]
 * @property {number} [parentId]
 * @property {boolean} [dirty]
 * @property {ModelItem} [lastLeaf]
 * @property {string} [tag]
 * @property {*} [context]
 * @property {ListNode} [p]
 * @property {ListNode} [n]
 */

/**
 * @typedef {List<ModelItem> & {
 *   skipLines: number;
 *   tick: number;
 *   spinning: number;
 * }} Model
 */

/**
 * @param {boolean} logAboveSpinners
 * @returns {[(logMessage: LogMessage) => Model, () => Model]}
 */
export function createModel(logAboveSpinners) {
    /** @type {Model} */
    const model = /** @type {Model} */ (new List());
    /** @type {{ [key: number]: ModelItem }} */
    const itemById = Object.create(null);

    model.tick = model.skipLines = model.spinning = 0;

    return [
        (/** @type {LogMessage & ModelItem} */ { action, ...item }) => {
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
                updateModel(/** @type {number} */ (inputId), item);
            }
            cleanupModel();
            if (action === Action.log) {
                appendToModel(item, logAboveSpinners);
            }
            return model;
        },
        () => {
            cleanupModel();
            return model;
        },
    ];

    /**
     * @param {ModelItem} item
     * @param {boolean} head
     */
    function appendToModel(item, head) {
        if (head) {
            prepend(model, item);
        } else {
            append(model, item);
        }
        model.spinning += item.status || 0;
    }

    /**
     * @param {number} inputId
     * @param {ModelItem} options
     */
    function updateModel(inputId, options) {
        const modelItem = itemById[inputId];
        if (!modelItem) {
            /** @type {ModelItem} */
            const item = { inputId: inputId, ...options };
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
                model.spinning -= modelItem.status || 0;
                modelItem.dirty = true;
                removeRange(/** @type {ListNode} */ (modelItem), /** @type {ListNode} */ (lastLeaf));
                putIntoChildren(/** @type {number} */ (modelItem.parentId), modelItem, lastLeaf);
            }
        }
    }

    /**
     * @param {number} itemParentId
     * @param {ModelItem} begin
     * @param {ModelItem} end
     */
    function putIntoChildren(itemParentId, begin, end) {
        let parent = itemById[itemParentId];
        if (!parent) {
            parent = /** @type {ModelItem} */ ({
                inputId: itemParentId,
                message: '',
                loglevel: 0,
                ref: /** @type {WeakRef<never>} */ (new WeakRef(model)),
            });
            appendToModel(parent, false);
            itemById[itemParentId] = parent;
        }
        appendRange(/** @type {ListNode} */ (getLastLeaf(parent)), /** @type {ListNode} */ (begin), /** @type {ListNode} */ (end));
        parent.lastLeaf = begin;
        model.spinning += begin.status || 0;
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

/**
 * @param {ModelItem} modelItem
 * @returns {ModelItem}
 */
function getLastLeaf(modelItem) {
    let lastLeaf = modelItem;
    while (lastLeaf.lastLeaf) {
        lastLeaf = lastLeaf.lastLeaf;
    }
    return lastLeaf;
}
