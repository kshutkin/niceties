/**
 * @typedef {(input: string | number) => string} Formatter
 */

import { formatter, modifier } from './shared.js';

export const isColorSupported = true;

// modifiers
/** @type {Formatter} */
export const reset = formatter('\x1b[0m', '\x1b[0m');
/** @type {Formatter} */
export const bold = modifier('\x1b[1m', '\x1b[22m', '\x1b[22m\x1b[1m');
/** @type {Formatter} */
export const dim = modifier('\x1b[2m', '\x1b[22m', '\x1b[22m\x1b[2m');
/** @type {Formatter} */
export const italic = formatter('\x1b[3m', '\x1b[23m');
/** @type {Formatter} */
export const underline = formatter('\x1b[4m', '\x1b[24m');
/** @type {Formatter} */
export const inverse = formatter('\x1b[7m', '\x1b[27m');
/** @type {Formatter} */
export const hidden = formatter('\x1b[8m', '\x1b[28m');
/** @type {Formatter} */
export const strikethrough = formatter('\x1b[9m', '\x1b[29m');

// foreground colors
/** @type {Formatter} */
export const black = formatter('\x1b[30m', '\x1b[39m');
/** @type {Formatter} */
export const red = formatter('\x1b[31m', '\x1b[39m');
/** @type {Formatter} */
export const green = formatter('\x1b[32m', '\x1b[39m');
/** @type {Formatter} */
export const yellow = formatter('\x1b[33m', '\x1b[39m');
/** @type {Formatter} */
export const blue = formatter('\x1b[34m', '\x1b[39m');
/** @type {Formatter} */
export const magenta = formatter('\x1b[35m', '\x1b[39m');
/** @type {Formatter} */
export const cyan = formatter('\x1b[36m', '\x1b[39m');
/** @type {Formatter} */
export const white = formatter('\x1b[37m', '\x1b[39m');
/** @type {Formatter} */
export const gray = formatter('\x1b[90m', '\x1b[39m');

// background colors
/** @type {Formatter} */
export const bgBlack = formatter('\x1b[40m', '\x1b[49m');
/** @type {Formatter} */
export const bgRed = formatter('\x1b[41m', '\x1b[49m');
/** @type {Formatter} */
export const bgGreen = formatter('\x1b[42m', '\x1b[49m');
/** @type {Formatter} */
export const bgYellow = formatter('\x1b[43m', '\x1b[49m');
/** @type {Formatter} */
export const bgBlue = formatter('\x1b[44m', '\x1b[49m');
/** @type {Formatter} */
export const bgMagenta = formatter('\x1b[45m', '\x1b[49m');
/** @type {Formatter} */
export const bgCyan = formatter('\x1b[46m', '\x1b[49m');
/** @type {Formatter} */
export const bgWhite = formatter('\x1b[47m', '\x1b[49m');

// bright foreground colors
/** @type {Formatter} */
export const blackBright = formatter('\x1b[90m', '\x1b[39m');
/** @type {Formatter} */
export const redBright = formatter('\x1b[91m', '\x1b[39m');
/** @type {Formatter} */
export const greenBright = formatter('\x1b[92m', '\x1b[39m');
/** @type {Formatter} */
export const yellowBright = formatter('\x1b[93m', '\x1b[39m');
/** @type {Formatter} */
export const blueBright = formatter('\x1b[94m', '\x1b[39m');
/** @type {Formatter} */
export const magentaBright = formatter('\x1b[95m', '\x1b[39m');
/** @type {Formatter} */
export const cyanBright = formatter('\x1b[96m', '\x1b[39m');
/** @type {Formatter} */
export const whiteBright = formatter('\x1b[97m', '\x1b[39m');

// bright background colors
/** @type {Formatter} */
export const bgBlackBright = formatter('\x1b[100m', '\x1b[49m');
/** @type {Formatter} */
export const bgRedBright = formatter('\x1b[101m', '\x1b[49m');
/** @type {Formatter} */
export const bgGreenBright = formatter('\x1b[102m', '\x1b[49m');
/** @type {Formatter} */
export const bgYellowBright = formatter('\x1b[103m', '\x1b[49m');
/** @type {Formatter} */
export const bgBlueBright = formatter('\x1b[104m', '\x1b[49m');
/** @type {Formatter} */
export const bgMagentaBright = formatter('\x1b[105m', '\x1b[49m');
/** @type {Formatter} */
export const bgCyanBright = formatter('\x1b[106m', '\x1b[49m');
/** @type {Formatter} */
export const bgWhiteBright = formatter('\x1b[107m', '\x1b[49m');
