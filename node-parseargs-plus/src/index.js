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
    // Sort middlewares by configOrder for the transformConfig phase
    // Function-level order (mw[0].order) takes precedence over tuple-level configOrder
    const configSorted = [...middlewares].sort((a, b) => (a[0].order ?? a.configOrder ?? 0) - (b[0].order ?? b.configOrder ?? 0));

    // Sort middlewares by resultOrder for the transformResult phase
    // Function-level order (mw[1].order) takes precedence over tuple-level resultOrder
    const resultSorted = [...middlewares].sort((a, b) => (a[1].order ?? a.resultOrder ?? 0) - (b[1].order ?? b.resultOrder ?? 0));

    // Let middlewares transform the config before calling parseArgs
    let transformedConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig} */ (config);
    for (const mw of configSorted) {
        transformedConfig = mw[0](transformedConfig);
    }

    // Call the native parseArgs
    let result = /** @type {import('./types.d.ts').ParseArgsPlusResultBase & { tokens?: import('./types.d.ts').Token[] }} */ (
        parseArgs(transformedConfig)
    );

    // Let middlewares transform the result in resultOrder
    for (const mw of resultSorted) {
        result = mw[1](result, transformedConfig);
    }

    return result;
}
