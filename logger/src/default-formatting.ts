import kleur from 'kleur';
import { ColorFormatters, Prefixes } from './types';
const { green, red, yellow, blue } = kleur;

export const unicodePrefixes: Prefixes = [`${green('✓')}`, `${green('✓')}`, '⚠', '✕'];
export const asciiPrefixes: Prefixes = [`${green('+')}`, `${green('+')}`, '!', 'x'];
// eslint-disable-next-line no-sparse-arrays
export const colors: ColorFormatters = [,,yellow, red];
export const tagFactory = (tag: string) => {
    return '[' + blue(tag) + ']';
};
