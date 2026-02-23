/**
 * @param {string} message
 * @returns {string[]}
 */
export default function splitByLines(message) {
    return message.match(getSubstringsRegex()) ?? [];
}

/** @type {RegExp | undefined} */
let substringsRegex;

/** @type {number | undefined} */
let substringsColumns;

/**
 * @returns {RegExp}
 */
function getSubstringsRegex() {
    const newColumns = process.stdout.columns || 80;
    if (substringsColumns !== newColumns) {
        substringsRegex = new RegExp(`.{1,${newColumns}}`, 'g');
        substringsColumns = newColumns;
    }
    return /** @type {RegExp} */ (substringsRegex);
}
