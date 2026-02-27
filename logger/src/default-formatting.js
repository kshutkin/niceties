/**
 * @typedef {import('./types.js').ColorFormatters} ColorFormatters
 * @typedef {import('./types.js').Prefixes} Prefixes
 */

import kleur from 'kleur';

const { green, red, yellow, blue, cyan, grey } = kleur;

/** @type {Prefixes} */
export const unicodePrefixes = [`${green('✓')}`, `${green('✓')}`, '⚠', '✕'];

/** @type {Prefixes} */
export const asciiPrefixes = [`${green('+')}`, `${green('+')}`, '!', 'x'];

/** @type {Prefixes} */
export const unicodeLogPrefixes = [grey('ℹ'), `${cyan('ℹ')}`, 'ℹ', 'ℹ'];

/** @type {Prefixes} */
export const asciiLogPrefixes = [grey('i'), `${cyan('i')}`, 'i', 'i'];

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
