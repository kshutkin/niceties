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

    bench('yoctocolors', () => {
        return yoctocolors.blue(yoctocolors.red(input).repeat(count));
    });

    bench('nanocolors', () => {
        return nanocolors.blue(nanocolors.red(input).repeat(count));
    });

    bench('cli-color', () => {
        return cliColor.blue(cliColor.red(input).repeat(count));
    });
});

await run();
