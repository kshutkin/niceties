/**
 * @typedef {import('./types.js').ColorFormatters} ColorFormatters
 * @typedef {import('./types.js').Prefixes} Prefixes
 */

import kleur from 'kleur';

const { green, red, yellow, blue } = kleur;

/** @type {Prefixes} */
export const unicodePrefixes = [`${green('✓')}`, `${green('✓')}`, '⚠', '✕'];

/** @type {Prefixes} */
export const asciiPrefixes = [`${green('+')}`, `${green('+')}`, '!', 'x'];

/** @type {ColorFormatters} */
// biome-ignore lint/suspicious/noSparseArray: expected
export const colors = [, , yellow, red];

/**
 * @param {string} tag
 * @returns {string}
 */
export const tagFactory = tag => {
    return `[${blue(tag)}]`;
};
