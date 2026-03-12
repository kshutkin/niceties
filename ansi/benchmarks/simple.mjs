import ansiColors from 'ansi-colors';
import chalk from 'chalk';
import * as colorette from 'colorette';
import kleur from 'kleur';
import * as kleurColors from 'kleur/colors';
import { bench, boxplot, run } from 'mitata';
import picocolors from 'picocolors';

import * as niceties from '../src/index.js';

console.log(colorette.green('colorette'));
console.log(kleur.green('kleur'));
console.log(chalk.green('chalk'));
console.log(ansiColors.green('ansi-colors'));
console.log(picocolors.green('picocolors'));
console.log(niceties.green('@niceties/ansi'));

boxplot(() => {
    bench('chalk', () => {
        return chalk.red('Add plugin to use time limit');
    });

    bench('ansi-colors', () => {
        return ansiColors.red('Add plugin to use time limit');
    });

    bench('kleur', () => {
        return kleur.red('Add plugin to use time limit');
    });

    bench('kleur/colors', () => {
        return kleurColors.red('Add plugin to use time limit');
    });

    bench('colorette', () => {
        return colorette.red('Add plugin to use time limit');
    });

    bench('picocolors', () => {
        return picocolors.red('Add plugin to use time limit');
    });

    bench('@niceties/ansi', () => {
        return niceties.red('Add plugin to use time limit');
    });
});

await run();
