/**
 * @typedef {(input: string | number) => string} Formatter
 */
import process from 'node:process';

import { formatter } from './shared.js';

const FG_CLOSE = '\x1b[39m';
const BG_CLOSE = '\x1b[49m';
const BOLD_DIM_CLOSE = '\x1b[22m';

const hasColors = process.stdout?.hasColors?.();
// biome-ignore lint/style/useTemplate: optimization
const noColorsFormatter = /** @type {Formatter} */ (input => '' + input);
const f = hasColors ? formatter : () => noColorsFormatter;

// modifiers
/** @type {Formatter} */
export const reset = hasColors ? s => `\x1b[0m${s}\x1b[0m` : noColorsFormatter;
/** @type {Formatter} */
export const bold = f('\x1b[1m', BOLD_DIM_CLOSE, '\x1b[22m\x1b[1m');
/** @type {Formatter} */
export const dim = f('\x1b[2m', BOLD_DIM_CLOSE, '\x1b[22m\x1b[2m');
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
export const black = f('\x1b[30m', FG_CLOSE);
/** @type {Formatter} */
export const red = f('\x1b[31m', FG_CLOSE);
/** @type {Formatter} */
export const green = f('\x1b[32m', FG_CLOSE);
/** @type {Formatter} */
export const yellow = f('\x1b[33m', FG_CLOSE);
/** @type {Formatter} */
export const blue = f('\x1b[34m', FG_CLOSE);
/** @type {Formatter} */
export const magenta = f('\x1b[35m', FG_CLOSE);
/** @type {Formatter} */
export const cyan = f('\x1b[36m', FG_CLOSE);
/** @type {Formatter} */
export const white = f('\x1b[37m', FG_CLOSE);
/** @type {Formatter} */
export const gray = f('\x1b[90m', FG_CLOSE);

// background colors
/** @type {Formatter} */
export const bgBlack = f('\x1b[40m', BG_CLOSE);
/** @type {Formatter} */
export const bgRed = f('\x1b[41m', BG_CLOSE);
/** @type {Formatter} */
export const bgGreen = f('\x1b[42m', BG_CLOSE);
/** @type {Formatter} */
export const bgYellow = f('\x1b[43m', BG_CLOSE);
/** @type {Formatter} */
export const bgBlue = f('\x1b[44m', BG_CLOSE);
/** @type {Formatter} */
export const bgMagenta = f('\x1b[45m', BG_CLOSE);
/** @type {Formatter} */
export const bgCyan = f('\x1b[46m', BG_CLOSE);
/** @type {Formatter} */
export const bgWhite = f('\x1b[47m', BG_CLOSE);

// bright foreground colors
/** @type {Formatter} */
export const blackBright = f('\x1b[90m', FG_CLOSE);
/** @type {Formatter} */
export const redBright = f('\x1b[91m', FG_CLOSE);
/** @type {Formatter} */
export const greenBright = f('\x1b[92m', FG_CLOSE);
/** @type {Formatter} */
export const yellowBright = f('\x1b[93m', FG_CLOSE);
/** @type {Formatter} */
export const blueBright = f('\x1b[94m', FG_CLOSE);
/** @type {Formatter} */
export const magentaBright = f('\x1b[95m', FG_CLOSE);
/** @type {Formatter} */
export const cyanBright = f('\x1b[96m', FG_CLOSE);
/** @type {Formatter} */
export const whiteBright = f('\x1b[97m', FG_CLOSE);

// bright background colors
/** @type {Formatter} */
export const bgBlackBright = f('\x1b[100m', BG_CLOSE);
/** @type {Formatter} */
export const bgRedBright = f('\x1b[101m', BG_CLOSE);
/** @type {Formatter} */
export const bgGreenBright = f('\x1b[102m', BG_CLOSE);
/** @type {Formatter} */
export const bgYellowBright = f('\x1b[103m', BG_CLOSE);
/** @type {Formatter} */
export const bgBlueBright = f('\x1b[104m', BG_CLOSE);
/** @type {Formatter} */
export const bgMagentaBright = f('\x1b[105m', BG_CLOSE);
/** @type {Formatter} */
export const bgCyanBright = f('\x1b[106m', BG_CLOSE);
/** @type {Formatter} */
export const bgWhiteBright = f('\x1b[107m', BG_CLOSE);
