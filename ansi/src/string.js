/**
 * @typedef {[string, string, string]} ColorSegment - [open, text, close]
 */

/**
 * @typedef {(input: string | number) => ColorSegment} ColorFactory
 */

const FG_CLOSE = '\x1b[39m';
const BG_CLOSE = '\x1b[49m';
const BOLD_DIM_CLOSE = '\x1b[22m';
const RESET_CODE = '\x1b[0m';

/** @type {unique symbol} */
const COLOR_SEGMENT = Symbol('color');

/**
 * @param {unknown} value
 * @returns {value is ColorSegment}
 */
const isColorSegment = value => Array.isArray(value) && /** @type {any} */ (value)[COLOR_SEGMENT] === true;

/**
 * @param {string} open
 * @param {string} close
 * @returns {ColorFactory}
 */
const factory = (open, close) => {
    return input => {
        const seg = /** @type {ColorSegment} */ ([open, '' + input, close]);
        /** @type {any} */ (seg)[COLOR_SEGMENT] = true;
        return seg;
    };
};

/**
 * Renders a single value (either a ColorSegment or plain string/number) into
 * the result array, maintaining a stack of active styles so that close codes
 * are replaced with the correct "restore" code from the enclosing style.
 *
 * @param {unknown} value
 * @param {string[]} parts
 * @param {Map<string, string[]>} closeStacks - maps close code -> stack of restore codes
 */
const renderValue = (value, parts, closeStacks) => {
    if (isColorSegment(value)) {
        const [open, text, close] = value;

        // Determine what code should be emitted when this segment's close is encountered
        // by looking at the current stack for that close code group.
        const stack = closeStacks.get(close);
        const restore = stack && stack.length > 0 ? stack[stack.length - 1] : close;

        // Push this segment's open code as the restore point for nested segments
        // that share the same close code.
        if (!closeStacks.has(close)) {
            closeStacks.set(close, []);
        }
        /** @type {string[]} */ (closeStacks.get(close)).push(open);

        parts.push(open);
        renderContent(text, parts, closeStacks);
        parts.push(restore);

        /** @type {string[]} */ (closeStacks.get(close)).pop();
    } else {
        // plain string or number
        parts.push('' + value);
    }
};

/**
 * Renders text content that may contain embedded ANSI close codes that need
 * to be replaced with restore codes from the current style context.
 *
 * @param {string} text
 * @param {string[]} parts
 * @param {Map<string, string[]>} closeStacks
 */
const renderContent = (text, parts, closeStacks) => {
    // We need to find any close codes in the text that match entries in our
    // closeStacks and replace them. This handles the case where color segments
    // were already serialized to strings before being passed to us (e.g., nested
    // factory calls without the tagged template).
    //
    // Collect all close codes we need to watch for.
    /** @type {Map<string, string>} */
    const replacements = new Map();
    for (const [closeCode, stack] of closeStacks) {
        if (stack.length > 0) {
            // The restore code is the one just below us for *our own* close code,
            // or the top of stack for other close codes.
            replacements.set(closeCode, stack[stack.length - 1]);
        }
    }

    if (replacements.size === 0) {
        parts.push(text);
        return;
    }

    // Scan through text looking for any of the close codes to replace.
    let cursor = 0;
    while (cursor < text.length) {
        let found = false;
        for (const [closeCode, restore] of replacements) {
            if (text.startsWith(closeCode, cursor)) {
                // Skip close codes that appear at the very start and match our own
                // open length offset (mimicking the original skip behavior).
                parts.push(restore);
                cursor += closeCode.length;
                found = true;
                break;
            }
        }
        if (!found) {
            // Find the next potential escape sequence start.
            const nextEsc = text.indexOf('\x1b', cursor + 1);
            if (nextEsc === -1) {
                parts.push(text.substring(cursor));
                cursor = text.length;
            } else {
                parts.push(text.substring(cursor, nextEsc));
                cursor = nextEsc;
            }
        }
    }
};

/**
 * Tagged template function that assembles color-coded strings optimally.
 *
 * Usage:
 *   c`Hello ${red('world')}! ${bold('nice')}`
 *
 * Plain (non-ColorSegment) interpolated values are converted to strings.
 * ColorSegment values are rendered with proper nesting / close-code replacement.
 *
 * @param {TemplateStringsArray} strings
 * @param {...(ColorSegment | string | number)} values
 * @returns {string}
 */
