/**
 * @param {string} text
 * @returns {(text: string) => void}
 */
export function draft(text) {
    process.stdout.write(`${text}\n`);

    /** @param {string} newText */
    return newText => {
        process.stdout.write(`${newText}\n`);
    };
}
