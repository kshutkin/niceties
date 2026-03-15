import { parseArgs } from 'node:util';

/**
 * Symbol used for cross-middleware communication of resolved command state.
 * The commands middleware stashes state on the config object under this key
 * during `transformConfig`, making it available to other middlewares.
 */
export const kCommandState = Symbol.for('parseArgsPlus.commandState');

/**
 * Enhanced parseArgs wrapper with additional features.
 * @param {import('./types.d.ts').ParseArgsPlusConfig} config
 * @param {import('./types.d.ts').Middleware<any, any>[]} [middlewares]
 * @returns {import('./types.d.ts').ParseArgsPlusResultBase & { tokens?: import('./types.d.ts').Token[] }}
 */
export function parseArgsPlus(config, middlewares = []) {
    // Sort middlewares by order (stable sort, default order = 0)
    const sorted = [...middlewares].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Let middlewares transform the config before calling parseArgs
    let transformedConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig} */ (config);
    for (const mw of sorted) {
        transformedConfig = mw[0](transformedConfig);
    }

    // Call the native parseArgs
    let result = /** @type {import('./types.d.ts').ParseArgsPlusResultBase & { tokens?: import('./types.d.ts').Token[] }} */ (
        parseArgs(transformedConfig)
    );

    // Let middlewares transform the result (reverse order for proper unwinding)
    for (let i = sorted.length - 1; i >= 0; i--) {
        result = sorted[i][1](result, config);
    }

    return result;
}
