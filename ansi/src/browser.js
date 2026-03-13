/**
 * @typedef {(input: string | number) => string} Formatter
 */

import { formatter } from './shared.js';

const RESET = '\x1b[0m';
const FG_CLOSE = '\x1b[39m';
const BG_CLOSE = '\x1b[49m';

export const isColorSupported = true;

// modifiers
/** @type {Formatter} */
export const reset = formatter(RESET, RESET);
/** @type {Formatter} */
export const bold = formatter('\x1b[1m', '\x1b[22m', '\x1b[22m\x1b[1m');
/** @type {Formatter} */
export const dim = formatter('\x1b[2m', '\x1b[22m', '\x1b[22m\x1b[2m');
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
export const black = formatter('\x1b[30m', FG_CLOSE);
/** @type {Formatter} */
export const red = formatter('\x1b[31m', FG_CLOSE);
/** @type {Formatter} */
export const green = formatter('\x1b[32m', FG_CLOSE);
/** @type {Formatter} */
export const yellow = formatter('\x1b[33m', FG_CLOSE);
/** @type {Formatter} */
export const blue = formatter('\x1b[34m', FG_CLOSE);
/** @type {Formatter} */
export const magenta = formatter('\x1b[35m', FG_CLOSE);
/** @type {Formatter} */
export const cyan = formatter('\x1b[36m', FG_CLOSE);
/** @type {Formatter} */
export const white = formatter('\x1b[37m', FG_CLOSE);
/** @type {Formatter} */
export const gray = formatter('\x1b[90m', FG_CLOSE);

// background colors
/** @type {Formatter} */
export const bgBlack = formatter('\x1b[40m', BG_CLOSE);
/** @type {Formatter} */
export const bgRed = formatter('\x1b[41m', BG_CLOSE);
/** @type {Formatter} */
export const bgGreen = formatter('\x1b[42m', BG_CLOSE);
/** @type {Formatter} */
export const bgYellow = formatter('\x1b[43m', BG_CLOSE);
/** @type {Formatter} */
export const bgBlue = formatter('\x1b[44m', BG_CLOSE);
/** @type {Formatter} */
export const bgMagenta = formatter('\x1b[45m', BG_CLOSE);
/** @type {Formatter} */
export const bgCyan = formatter('\x1b[46m', BG_CLOSE);
/** @type {Formatter} */
export const bgWhite = formatter('\x1b[47m', BG_CLOSE);

// bright foreground colors
/** @type {Formatter} */
export const blackBright = formatter('\x1b[90m', FG_CLOSE);
/** @type {Formatter} */
export const redBright = formatter('\x1b[91m', FG_CLOSE);
/** @type {Formatter} */
export const greenBright = formatter('\x1b[92m', FG_CLOSE);
/** @type {Formatter} */
export const yellowBright = formatter('\x1b[93m', FG_CLOSE);
/** @type {Formatter} */
export const blueBright = formatter('\x1b[94m', FG_CLOSE);
/** @type {Formatter} */
export const magentaBright = formatter('\x1b[95m', FG_CLOSE);
/** @type {Formatter} */
export const cyanBright = formatter('\x1b[96m', FG_CLOSE);
/** @type {Formatter} */
export const whiteBright = formatter('\x1b[97m', FG_CLOSE);

// bright background colors
/** @type {Formatter} */
export const bgBlackBright = formatter('\x1b[100m', BG_CLOSE);
/** @type {Formatter} */
export const bgRedBright = formatter('\x1b[101m', BG_CLOSE);
/** @type {Formatter} */
export const bgGreenBright = formatter('\x1b[102m', BG_CLOSE);
/** @type {Formatter} */
export const bgYellowBright = formatter('\x1b[103m', BG_CLOSE);
/** @type {Formatter} */
export const bgBlueBright = formatter('\x1b[104m', BG_CLOSE);
/** @type {Formatter} */
export const bgMagentaBright = formatter('\x1b[105m', BG_CLOSE);
/** @type {Formatter} */
export const bgCyanBright = formatter('\x1b[106m', BG_CLOSE);
/** @type {Formatter} */
export const bgWhiteBright = formatter('\x1b[107m', BG_CLOSE);
