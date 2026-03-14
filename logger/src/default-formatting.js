/**
 * @typedef {import('./types.js').ColorFormatters} ColorFormatters
 * @typedef {import('./types.js').Prefixes} Prefixes
 */

import { blue, cyan, gray, green, red, yellow } from '@niceties/ansi';

/** @type {Prefixes} */
export const unicodePrefixes = [`${green('✓')}`, `${green('✓')}`, '⚠', '✕'];

/** @type {Prefixes} */
export const asciiPrefixes = [`${green('+')}`, `${green('+')}`, '!', 'x'];

/** @type {Prefixes} */
export const unicodeLogPrefixes = [gray('ℹ'), `${cyan('ℹ')}`, 'ℹ', 'ℹ'];

/** @type {Prefixes} */
export const asciiLogPrefixes = [gray('i'), `${cyan('i')}`, 'i', 'i'];

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
