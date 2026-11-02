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

/**
 * @param {string | number} input Anchor text.
 * @param {string} url URI-encoded link target.
 * @returns {string}
 */
export const link = (input, url) => {
    const open = `\x1b]8;;${url}\x1b\\`;
    const close = '\x1b]8;;\x1b\\';
    // biome-ignore lint/style/useTemplate: optimization
    return open + ('' + input).replaceAll(close, () => open) + close;
};
