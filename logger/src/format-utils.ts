import { Action, LogLevel } from '.';
import { ColorFormatters, LogMessage, Prefixes } from './types';

export function createFormatter(colors: ColorFormatters, prefixes: Prefixes, tagFactory: (tag: string) => string) {
    return function formatMessage({ loglevel, message, context, action, tag }: LogMessage, usePrefix?: string | boolean, identation = 0): string {
        const prefix = usePrefix === true ? (`${prefixes[loglevel]} `) : (typeof usePrefix === 'string' ? (`${usePrefix} `) : '');
        const color = colors[loglevel];
        const text = `${prefix}${loglevel === LogLevel.verbose && action === Action.log && tag !== undefined ? tagFactory(tag) + ' ' : ''}${message}${context != null? ' ' + context : ''}`;
        return `${' '.repeat(identation)}${color ? color(text) : text}`;
    };
}

// from dreidels/utils
export function terminalSupportsUnicode() {
    // The default command prompt and powershell in Windows do not support Unicode characters.
    // However, the VSCode integrated terminal and the Windows Terminal both do.
    return process.platform !== 'win32'
      || process.env.TERM_PROGRAM === 'vscode'
      || !!process.env.WT_SESSION;
}