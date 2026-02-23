/**
 * @typedef {import('@niceties/logger/types').Formatter} Formatter
 * @typedef {import('../spinners.js').Spinner} Spinner
 * @typedef {import('./model.js').Model} Model
 * @typedef {import('./model.js').ModelItem} ModelItem
 */

import { draft } from '@niceties/draftlog';
import { Action } from '@niceties/logger/types';

import splitByLines from './split-by-lines.js';

/**
 * @param {Spinner} spinner
 * @param {Formatter} formatter
 * @param {number} ident
 * @returns {(model: Model, dirty?: boolean) => void}
 */
export function createCanvas(spinner, formatter, ident) {
    /** @type {Array<(text: string) => void>} */
    const updaters = [];

    return modelFn;

    /**
     * @param {Model} model
     * @param {boolean} [dirty]
     */
    function modelFn(model, dirty = false) {
        if (model.skipLines) {
            updaters.splice(0, model.skipLines);
            model.skipLines = 0;
        }
        let key = 0;
        /** @type {(ModelItem | null)[]} */
        const stack = [];
        for (const item of model) {
            if (dirty || item.dirty || item.status) {
                let prefix = getPrefix(/** @type {number} */ (item.status), model.tick);
                let prefixUpdated = false;
                const subitems = splitByLines(item.message);
                for (const message of subitems) {
                    let updater = updaters[key++];
                    if (!updater) {
                        updater = draft('');
                        updaters.push(updater);
                    }
                    updater(
                        formatter(
                            {
                                loglevel: item.loglevel,
                                message,
                                context: item.context,
                                action: /** @type {3} */ (item.status === undefined ? Action.log : undefined),
                                tag: item.tag,
                            },
                            prefix,
                            ident * stack.length
                        )
                    );
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
                key += splitByLines(item.message).length;
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

        while (key < updaters.length) {
            updaters[key++]('');
        }
    }

    /**
     * @param {number} status
     * @param {number} tick
     * @returns {string | boolean}
     */
    function getPrefix(status, tick) {
        // status is truthy when it is inprogress
        return status
            ? /** @type {string | boolean} */ (spinner.frames[tick])
            : // status not null when it is finished
              status != null;
    }
}