export const c = (strings, ...values) => {
    /** @type {string[]} */
    const parts = [];
    /** @type {Map<string, string[]>} */
    const closeStacks = new Map();

    for (let i = 0; i < strings.length; i++) {
        if (strings[i]) {
            parts.push(strings[i]);
        }
        if (i < values.length) {
            renderValue(values[i], parts, closeStacks);
        }
    }

    return parts.join('');
};

// modifiers
/** @type {ColorFactory} */
export const reset = factory(RESET_CODE, RESET_CODE);
/** @type {ColorFactory} */
export const bold = factory('\x1b[1m', BOLD_DIM_CLOSE);
/** @type {ColorFactory} */
export const dim = factory('\x1b[2m', BOLD_DIM_CLOSE);
/** @type {ColorFactory} */
export const italic = factory('\x1b[3m', '\x1b[23m');
/** @type {ColorFactory} */
export const underline = factory('\x1b[4m', '\x1b[24m');
/** @type {ColorFactory} */
export const inverse = factory('\x1b[7m', '\x1b[27m');
/** @type {ColorFactory} */
export const hidden = factory('\x1b[8m', '\x1b[28m');
/** @type {ColorFactory} */
export const strikethrough = factory('\x1b[9m', '\x1b[29m');

// foreground colors
/** @type {ColorFactory} */
export const black = factory('\x1b[30m', FG_CLOSE);
/** @type {ColorFactory} */
export const red = factory('\x1b[31m', FG_CLOSE);
/** @type {ColorFactory} */
export const green = factory('\x1b[32m', FG_CLOSE);
/** @type {ColorFactory} */
export const yellow = factory('\x1b[33m', FG_CLOSE);
/** @type {ColorFactory} */
export const blue = factory('\x1b[34m', FG_CLOSE);
/** @type {ColorFactory} */
export const magenta = factory('\x1b[35m', FG_CLOSE);
/** @type {ColorFactory} */
export const cyan = factory('\x1b[36m', FG_CLOSE);
/** @type {ColorFactory} */
export const white = factory('\x1b[37m', FG_CLOSE);
/** @type {ColorFactory} */
export const gray = factory('\x1b[90m', FG_CLOSE);

// background colors
/** @type {ColorFactory} */
export const bgBlack = factory('\x1b[40m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgRed = factory('\x1b[41m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgGreen = factory('\x1b[42m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgYellow = factory('\x1b[43m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgBlue = factory('\x1b[44m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgMagenta = factory('\x1b[45m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgCyan = factory('\x1b[46m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgWhite = factory('\x1b[47m', BG_CLOSE);

// bright foreground colors
/** @type {ColorFactory} */
export const blackBright = factory('\x1b[90m', FG_CLOSE);
/** @type {ColorFactory} */
export const redBright = factory('\x1b[91m', FG_CLOSE);
/** @type {ColorFactory} */
export const greenBright = factory('\x1b[92m', FG_CLOSE);
/** @type {ColorFactory} */
export const yellowBright = factory('\x1b[93m', FG_CLOSE);
/** @type {ColorFactory} */
export const blueBright = factory('\x1b[94m', FG_CLOSE);
/** @type {ColorFactory} */
export const magentaBright = factory('\x1b[95m', FG_CLOSE);
/** @type {ColorFactory} */
export const cyanBright = factory('\x1b[96m', FG_CLOSE);
/** @type {ColorFactory} */
export const whiteBright = factory('\x1b[97m', FG_CLOSE);

// bright background colors
/** @type {ColorFactory} */
export const bgBlackBright = factory('\x1b[100m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgRedBright = factory('\x1b[101m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgGreenBright = factory('\x1b[102m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgYellowBright = factory('\x1b[103m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgBlueBright = factory('\x1b[104m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgMagentaBright = factory('\x1b[105m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgCyanBright = factory('\x1b[106m', BG_CLOSE);
/** @type {ColorFactory} */
export const bgWhiteBright = factory('\x1b[107m', BG_CLOSE);
