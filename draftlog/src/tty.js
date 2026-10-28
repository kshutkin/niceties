import stringWidth from 'string-width';

let isInternalWrite = false;
let updateScheduled = false;
let activeLines = 0;

const originalWrite = process.stdout.write;

/** @typedef {{ content: string; renderedWidths: number[]; active: boolean }} DraftLine */

/** @type {DraftLine[]} */
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
                        renderLine(lines[i], this);
                    }
                    syncEnd();
                    computeVisibleDraft();
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
    const wasEmpty = activeLines === 0;
    /** @type {DraftLine} */
    const line = { content: text, renderedWidths: [], active: true };

    // Write the initial line
    isInternalWrite = true;
    try {
        renderLine(line);
    } finally {
        isInternalWrite = false;
    }

    lines.push(line);
    activeLines++;

    if (wasEmpty) {
        hideCursor();
    }

    /** @param {string} newText */
    const updater = newText => {
        if (!line.active) {
            return;
        }
        line.content = newText;
        scheduleUpdate();
    };

    registry.register(updater, line);
    computeVisibleDraft();

    return updater;
}

/**
 * @param {DraftLine} line
 * @param {NodeJS.WriteStream} [stream]
 */
function renderLine(line, stream = process.stdout) {
    originalWrite.call(stream, `${line.content}\n`);
    line.renderedWidths = line.content.split('\n').map(text => stringWidth(text));
}

/**
 * Determine which draft lines are visible in the terminal viewport
 * and how many terminal rows they occupy in total.
 *
 * Walks backwards from the last line, accumulating row counts,
 * stopping when adding another line would exceed the viewport.
 * Discards drafts fully above the viewport, retaining a partially visible draft.
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
        // Pending updates have not changed the rows currently on screen.
        const lineRows = terminalRowsForLine(lines[i].renderedWidths);
        if (rowCount + lineRows > maxRows) {
            break;
        }
        rowCount += lineRows;
        startIndex = i;
    }

    const discardCount = rowCount === maxRows ? startIndex : Math.max(0, startIndex - 1);
    if (discardCount > 0) {
        for (const line of lines.splice(0, discardCount)) {
            deactivateLine(line);
            line.content = '';
            line.renderedWidths = [];
        }
    }

    return { startIndex: startIndex - discardCount, rowCount };
}

/**
 * Compute terminal rows from the displayed width of each logical line.
 * Cached widths account for wide/CJK characters and ANSI escape codes,
 * and can be rewrapped at the current terminal width after a resize.
 * @param {number[]} widths
 * @returns {number}
 */
function terminalRowsForLine(widths) {
    const columns = process.stdout.columns || 80;
    let rows = 0;
    for (const width of widths) {
        rows += Math.max(1, Math.ceil(width / columns));
    }
    return rows;
}

/** @param {DraftLine} line */
function deactivateLine(line) {
    if (!line.active) {
        return;
    }
    line.active = false;
    if (--activeLines === 0) {
        showCursor();
    }
}

const registry = new FinalizationRegistry(deactivateLine);

process.stdout.on('resize', scheduleUpdate);
process.on('exit', () => {
    if (activeLines > 0) {
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
            renderLine(lines[i]);
        }
        syncEnd();
        computeVisibleDraft();
        // Cursor is now at the line below all drafts, at beginning
    } finally {
        isInternalWrite = false;
    }
}
