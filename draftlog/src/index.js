/** @type {{ content: string, linesUp: number }[]} */
const lines = [];

const registry = new FinalizationRegistry((/** @type {{ content: string, linesUp: number }} */ line) => {
    const index = lines.indexOf(line);
    if (index !== -1) {
        lines.splice(index, 1);
        // Do NOT recalculate linesUp for remaining lines:
        // the physical terminal line is still present,
        // so all other lines' distances from cursor remain unchanged.
    }
});

if (process.stdout.isTTY) {
    process.stdout.on('resize', () => {
        for (const line of lines) {
            updateLine(line, line.content);
        }
    });
}

/**
 * @param {string} text
 * @returns {(text: string) => void}
 */
export function draft(text) {
    // Write the initial line
    process.stdout.write(`${text}\n`);

    // Shift all existing lines up by 1 (new physical line added at bottom)
    for (const line of lines) {
        line.linesUp++;
    }

    /** @type {{ content: string, linesUp: number }} */
    const line = { content: text, linesUp: 0 };
    lines.push(line);

    /** @param {string} newText */
    const updater = newText => {
        updateLine(line, newText);
    };

    registry.register(updater, line);

    return updater;
}

/**
 * @param {{ content: string, linesUp: number }} line
 * @param {string} newText
 */
function updateLine(line, newText) {
    line.content = newText;
    if (line.linesUp > 0) {
        // Move cursor up to the target line
        process.stdout.write(`\x1B[${line.linesUp}A`);
    }
    // Move to beginning of line, clear entire line, write new content
    process.stdout.write(`\r\x1B[2K${newText}`);
    if (line.linesUp > 0) {
        // Move cursor back down to the bottom
        process.stdout.write(`\x1B[${line.linesUp}B`);
    }
    // Return to beginning of line below all drafts
    process.stdout.write('\r');
}
