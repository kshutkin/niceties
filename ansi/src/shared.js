/**
 * @typedef {(input: string | number) => string} Formatter
 */

/**
 * @param {string} string
 * @param {string} close
 * @param {string} replace
 * @param {number} index
 * @returns {string}
 */
const replaceClose = (string, close, replace, index) => {
    const closeLength = close.length;
    let cursor = index + closeLength;
    let next = string.indexOf(close, cursor);
    if (next === -1) {
        return string.substring(0, index) + replace + string.substring(cursor);
    }
    let result = string.substring(0, index) + replace;
    do {
        result += string.substring(cursor, next) + replace;
        cursor = next + closeLength;
        next = string.indexOf(close, cursor);
    } while (next !== -1);
    return result + string.substring(cursor);
};

/**
 * @param {string} open
 * @param {string} close
 * @returns {Formatter}
 */
export const formatter = (open, close) => {
    const skip = open.length;
    return input => {
        const string = '' + input;
        const index = string.indexOf(close, skip);
        return ~index ? open + replaceClose(string, close, open, index) + close : open + string + close;
    };
};

/**
 * @param {string} open
 * @param {string} close
 * @param {string} replace
 * @returns {Formatter}
 */
export const modifier = (open, close, replace) => {
    const skip = open.length;
    return input => {
        const string = '' + input;
        const index = string.indexOf(close, skip);
        return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
    };
};
