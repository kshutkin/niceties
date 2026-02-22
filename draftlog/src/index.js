import stringWidth from 'string-width';

/** @type {{ content: string }[]} */
const lines = [];

let isInternalWrite = false;
let updateScheduled = false;

const originalWrite = process.stdout.write;

const SYNCHRONIZED_OUTPUT_ENABLE = '\x1B[?2026h';
const SYNCHRONIZED_OUTPUT_DISABLE = '\x1B[?2026l';
const useSynchronizedOutput = process.stdout.isTTY === true;

/**
 * Compute how many terminal rows a single line of text occupies,
 * accounting for wide/CJK characters and ANSI escape codes.
 * @param {string} content
 * @returns {number}
 */
function terminalRowsForLine(content) {
    const columns = process.stdout.columns || 80;
    const width = stringWidth(content);
    if (width === 0) {
        return 1;
    }
    return Math.ceil(width / columns);
}

/**
 * Determine which draft lines are visible in the terminal viewport
 * and how many terminal rows they occupy in total.
 *
 * Walks backwards from the last line, accumulating row counts,
 * stopping when adding another line would exceed the viewport.
 *
 * @returns {{ startIndex: number, rowCount: number }}
 */
function computeVisibleDraft() {
    const rows = process.stdout.rows;
    if (rows == null) {
        // Non-TTY or unknown height: assume all lines are visible
        let totalRows = 0;
        for (const line of lines) {
            totalRows += terminalRowsForLine(line.content);
        }
        return { startIndex: 0, rowCount: totalRows };
    }

    // Leave at least 1 row for the cursor position itself
    const maxRows = rows - 1;
    let rowCount = 0;
    let startIndex = lines.length;

    for (let i = lines.length - 1; i >= 0; i--) {
        const lineRows = terminalRowsForLine(lines[i].content);
        if (rowCount + lineRows > maxRows) {
            break;
        }
        rowCount += lineRows;
        startIndex = i;
    }

    return { startIndex, rowCount };
}

process.stdout.write = /** @type {typeof originalWrite} */ (
    function (/** @type {string | Uint8Array} */ chunk, /** @type {any[]} */ ...args) {
        if (!isInternalWrite && lines.length > 0) {
            const str = typeof chunk === 'string' ? chunk : chunk.toString();
            if (str.length > 0) {
                const { startIndex, rowCount } = computeVisibleDraft();

                isInternalWrite = true;
                try {
                    if (useSynchronizedOutput) {
                        originalWrite.call(this, SYNCHRONIZED_OUTPUT_ENABLE);
                    }
                    // Move cursor up by the total terminal rows occupied by
                    // visible draft lines, then erase to end of screen
                    if (rowCount > 0) {
                        originalWrite.call(this, `\x1B[${rowCount}A\r\x1B[J`);
                    } else {
                        originalWrite.call(this, `\r\x1B[J`);
                    }
                } finally {
                    isInternalWrite = false;
                }

                // Pass through the external write
                const result = originalWrite.call(this, chunk, ...args);

                // Re-render only the visible draft lines at the bottom
                // (lines that scrolled off the top are lost and cannot be updated)
                isInternalWrite = true;
                try {
                    for (let i = startIndex; i < lines.length; i++) {
                        originalWrite.call(this, `${lines[i].content}\n`);
                    }
                    if (useSynchronizedOutput) {
                        originalWrite.call(this, SYNCHRONIZED_OUTPUT_DISABLE);
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

    const { startIndex, rowCount } = computeVisibleDraft();
    if (rowCount <= 0) {
        return;
    }

    isInternalWrite = true;
    try {
        if (useSynchronizedOutput) {
            originalWrite.call(process.stdout, SYNCHRONIZED_OUTPUT_ENABLE);
        }
        // Move cursor up by total terminal rows, then erase to end of screen.
        // Using \x1B[J instead of per-line \x1B[2K so that wrapped lines
        // (occupying multiple terminal rows) are fully cleared.
        originalWrite.call(process.stdout, `\x1B[${rowCount}A\r\x1B[J`);
        // Rewrite each visible line
        for (let i = startIndex; i < lines.length; i++) {
            originalWrite.call(process.stdout, `${lines[i].content}\n`);
        }
        if (useSynchronizedOutput) {
            originalWrite.call(process.stdout, SYNCHRONIZED_OUTPUT_DISABLE);
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
