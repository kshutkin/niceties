/**
 * @typedef {(input: string | number) => string} Formatter
 */

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
        return ~string.indexOf(close, skip) ? open + string.replaceAll(close, replace) + close : open + string + close;
    };
};
