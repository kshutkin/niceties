import ansiColors from 'ansi-colors';
import chalk from 'chalk';
import * as colorette from 'colorette';
import kleur from 'kleur';
import * as kleurColors from 'kleur/colors';
import picocolors from 'picocolors';

import * as nicetiesAnsi from '../src/index.js';

const libs = {
    '@niceties/ansi': nicetiesAnsi,
    picocolors,
    colorette,
    kleur,
    'kleur/colors': kleurColors,
    chalk,
    'ansi-colors': ansiColors,
};

const names = [
    'reset',
    'bold',
    'dim',
    'italic',
    'underline',
    'inverse',
    'hidden',
    'strikethrough',
    'black',
    'red',
    'green',
    'yellow',
    'blue',
    'magenta',
    'cyan',
    'white',
    'gray',
    'bgBlack',
    'bgRed',
    'bgGreen',
    'bgYellow',
    'bgBlue',
    'bgMagenta',
    'bgCyan',
    'bgWhite',
];

for (const [name, lib] of Object.entries(libs)) {
    console.log(`\n--- ${name} ---`);
    for (const color of names) {
        if (typeof lib[color] === 'function') {
            console.log(`  ${color.padEnd(16)} ${lib[color]('~foobar~')}`);
        } else {
            console.log(`  ${color.padEnd(16)} (not available)`);
        }
    }

    console.log();
    console.log(lib.bold(lib.cyan('[info]')), lib.cyan('This is some information'));
    console.log(lib.bold(lib.yellow('[warning]')), lib.yellow('This is a warning'));
    console.log(lib.bold(lib.red('[ERROR]')), lib.red('Danger! There was an error!'));
    console.log();

    console.log(
        lib.red(
            `a red ${lib.white('white')} red ${lib.red('red')} red ${lib.gray('gray')} red ${lib.red('red')} red ${lib.blue('blue')} red ${lib.green('green')} red ${lib.magenta('magenta')} red ${lib.cyan('cyan')} red ${lib.yellow('yellow')} message`
        )
    );
}
