/**
 * @typedef {import('./types.js').LogMessage} LogMessage
 * @typedef {import('./types.js').ColorFormatters} ColorFormatters
 * @typedef {import('./types.js').Prefixes} Prefixes
 */

import { Action, LogLevel } from './types.js';

/**
 * @param {ColorFormatters} colors
 * @param {Prefixes} prefixes
 * @param {(tag: string) => string} tagFactory
 * @returns {(message: LogMessage, usePrefix?: string | boolean, indentation?: number) => string}
 */
export const createFormatter = (colors, prefixes, tagFactory) => {
    return ({ loglevel, message, context, action, tag }, usePrefix, indentation = 0) => {
        const prefix = usePrefix === true ? `${prefixes[loglevel]} ` : typeof usePrefix === 'string' ? `${usePrefix} ` : '';
        const color = colors[loglevel];
        const text = `${prefix}${loglevel === LogLevel.verbose && action === Action.log && tag !== undefined ? `${tagFactory(tag)} ` : ''}${message}${context != null ? ` ${context}` : ''}`;
        return `${' '.repeat(indentation)}${color ? color(text) : text}`;
    };
};

/**
 * Checks if the terminal supports Unicode characters.
 * The default command prompt and powershell in Windows do not support Unicode characters.
 * However, the VSCode integrated terminal and the Windows Terminal both do.
 * @returns {boolean}
 */
export const terminalSupportsUnicode = () => {
    return process.platform !== 'win32' || process.env.TERM_PROGRAM === 'vscode' || !!process.env.WT_SESSION;
};