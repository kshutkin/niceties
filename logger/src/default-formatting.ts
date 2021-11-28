import kleur from 'kleur';
import { Formatting } from '.';
const { green, red, yellow } = kleur;

export const formatting: Formatting = {
    finishedPrefixes: [`${green('✓')} `, `${green('✓')} `, '⚠ ', '✕ '],
    // eslint-disable-next-line no-sparse-arrays
    colors: [,,yellow, red]
};