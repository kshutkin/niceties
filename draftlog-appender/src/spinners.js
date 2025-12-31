/**
 * @typedef {Object} Spinner
 * @property {number} interval
 * @property {string[]} frames
 */

/** @type {Spinner} */
export const dots = {
    interval: 50,
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};

/** @type {Spinner} */
export const line = {
    interval: 130,
    frames: ['-', '\\', '|', '/'],
};
