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
    let result = string.substring(0, index) + replace;
    let cursor = index + closeLength;
    let next;
    // biome-ignore lint/suspicious/noAssignInExpressions: optimization
    while ((next = string.indexOf(close, cursor)) !== -1) {
        result += string.substring(cursor, next) + replace;
        cursor = next + closeLength;
    }
    return result + string.substring(cursor);
};

/**
 * @param {string} open
 * @param {string} close
 * @param {string} [replace=open]
 * @returns {Formatter}
 */
export const formatter = (open, close, replace = open) => {
    const skip = open.length;
    return input => {
        // biome-ignore lint/style/useTemplate: optimization
        const string = '' + input;
        const index = string.indexOf(close, skip);
        return index !== -1 ? open + replaceClose(string, close, replace, index) + close : open + string + close;
    };
};
