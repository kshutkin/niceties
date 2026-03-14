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
import { c, bgRed as sBgRed, black as sBlack, green as sGreen, red as sRed, yellow as sYellow } from '../src/string.js';

summary(() => {
    let index = 1e8;

    bench(
        '@niceties/ansi',
        () =>
            niceties.red('.') +
            niceties.yellow('.') +
            niceties.green('.') +
            niceties.bgRed(niceties.black(' ERROR ')) +
            niceties.red(' Add plugin ' + niceties.yellow('name') + ' to use time limit with ' + niceties.yellow(`${++index}`))
    );

    bench(
        '@niceties/ansi/string',
        () =>
            c`${sRed('.')}${sYellow('.')}${sGreen('.')}${sBgRed(sBlack(' ERROR '))} Add plugin ${sYellow('name')} to use time limit with ${sYellow(`${++index}`)}`
    );

    bench(
        'picocolors',
        () =>
            picocolors.red('.') +
            picocolors.yellow('.') +
            picocolors.green('.') +
            picocolors.bgRed(picocolors.black(' ERROR ')) +
            picocolors.red(' Add plugin ' + picocolors.yellow('name') + ' to use time limit with ' + picocolors.yellow(`${++index}`))
    );

    bench(
        'colorette',
        () =>
            colorette.red('.') +
            colorette.yellow('.') +
            colorette.green('.') +
            colorette.bgRed(colorette.black(' ERROR ')) +
            colorette.red(' Add plugin ' + colorette.yellow('name') + ' to use time limit with ' + colorette.yellow(`${++index}`))
    );

    bench(
        'kleur',
        () =>
            kleur.red('.') +
            kleur.yellow('.') +
            kleur.green('.') +
            kleur.bgRed(kleur.black(' ERROR ')) +
            kleur.red(' Add plugin ' + kleur.yellow('name') + ' to use time limit with ' + kleur.yellow(`${++index}`))
    );

    bench(
        'kleur/colors',
        () =>
            kleurColors.red('.') +
            kleurColors.yellow('.') +
            kleurColors.green('.') +
            kleurColors.bgRed(kleurColors.black(' ERROR ')) +
            kleurColors.red(' Add plugin ' + kleurColors.yellow('name') + ' to use time limit with ' + kleurColors.yellow(`${++index}`))
    );

    bench(
        'chalk',
        () =>
            chalk.red('.') +
            chalk.yellow('.') +
            chalk.green('.') +
            chalk.bgRed(chalk.black(' ERROR ')) +
            chalk.red(' Add plugin ' + chalk.yellow('name') + ' to use time limit with ' + chalk.yellow(`${++index}`))
    );

    bench(
        'ansi-colors',
        () =>
            ansiColors.red('.') +
            ansiColors.yellow('.') +
            ansiColors.green('.') +
            ansiColors.bgRed(ansiColors.black(' ERROR ')) +
            ansiColors.red(' Add plugin ' + ansiColors.yellow('name') + ' to use time limit with ' + ansiColors.yellow(`${++index}`))
    );

    bench(
        'yoctocolors',
        () =>
            yoctocolors.red('.') +
            yoctocolors.yellow('.') +
            yoctocolors.green('.') +
            yoctocolors.bgRed(yoctocolors.black(' ERROR ')) +
            yoctocolors.red(' Add plugin ' + yoctocolors.yellow('name') + ' to use time limit with ' + yoctocolors.yellow(`${++index}`))
    );

    bench(
        'nanocolors',
        () =>
            nanocolors.red('.') +
            nanocolors.yellow('.') +
            nanocolors.green('.') +
            nanocolors.bgRed(nanocolors.black(' ERROR ')) +
            nanocolors.red(' Add plugin ' + nanocolors.yellow('name') + ' to use time limit with ' + nanocolors.yellow(`${++index}`))
    );

    bench(
        'cli-color',
        () =>
            cliColor.red('.') +
            cliColor.yellow('.') +
            cliColor.green('.') +
            cliColor.bgRed(cliColor.black(' ERROR ')) +
            cliColor.red(' Add plugin ' + cliColor.yellow('name') + ' to use time limit with ' + cliColor.yellow(`${++index}`))
    );
});

await run();
