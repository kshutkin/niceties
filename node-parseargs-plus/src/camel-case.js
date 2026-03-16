/**
 * CamelCase middleware that bridges camelCase JS option keys and kebab-case CLI flags.
 *
 * Users define options with camelCase keys (e.g. `saveDev`, `outputDir`).
 * The middleware converts them to kebab-case for `parseArgs` (e.g. `--save-dev`,
 * `--output-dir`), and converts the result values back to camelCase.
 *
 * Has `transformConfig.order = 5`, so it runs after help (-10) but before
 * commands (10).
 * Has `transformResult.order = 15`, so it runs after commands (10) but before
 * help (20).
 */

/**
 * Convert a camelCase string to kebab-case.
 * Handles consecutive uppercase (acronyms) correctly:
 *   saveDev       → save-dev
 *   outputDir     → output-dir
 *   enableSSR     → enable-ssr
 *   useHTTPSProxy → use-https-proxy
 *   verbose       → verbose  (no change)
 *
 * @param {string} str
 * @returns {string}
 */
function toKebabCase(str) {
    return str
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();
}

/**
 * Convert a kebab-case string to camelCase.
 *   save-dev   → saveDev
 *   output-dir → outputDir
 *   verbose    → verbose  (no change)
 *
 * @param {string} str
 * @returns {string}
 */
function toCamelCase(str) {
    return str.replace(/-([a-z])/g, (/** @type {string} */ _, /** @type {string} */ c) => c.toUpperCase());
}

/**
 * Convert all keys of an options record from camelCase to kebab-case.
 *
 * @param {Record<string, import('./types.d.ts').OptionConfig> | undefined} options
 * @returns {Record<string, import('./types.d.ts').OptionConfig> | undefined}
 */
function convertOptionsKeys(options) {
    if (!options) return options;
    /** @type {Record<string, import('./types.d.ts').OptionConfig>} */
    const converted = {};
    for (const [key, value] of Object.entries(options)) {
        converted[toKebabCase(key)] = value;
    }
    return converted;
}

/**
 * Transform config: convert option keys from camelCase to kebab-case
 * so that `parseArgs` produces proper `--kebab-case` CLI flags.
 *
 * Also converts command-level option keys when the commands middleware is used.
 *
 * @param {import('./types.d.ts').ParseArgsPlusConfig} config
 * @returns {import('./types.d.ts').ParseArgsPlusConfig}
 */
function camelCaseTransformConfig(config) {
    const newConfig = {
        ...config,
        options: convertOptionsKeys(config.options),
    };

    // Convert command-level option keys when commands middleware is active
    const commands = /** @type {any} */ (config).commands;
    if (commands) {
        /** @type {Record<string, any>} */
        const newCommands = {};
        for (const [cmdName, cmdConfig] of Object.entries(commands)) {
            const cmd = /** @type {import('./types.d.ts').CommandConfig} */ (cmdConfig);
            newCommands[cmdName] = {
                ...cmd,
                options: convertOptionsKeys(cmd.options),
            };
        }
        /** @type {any} */ (newConfig).commands = newCommands;
    }

    return newConfig;
}
camelCaseTransformConfig.order = 5;

/**
 * Transform result: convert value keys from kebab-case back to camelCase.
 *
 * @param {{ values: Record<string, any>; positionals: string[]; tokens?: import('./types.d.ts').Token[] }} result
 * @param {import('./types.d.ts').ParseArgsPlusConfig} _config
 * @returns {{ values: Record<string, any>; positionals: string[]; tokens?: import('./types.d.ts').Token[] }}
 */
function camelCaseTransformResult(result, _config) {
    /** @type {Record<string, any>} */
    const newValues = {};
    for (const [key, value] of Object.entries(result.values)) {
        newValues[toCamelCase(key)] = value;
    }
    return {
        ...result,
        values: newValues,
    };
}
camelCaseTransformResult.order = 15;

export const camelCase = /** @type {any} */ ([camelCaseTransformConfig, camelCaseTransformResult]);
