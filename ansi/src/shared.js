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
    let result = '';
    let cursor = 0;
    const closeLength = close.length;
    do {
        result += string.substring(cursor, index) + replace;
        cursor = index + closeLength;
        index = string.indexOf(close, cursor);
    } while (index !== -1);
    return result + string.substring(cursor);
};

/**
 * @param {string} open
 * @param {string} close
 * @param {string} [replace]
 * @returns {Formatter}
 */
export const formatter = (open, close, replace = open) => {
    const skip = open.length;
    return input => {
        const string = '' + input;
        const index = string.indexOf(close, skip);
        return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
    };
};
