import { ColorFormatters, LogLevel, Prefixes } from "./types";

export function createFormatter(colors: ColorFormatters, prefixes: Prefixes) {
    return function formatMessage(message: string, loglevel: LogLevel, usePrefix?: string | boolean, identation: number = 0): string {
        const prefix = usePrefix === true ? (`${prefixes[loglevel]} `) : (typeof usePrefix === 'string' ? (`${usePrefix} `) : '');
        const color = colors[loglevel];
        const text = `${prefix}${message}`;
        return `${' '.repeat(identation)}${color ? color(text) : text}`;
    }
}

// from dreidels/utils
export function terminalSupportsUnicode() {
    // The default command prompt and powershell in Windows do not support Unicode characters.
    // However, the VSCode integrated terminal and the Windows Terminal both do.
    return process.platform !== 'win32'
      || process.env.TERM_PROGRAM === 'vscode'
      || !!process.env.WT_SESSION;
}