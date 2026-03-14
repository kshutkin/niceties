import ansiColors from 'ansi-colors';
import chalk from 'chalk';
import cliColor from 'cli-color';
import * as colorette from 'colorette';
import kleur from 'kleur';
import * as kleurColors from 'kleur/colors';
import { bench, run, summary } from 'mitata';
import * as nanocolors from 'nanocolors';
import picocolors from 'picocolors';
import * as yoctocolors from 'yoctocolors';

import * as niceties from '../src/index.js';

console.log(colorette.green('colorette'));
console.log(kleur.green('kleur'));
console.log(chalk.green('chalk'));
console.log(ansiColors.green('ansi-colors'));
console.log(picocolors.green('picocolors'));
console.log(yoctocolors.green('yoctocolors'));
console.log(nanocolors.green('nanocolors'));
console.log(cliColor.green('cli-color'));
console.log(niceties.green('@niceties/ansi'));

summary(() => {
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

    bench('yoctocolors', () => {
        return yoctocolors.red('Add plugin to use time limit');
    });

    bench('nanocolors', () => {
        return nanocolors.red('Add plugin to use time limit');
    });

    bench('cli-color', () => {
        return cliColor.red('Add plugin to use time limit');
    });

    bench('@niceties/ansi', () => {
        return niceties.red('Add plugin to use time limit');
    });
});

await run();
