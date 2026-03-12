/**
 * @typedef {(input: string | number) => string} Formatter
 */

import { formatter, modifier } from './shared.js';

const env = globalThis.process?.env ?? {};

export const isColorSupported =
    !('NO_COLOR' in env) &&
    !('NODE_DISABLE_COLORS' in env) &&
    env.TERM !== 'dumb' &&
    (('FORCE_COLOR' in env && env.FORCE_COLOR !== '0') || globalThis.process?.stdout?.isTTY === true);

/** @type {Formatter} */
const identity = input => '' + input;

const f = isColorSupported ? formatter : () => identity;
const fM = isColorSupported ? modifier : () => identity;

// modifiers
/** @type {Formatter} */
export const reset = f('\x1b[0m', '\x1b[0m');
/** @type {Formatter} */
export const bold = fM('\x1b[1m', '\x1b[22m', '\x1b[22m\x1b[1m');
/** @type {Formatter} */
export const dim = fM('\x1b[2m', '\x1b[22m', '\x1b[22m\x1b[2m');
/** @type {Formatter} */
export const italic = f('\x1b[3m', '\x1b[23m');
/** @type {Formatter} */
export const underline = f('\x1b[4m', '\x1b[24m');
/** @type {Formatter} */
export const inverse = f('\x1b[7m', '\x1b[27m');
/** @type {Formatter} */
export const hidden = f('\x1b[8m', '\x1b[28m');
/** @type {Formatter} */
export const strikethrough = f('\x1b[9m', '\x1b[29m');

// foreground colors
/** @type {Formatter} */
export const black = f('\x1b[30m', '\x1b[39m');
/** @type {Formatter} */
export const red = f('\x1b[31m', '\x1b[39m');
/** @type {Formatter} */
export const green = f('\x1b[32m', '\x1b[39m');
/** @type {Formatter} */
export const yellow = f('\x1b[33m', '\x1b[39m');
/** @type {Formatter} */
export const blue = f('\x1b[34m', '\x1b[39m');
/** @type {Formatter} */
export const magenta = f('\x1b[35m', '\x1b[39m');
/** @type {Formatter} */
export const cyan = f('\x1b[36m', '\x1b[39m');
/** @type {Formatter} */
export const white = f('\x1b[37m', '\x1b[39m');
/** @type {Formatter} */
export const gray = f('\x1b[90m', '\x1b[39m');

// background colors
/** @type {Formatter} */
export const bgBlack = f('\x1b[40m', '\x1b[49m');
/** @type {Formatter} */
export const bgRed = f('\x1b[41m', '\x1b[49m');
/** @type {Formatter} */
export const bgGreen = f('\x1b[42m', '\x1b[49m');
/** @type {Formatter} */
export const bgYellow = f('\x1b[43m', '\x1b[49m');
/** @type {Formatter} */
export const bgBlue = f('\x1b[44m', '\x1b[49m');
/** @type {Formatter} */
export const bgMagenta = f('\x1b[45m', '\x1b[49m');
/** @type {Formatter} */
export const bgCyan = f('\x1b[46m', '\x1b[49m');
/** @type {Formatter} */
export const bgWhite = f('\x1b[47m', '\x1b[49m');

// bright foreground colors
/** @type {Formatter} */
export const blackBright = f('\x1b[90m', '\x1b[39m');
/** @type {Formatter} */
export const redBright = f('\x1b[91m', '\x1b[39m');
/** @type {Formatter} */
export const greenBright = f('\x1b[92m', '\x1b[39m');
/** @type {Formatter} */
export const yellowBright = f('\x1b[93m', '\x1b[39m');
/** @type {Formatter} */
export const blueBright = f('\x1b[94m', '\x1b[39m');
/** @type {Formatter} */
export const magentaBright = f('\x1b[95m', '\x1b[39m');
/** @type {Formatter} */
export const cyanBright = f('\x1b[96m', '\x1b[39m');
/** @type {Formatter} */
export const whiteBright = f('\x1b[97m', '\x1b[39m');

// bright background colors
/** @type {Formatter} */
export const bgBlackBright = f('\x1b[100m', '\x1b[49m');
/** @type {Formatter} */
export const bgRedBright = f('\x1b[101m', '\x1b[49m');
/** @type {Formatter} */
export const bgGreenBright = f('\x1b[102m', '\x1b[49m');
/** @type {Formatter} */
export const bgYellowBright = f('\x1b[103m', '\x1b[49m');
/** @type {Formatter} */
export const bgBlueBright = f('\x1b[104m', '\x1b[49m');
/** @type {Formatter} */
export const bgMagentaBright = f('\x1b[105m', '\x1b[49m');
/** @type {Formatter} */
export const bgCyanBright = f('\x1b[106m', '\x1b[49m');
/** @type {Formatter} */
export const bgWhiteBright = f('\x1b[107m', '\x1b[49m');
