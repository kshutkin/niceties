import { parseArgs } from 'node:util';

/**
 * @typedef {import('node:util').ParseArgsConfig} ParseArgsConfig
 */

/**
 * Enhanced parseArgs wrapper with additional features.
 * @param {ParseArgsConfig} config
 * @returns {ReturnType<typeof parseArgs>}
 */
export function parseArgsPlus(config) {
    return parseArgs(config);
}
