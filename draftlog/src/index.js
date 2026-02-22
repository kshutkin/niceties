/** @type {{ content: string }[]} */
const lines = [];

let isInternalWrite = false;

const originalWrite = process.stdout.write;

process.stdout.write = /** @type {typeof originalWrite} */ (
    function (/** @type {string | Uint8Array} */ chunk, /** @type {any[]} */ ...args) {
        if (!isInternalWrite && lines.length > 0) {
            const str = typeof chunk === 'string' ? chunk : chunk.toString();
            if (str.length > 0) {
                isInternalWrite = true;
                try {
                    // Move cursor up to the first draft line, then erase to end of screen
                    originalWrite.call(this, `\x1B[${lines.length}A\r\x1B[J`);
                } finally {
                    isInternalWrite = false;
                }

                // Pass through the external write
                const result = originalWrite.call(this, chunk, ...args);

                // Re-render all draft lines at the bottom
                isInternalWrite = true;
                try {
                    for (const line of lines) {
                        originalWrite.call(this, `${line.content}\n`);
                    }
                } finally {
                    isInternalWrite = false;
                }

                return result;
            }
        }
        return originalWrite.call(this, chunk, ...args);
    }
);

const registry = new FinalizationRegistry((/** @type {{ content: string }} */ line) => {
    const index = lines.indexOf(line);
    if (index !== -1) {
        lines.splice(index, 1);
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
    isInternalWrite = true;
    try {
        process.stdout.write(`${text}\n`);
    } finally {
        isInternalWrite = false;
    }

    /** @type {{ content: string }} */
    const line = { content: text };
    lines.push(line);

    /** @param {string} newText */
    const updater = newText => {
        updateLine(line, newText);
    };

    registry.register(updater, line);

    return updater;
}

/**
 * @param {{ content: string }} line
 * @param {string} newText
 */
function updateLine(line, newText) {
    line.content = newText;
    const index = lines.indexOf(line);
    if (index === -1) {
        return;
    }
    const linesUp = lines.length - 1 - index;
    isInternalWrite = true;
    try {
        if (linesUp > 0) {
            // Move cursor up to the target line
            process.stdout.write(`\x1B[${linesUp}A`);
        }
        // Move to beginning of line, clear entire line, write new content
        process.stdout.write(`\r\x1B[2K${newText}`);
        if (linesUp > 0) {
            // Move cursor back down to the bottom
            process.stdout.write(`\x1B[${linesUp}B`);
        }
        // Return to beginning of line below all drafts
        process.stdout.write('\r');
    } finally {
        isInternalWrite = false;
    }
}
