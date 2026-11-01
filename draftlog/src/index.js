/**
 * @typedef {Object} DraftOptions
 * @property {number} [continuationIndent] Absolute left margin in spaces for rows after the first (TTY only).
 * Nonnegative safe integers are accepted; invalid supplied values become zero.
 * Omitted update options preserve the last margin; zero explicitly resets it.
 * @typedef {(text: string, options?: DraftOptions) => void} DraftUpdater
 */

/**
 * @type {{ draft: (text: string, options?: DraftOptions) => DraftUpdater }}
 */
const { draft } = await import(process.stdout.isTTY ? './tty.js' : './non-tty.js');

export { draft };
