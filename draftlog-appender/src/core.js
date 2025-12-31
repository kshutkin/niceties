/**
 * @typedef {import('@niceties/logger/types').Formatter} Formatter
 * @typedef {import('@niceties/logger/types').LogMessage} LogMessage
 * @typedef {import('./spinners.js').Spinner} Spinner
 */

import { createCanvas } from './details/canvas.js';
import { createModel } from './details/model.js';

/**
 * @param {Spinner} spinner
 * @param {Formatter} formatter
 * @param {boolean} logAboveSpinners
 * @param {number} ident
 * @returns {(message: LogMessage) => void}
 */
export function createDraftlogAppender(spinner, formatter, logAboveSpinners, ident) {
    /** @type {NodeJS.Timeout | undefined} */
    let interval;

    const [updateModel, getModel] = createModel(logAboveSpinners);
    const renderModel = createCanvas(spinner, formatter, ident);

    return (/** @type {LogMessage} */ message) => {
        renderModel(updateModel(message));
        checkTimeout();
    };

    function checkTimeout() {
        const spinning = getModel().spinning;
        if (spinning && !interval) {
            interval = setInterval(updateSpinners, spinner.interval);
            interval.unref(); // unref immediately just in case
        } else if (!spinning && interval) {
            clearInterval(interval);
            interval = undefined;
        }
    }

    function updateSpinners() {
        const model = getModel();
        model.tick++;
        model.tick %= spinner.frames.length;
        renderModel(model);
    }
}