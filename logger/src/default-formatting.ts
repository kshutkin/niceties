import kleur from 'kleur';

import type { ColorFormatters, Prefixes } from './types';

const { green, red, yellow, blue } = kleur;

export const unicodePrefixes: Prefixes = [`${green('✓')}`, `${green('✓')}`, '⚠', '✕'];
export const asciiPrefixes: Prefixes = [`${green('+')}`, `${green('+')}`, '!', 'x'];

// biome-ignore lint/suspicious/noSparseArray: shorter and safe enough
export const colors: ColorFormatters = [, , yellow, red];
export const tagFactory = (tag: string) => {
    return `[${blue(tag)}]`;
};
