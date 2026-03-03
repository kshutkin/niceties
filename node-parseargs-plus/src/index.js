import { parseArgs } from 'node:util';

/**
 * @template {import('./types.d.ts').ParseArgsPlusConfig} T
 * @typedef {import('./types.d.ts').ParseArgsPlusResult<T>} ParseArgsPlusResult
 */

/**
 * Enhanced parseArgs wrapper with additional features.
 * @type {import('./types.d.ts').parseArgsPlus}
 */
export function parseArgsPlus(config) {
    return /** @type {any} */ (parseArgs(config));
}
