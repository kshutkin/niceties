import { parseArgs } from 'node:util';

/**
 * Enhanced parseArgs wrapper with additional features.
 * @param {import('./types.d.ts').ParseArgsPlusConfig} config
 * @param {import('./types.d.ts').Middleware<any, any>[]} [middlewares]
 * @returns {import('./types.d.ts').ParseArgsPlusResultBase & { tokens?: import('./types.d.ts').Token[] }}
 */
export function parseArgsPlus(config, middlewares = []) {
    // Let middlewares transform the config before calling parseArgs
    let transformedConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig} */ (config);
    for (const mw of middlewares) {
        transformedConfig = mw[0](transformedConfig);
    }

    // Call the native parseArgs
    let result = /** @type {import('./types.d.ts').ParseArgsPlusResultBase & { tokens?: import('./types.d.ts').Token[] }} */ (
        parseArgs(transformedConfig)
    );

    // Let middlewares transform the result (reverse order for proper unwinding)
    for (let i = middlewares.length - 1; i >= 0; i--) {
        result = middlewares[i][1](result, config);
    }

    return result;
}
