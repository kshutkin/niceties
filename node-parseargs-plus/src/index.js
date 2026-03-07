import { parseArgs } from 'node:util';

/**
 * @template {import('./types.d.ts').ParseArgsPlusConfig} T
 * @typedef {import('./types.d.ts').ParseArgsPlusResult<T>} ParseArgsPlusResult
 */

/**
 * Enhanced parseArgs wrapper with additional features.
 * @param {import('./types.d.ts').ParseArgsPlusConfig} config
 * @param {import('./types.d.ts').Middleware<any>[]} [middlewares]
 * @returns {any}
 */
export function parseArgsPlus(config, middlewares = []) {
    // Let middlewares transform the config before calling parseArgs
    let transformedConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig} */ (config);
    for (const mw of middlewares) {
        transformedConfig = mw[0](transformedConfig);
    }

    // Call the native parseArgs
    let result = /** @type {any} */ (parseArgs(transformedConfig));

    // Let middlewares transform the result (reverse order for proper unwinding)
    for (let i = middlewares.length - 1; i >= 0; i--) {
        result = middlewares[i][1](result, config);
    }

    return result;
}

/**
 * Help middleware that adds --help/-h and --version/-v flag support.
 * When --help is passed, it prints usage information (based on option descriptions)
 * and exits with code 0. When --version is passed, it prints the version and exits
 * with code 0. The help and version flags are removed from the returned values.
 * @type {import('./types.d.ts').Middleware<import('./types.d.ts').HelpOptionExtension, import('./types.d.ts').HelpConfigExtension>}
 */
export const helpMiddleware = [
    function transformConfig(config) {
        return {
            ...config,
            options: {
                ...config.options,
                help: { type: 'boolean', short: 'h' },
                version: { type: 'boolean', short: 'v' },
            },
        };
    },
    function transformResult(result, originalConfig) {
        const extConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').HelpConfigExtension} */ (originalConfig);
        if (result.values.version) {
            console.log(extConfig.version);
            process.exit(0);
        }
        if (result.values.help) {
            printHelp(extConfig);
            process.exit(0);
        }
        return result;
    },
];

/**
 * Prints help text based on the original config's options and their descriptions.
 * @param {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').HelpConfigExtension} config
 */
function printHelp(config) {
    const programName = config.name;
    const version = config.version;
    const options = /** @type {Record<string, import('./types.d.ts').OptionConfig & { description?: string }>} */ (config.options) || {};

    if (programName) {
        const versionSuffix = version ? ` v${version}` : '';
        console.log(`Usage: ${programName}${versionSuffix} [options]${config.allowPositionals ? ' [arguments]' : ''}`);
        console.log();
    }

    console.log('Options:');

    /** @type {{ flags: string; description: string }[]} */
    const rows = [];
    let maxFlagsLen = 0;

    // Always include --help and --version in the displayed options
    const allOptions = /** @type {Record<string, any>} */ ({
        ...options,
        help: { type: 'boolean', short: 'h', description: 'Show this help message' },
        version: { type: 'boolean', short: 'v', description: 'Show version number' },
    });

    for (const [name, opt] of Object.entries(allOptions)) {
        const shortPart = opt.short ? `-${opt.short}, ` : '    ';
        const typeSuffix = opt.type === 'string' ? ' <value>' : '';
        const flags = `  ${shortPart}--${name}${typeSuffix}`;
        const description = /** @type {string} */ (/** @type {any} */ (opt).description) || '';
        if (flags.length > maxFlagsLen) {
            maxFlagsLen = flags.length;
        }
        rows.push({ flags, description });
    }

    for (const row of rows) {
        const padding = ' '.repeat(maxFlagsLen - row.flags.length + 2);
        if (row.description) {
            console.log(`${row.flags}${padding}${row.description}`);
        } else {
            console.log(row.flags);
        }
    }
}
