import stringWidth from 'string-width';

let isInternalWrite = false;
let updateScheduled = false;

const originalWrite = process.stdout.write;

/** @type {{ content: string }[]} */
const lines = [];

process.stdout.write = /** @type {typeof originalWrite} */ (
    function (/** @type {string | Uint8Array} */ chunk, /** @type {any[]} */ ...args) {
        if (!isInternalWrite && lines.length > 0) {
            const str = typeof chunk === 'string' ? chunk : chunk.toString();
            if (str.length > 0) {
                const { startIndex, rowCount } = computeVisibleDraft();

                isInternalWrite = true;
                try {
                    syncStart();
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
                    syncEnd();
                } finally {
                    isInternalWrite = false;
                }

                return result;
            }
        }
        return originalWrite.call(this, chunk, ...args);
    }
);

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
        scheduleUpdate();
    };

    registry.register(updater, line);

    return updater;
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

/**
 * Compute how many terminal rows a single line of text occupies,
 * accounting for wide/CJK characters and ANSI escape codes.
 * @param {string} content
 * @returns {number}
 */
function terminalRowsForLine(content) {
    const columns = process.stdout.columns || 80;
    const width = stringWidth(content);
    return width === 0 ? 1 : Math.ceil(width / columns);
}

const registry = new FinalizationRegistry((/** @type {{ content: string }} */ line) => {
    const index = lines.indexOf(line);
    if (index !== -1) {
        lines.splice(index, 1);
        if (lines.length === 0) {
            showCursor();
        }
    }
});

process.stdout.on('resize', scheduleUpdate);
process.on('exit', () => {
    if (lines.length > 0) {
        showCursor();
    }
});

function syncStart() {
    originalWrite.call(process.stdout, '\x1B[?2026h');
}

function syncEnd() {
    originalWrite.call(process.stdout, '\x1B[?2026l');
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
        syncStart();
        // Move cursor up by total terminal rows, then erase to end of screen.
        // Using \x1B[J instead of per-line \x1B[2K so that wrapped lines
        // (occupying multiple terminal rows) are fully cleared.
        originalWrite.call(process.stdout, `\x1B[${rowCount}A\r\x1B[J`);
        // Rewrite each visible line
        for (let i = startIndex; i < lines.length; i++) {
            originalWrite.call(process.stdout, `${lines[i].content}\n`);
        }
        syncEnd();
        // Cursor is now at the line below all drafts, at beginning
    } finally {
        isInternalWrite = false;
    }
}
