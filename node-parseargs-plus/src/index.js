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
        transformedConfig = mw.transformConfig(transformedConfig);
    }

    // Call the native parseArgs
    let result = /** @type {any} */ (parseArgs(transformedConfig));

    // Let middlewares transform the result (reverse order for proper unwinding)
    for (let i = middlewares.length - 1; i >= 0; i--) {
        result = middlewares[i].transformResult(result, config);
    }

    return result;
}

/**
 * Creates a help middleware that adds --help/-h flag support.
 * When --help is passed, it prints usage information (based on option descriptions)
 * and exits with code 0. The help flag is removed from the returned values.
 * @param {import('./types.d.ts').HelpMiddlewareConfig} [helpConfig]
 * @returns {import('./types.d.ts').Middleware<import('./types.d.ts').HelpOptionExtension>}
 */
export function helpMiddleware(helpConfig) {
    const header = helpConfig?.header;
    const footer = helpConfig?.footer;
    const programName = helpConfig?.name;

    return {
        transformConfig(config) {
            return {
                ...config,
                options: {
                    ...config.options,
                    help: { type: 'boolean', short: 'h' },
                },
            };
        },
        transformResult(result, originalConfig) {
            if (result.values.help) {
                printHelp(originalConfig, programName, header, footer);
                process.exit(0);
            }
            // Remove help from values
            const { help: _help, ...restValues } = /** @type {Record<string, any>} */ (result.values);
            return { ...result, values: restValues };
        },
    };
}

/**
 * Prints help text based on the original config's options and their descriptions.
 * @param {import('./types.d.ts').ParseArgsPlusConfig} config
 * @param {string | undefined} programName
 * @param {string | undefined} header
 * @param {string | undefined} footer
 */
function printHelp(config, programName, header, footer) {
    const options = /** @type {Record<string, import('./types.d.ts').OptionConfig & { description?: string }>} */ (config.options) || {};

    if (header) {
        console.log(header);
        console.log();
    } else if (programName) {
        console.log(`Usage: ${programName} [options]${config.allowPositionals ? ' [arguments]' : ''}`);
        console.log();
    }

    console.log('Options:');

    /** @type {{ flags: string; description: string }[]} */
    const rows = [];
    let maxFlagsLen = 0;

    // Always include --help in the displayed options
    const allOptions = { ...options, help: /** @type {any} */ ({ type: 'boolean', short: 'h', description: 'Show this help message' }) };

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

    if (footer) {
        console.log();
        console.log(footer);
    }
}
