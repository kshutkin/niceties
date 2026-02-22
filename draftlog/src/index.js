/** @type {{ content: string }[]} */
const lines = [];

let isInternalWrite = false;
let updateScheduled = false;

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
        if (lines.length === 0) {
            showCursor();
        }
    }
});

if (process.stdout.isTTY) {
    process.stdout.on('resize', scheduleUpdate);
}

function hideCursor() {
    isInternalWrite = true;
    try {
        originalWrite.call(process.stdout, '\x1B[?25l');
    } finally {
        isInternalWrite = false;
    }
}

function showCursor() {
    isInternalWrite = true;
    try {
        originalWrite.call(process.stdout, '\x1B[?25h');
    } finally {
        isInternalWrite = false;
    }
}

function scheduleUpdate() {
    if (!updateScheduled) {
        updateScheduled = true;
        process.nextTick(flushUpdates);
    }
}

function flushUpdates() {
    updateScheduled = false;
    if (lines.length === 0) {
        return;
    }
    isInternalWrite = true;
    try {
        // Move cursor up to the first draft line
        originalWrite.call(process.stdout, `\x1B[${lines.length}A`);
        // Rewrite each line exactly once
        for (const line of lines) {
            originalWrite.call(process.stdout, `\r\x1B[2K${line.content}\n`);
        }
        // Cursor is now at the line below all drafts, at beginning
    } finally {
        isInternalWrite = false;
    }
}

// Ensure cursor is restored on exit
function onExit() {
    if (lines.length > 0) {
        showCursor();
    }
}
process.on('exit', onExit);

/**
 * @param {string} text
 * @returns {(text: string) => void}
 */
export function draft(text) {
    const wasEmpty = lines.length === 0;

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

    if (wasEmpty) {
        hideCursor();
    }

    /** @param {string} newText */
    const updater = newText => {
        line.content = newText;
        if (lines.indexOf(line) !== -1) {
            scheduleUpdate();
        }
    };

    registry.register(updater, line);

    return updater;
}
