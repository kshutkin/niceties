import ansiColors from 'ansi-colors';
import chalk from 'chalk';
import * as colorette from 'colorette';
import kleur from 'kleur';
import * as kleurColors from 'kleur/colors';
import { bench, run, summary } from 'mitata';
import picocolors from 'picocolors';

import * as niceties from '../src/index.js';

const count = 1000;
const input = 'lorem ipsum dolor sit amet';

summary(() => {
    bench('@niceties/ansi', () => {
        return niceties.blue(niceties.red(input).repeat(count));
    });

    bench('picocolors', () => {
        return picocolors.blue(picocolors.red(input).repeat(count));
    });

    bench('colorette', () => {
        return colorette.blue(colorette.red(input).repeat(count));
    });

    bench('kleur', () => {
        return kleur.blue(kleur.red(input).repeat(count));
    });

    bench('kleur/colors', () => {
        return kleurColors.blue(kleurColors.red(input).repeat(count));
    });

    bench('chalk', () => {
        return chalk.blue(chalk.red(input).repeat(count));
    });

    bench('ansi-colors', () => {
        return ansiColors.blue(ansiColors.red(input).repeat(count));
    });
});

await run();
