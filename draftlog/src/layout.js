import ansiRegex from 'ansi-regex';
import stringWidth from 'string-width';

const segmenter = new Intl.Segmenter();

/**
 * Lay out physical rows without splitting escape sequences or graphemes.
 * `prefix` restores formatting when rendering starts partway through a draft.
 * @param {string} text
 * @param {number} indentation
 * @param {number} columns
 * @returns {{ text: string; widths: number[]; width: number; prefix: string }[]}
 */
export function layout(text, indentation, columns) {
    /** @type {{ index: number; text: string }[]} */
    const escapes = [];
    let removed = 0;
    const plain = text.replace(ansiRegex(), (sequence, index) => {
        escapes.push({ index: index - removed, text: sequence });
        removed += sequence.length;
        return '';
    });
    const indent = indentation < columns ? indentation : 0;
    let formatting = '';
    let escapeIndex = 0;
    let row = { text: '', widths: /** @type {number[]} */ ([]), width: 0, prefix: '' };
    const rows = [row];

    function nextRow() {
        row = { text: '', widths: [], width: 0, prefix: formatting };
        rows.push(row);
    }

    /** @param {string} sequence */
    function appendEscape(sequence) {
        row.text += sequence;
        // Replay only styling and hyperlinks, never cursor movement.
        if (sequence.endsWith('m') || sequence.startsWith('\x1B]8;')) {
            formatting += sequence;
        }
    }

    for (const { segment, index } of segmenter.segment(plain)) {
        const newline = segment === '\n' || segment === '\r\n';
        const width = stringWidth(segment);
        if (!newline && width > 0) {
            if (row.width > 0 && row.width + width > columns) {
                nextRow();
            }
            if (rows.length > 1 && row.width === 0 && width + indent <= columns) {
                row.text += ' '.repeat(indent);
                row.width = indent;
                row.widths = Array(indent).fill(1);
            }
        }
        let offset = index;
        while (escapeIndex < escapes.length && escapes[escapeIndex].index < index + segment.length) {
            const sequence = escapes[escapeIndex++];
            row.text += plain.slice(offset, sequence.index);
            appendEscape(sequence.text);
            offset = sequence.index;
        }
        if (newline) {
            nextRow();
        } else {
            row.text += plain.slice(offset, index + segment.length);
            row.width += width;
            if (width > 0) row.widths.push(width);
        }
    }
    while (escapeIndex < escapes.length) {
        appendEscape(escapes[escapeIndex++].text);
    }
    return rows;
}
