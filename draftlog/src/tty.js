import { layout } from './layout.js';

let isInternalWrite = false;
let updateScheduled = false;
let activeLines = 0;

const originalWrite = process.stdout.write;

/**
 * @typedef {import('./index.js').DraftOptions} DraftOptions
 * @typedef {import('./index.js').DraftUpdater} DraftUpdater
 * @typedef {{ content: string; continuationIndent: number; renderedWidths: (number | number[])[]; active: boolean; clipped: boolean }} DraftLine
 */

/** @type {DraftLine[]} */
const lines = [];

process.stdout.write = /** @type {typeof originalWrite} */ (
    function (/** @type {string | Uint8Array} */ chunk, /** @type {any[]} */ ...args) {
        if (!isInternalWrite && lines.length > 0) {
            const str = typeof chunk === 'string' ? chunk : chunk.toString();
            if (str.length > 0) {
                const visible = computeVisibleDraft();
                const { rowCount } = visible;

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
                    renderVisible(visible, this);
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
 * @param {DraftOptions} [options]
 * @returns {DraftUpdater}
 */
export function draft(text, options) {
    const wasEmpty = activeLines === 0;
    /** @type {DraftLine} */
    const line = {
        content: text,
        continuationIndent: normalizeIndent(options?.continuationIndent),
        renderedWidths: [],
        active: true,
        clipped: false,
    };

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

    /** @type {DraftUpdater} */
    const updater = (newText, newOptions) => {
        if (!line.active) {
            return;
        }
        line.content = newText;
        if (newOptions && 'continuationIndent' in newOptions) {
            line.continuationIndent = normalizeIndent(newOptions.continuationIndent);
        }
        scheduleUpdate();
    };

    registry.register(updater, line);
    computeVisibleDraft();

    return updater;
}

/** @param {number | undefined} value */
function normalizeIndent(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/**
 * @param {DraftLine} line
 * @param {NodeJS.WriteStream} [stream]
 * @param {number} [maxRows]
 */
function renderLine(line, stream = process.stdout, maxRows = Infinity) {
    const columns = process.stdout.columns || 80;
    const indent = line.continuationIndent < columns ? line.continuationIndent : 0;
    const rows = layout(line.content, indent, columns);
    const skip = Math.max(0, rows.length - maxRows);
    const visible = rows.slice(skip);
    const prefix = skip > 0 ? rows[skip].prefix : '';
    originalWrite.call(stream, `${prefix}${visible.map(row => row.text).join('\n')}\n`);
    // Ordinary rows need just a total width. Wide graphemes need their individual
    // widths so a resize cannot incorrectly split one across two terminal rows.
    line.renderedWidths = visible.map(row => (row.widths.some(width => width > 1) ? row.widths : row.width));
}

/**
 * @param {{ firstRowLimit: number }} visible
 * @param {NodeJS.WriteStream} [stream]
 */
function renderVisible({ firstRowLimit }, stream = process.stdout) {
    for (let i = 0; i < lines.length; i++) {
        renderLine(lines[i], stream, i === 0 && lines[i].clipped ? firstRowLimit : Infinity);
    }
}

/**
 * Determine which draft lines are visible in the terminal viewport
 * and how many terminal rows they occupy in total.
 *
 * Walks backwards from the last line, accumulating row counts.
 * Includes the visible tail of a partially visible draft, discarding only drafts
 * fully above the viewport. A clipped draft subsequently renders just its tail.
 *
 * @returns {{ rowCount: number; firstRowLimit: number }}
 */
function computeVisibleDraft() {
    const rows = process.stdout.rows || 24;

    // Leave at least 1 row for the cursor position itself
    const maxRows = Math.max(0, rows - 1);
    let rowCount = 0;
    let startIndex = lines.length;
    let firstRowLimit = 0;

    for (let i = lines.length - 1; i >= 0; i--) {
        // Pending updates have not changed the rows currently on screen.
        const lineRows = terminalRowsForLine(lines[i].renderedWidths);
        if (rowCount === maxRows) {
            break;
        }
        firstRowLimit = maxRows - rowCount;
        if (lineRows > firstRowLimit) {
            lines[i].clipped = true;
        }
        rowCount += Math.min(lineRows, firstRowLimit);
        startIndex = i;
    }

    const discardCount = startIndex;
    if (discardCount > 0) {
        for (const line of lines.splice(0, discardCount)) {
            deactivateLine(line);
            line.content = '';
            line.renderedWidths = [];
        }
    }

    return { rowCount, firstRowLimit };
}

/**
 * Compute terminal rows from the displayed width of each emitted row.
 * A terminal resize can reflow these rows before we clear the old layout.
 * @param {(number | number[])[]} widths
 * @returns {number}
 */
function terminalRowsForLine(widths) {
    const columns = process.stdout.columns || 80;
    let rows = 0;
    for (const width of widths) {
        if (typeof width === 'number') {
            rows += Math.max(1, Math.ceil(width / columns));
        } else {
            rows++;
            let column = 0;
            for (const graphemeWidth of width) {
                if (column > 0 && column + graphemeWidth > columns) {
                    rows++;
                    column = 0;
                }
                column += graphemeWidth;
            }
        }
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

    const visible = computeVisibleDraft();
    const { rowCount } = visible;
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
        renderVisible(visible);
        syncEnd();
        computeVisibleDraft();
        // Cursor is now at the line below all drafts, at beginning
    } finally {
        isInternalWrite = false;
    }
}
