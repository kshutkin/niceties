/**
 * Custom-value middleware that allows option `type` to be a function (constructor).
 *
 * When an option's `type` is set to a function (e.g. `Number`, `JSON.parse`,
 * or any `(value: string) => T`), the middleware:
 * 1. Replaces `type` with `'string'` so `parseArgs` accepts it
 * 2. After parsing, calls the function with the parsed value to produce the
 *    final transformed value
 *
 * For single-value options the function receives a `string`.
 * For `multiple: true` options the function receives the whole `string[]`
 * array, giving the factory full control over the result shape.
 *
 * Examples:
 *   `{ type: Number }`                                   → `--port 8080`              → `8080` (number)
 *   `{ type: JSON.parse }`                               → `--data '{"a":1}'`         → `{ a: 1 }` (object)
 *   `{ type: v => v.split(',') }`                        → `--tags a,b,c`             → `['a','b','c']` (array)
 *   `{ type: vs => vs.map(Number), multiple: true }`     → `--port 80 --port 443`     → `[80, 443]` (number[])
 *
 * Works with `default` — default string values ARE transformed, since `parseArgs`
 * places them in `values` indistinguishably from CLI-provided values. If you need
 * an already-typed default, set `default` to the final value and handle the type
 * mismatch externally.
 *
 * Has `transformConfig.order = 6`, so it runs after help (-10) and camelCase (5),
 * but before optionalValue (7) and commands (10). This ensures option keys
 * are already in their final (kebab-case) form, that optionalValue sees
 * `type: 'string'` (not a function) when checking for optional-value options,
 * and that the commands middleware sees normal `type: 'string'` options.
 *
 * Has `transformResult.order = 12`, so it runs after commands (10) which
 * merges command-level values, but before camelCase (15) which renames keys
 * back to camelCase. This means the transform map uses kebab-case keys
 * (matching the values at this stage).
 */

/**
 * Symbol used to stash the transform function map on the config object
 * for cross-phase communication.
 */
const kCustomValueMap = Symbol.for('parseArgsPlus.customValueMap');

/**
 * Scan an options record, extract function-typed `type` entries, replace them
 * with `'string'`, and collect the transform functions into the map.
 *
 * @param {Record<string, import('./types.d.ts').OptionConfig> | undefined} options
 * @param {Map<string, Function>} map
 * @returns {Record<string, import('./types.d.ts').OptionConfig> | undefined}
 */
function convertOptions(options, map) {
    if (!options) return options;
    /** @type {Record<string, import('./types.d.ts').OptionConfig>} */
    const converted = {};
    let changed = false;
    for (const [key, value] of Object.entries(options)) {
        if (typeof value.type === 'function') {
            map.set(key, value.type);
            converted[key] = { ...value, type: 'string' };
            changed = true;
        } else {
            converted[key] = value;
        }
    }
    return changed ? converted : options;
}

/**
 * Transform config: scan options for function-typed `type`, replace with
 * `'string'`, and stash the mapping for the result transform phase.
 *
 * Also handles command-level options when the commands middleware is active.
 *
 * @param {import('./types.d.ts').ParseArgsPlusConfig} config
 * @returns {import('./types.d.ts').ParseArgsPlusConfig}
 */
function customValueTransformConfig(config) {
    /** @type {Map<string, Function>} */
    const map = new Map();

    const newOptions = convertOptions(config.options, map);

    // Convert command-level options when commands middleware is active
    const commands = /** @type {any} */ (config).commands;
    /** @type {Record<string, any> | undefined} */
    let newCommands;
    if (commands) {
        let commandsChanged = false;
        /** @type {Record<string, any>} */
        const convertedCommands = {};
        for (const [cmdName, cmdConfig] of Object.entries(commands)) {
            const cmd = /** @type {import('./types.d.ts').CommandConfig} */ (cmdConfig);
            const convertedOpts = convertOptions(cmd.options, map);
            if (convertedOpts !== cmd.options) {
                convertedCommands[cmdName] = { ...cmd, options: convertedOpts };
                commandsChanged = true;
            } else {
                convertedCommands[cmdName] = cmd;
            }
        }
        if (commandsChanged) {
            newCommands = convertedCommands;
        }
    }

    // Nothing to transform
    if (map.size === 0) {
        return config;
    }

    // Stash the map on the config for the result transform phase
    /** @type {any} */ (config)[kCustomValueMap] = map;

    const newConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig} */ ({
        ...config,
        options: newOptions,
    });

    if (newCommands) {
        /** @type {any} */ (newConfig).commands = newCommands;
    }

    return newConfig;
}
customValueTransformConfig.order = 6;

/**
 * Transform result: apply the stashed transform functions to parsed values.
 *
 * For single-value options the function receives the string value.
 * For `multiple: true` options the function receives the whole `string[]`
 * array so the factory has full control over the output shape.
 * Only transforms values that are strings/string-arrays (skips undefined /
 * already-typed non-string values).
 *
 * @param {{ values: Record<string, any>; positionals: string[]; tokens?: import('./types.d.ts').Token[] }} result
 * @param {import('./types.d.ts').ParseArgsPlusConfig} config
 * @returns {{ values: Record<string, any>; positionals: string[]; tokens?: import('./types.d.ts').Token[] }}
 */
function customValueTransformResult(result, config) {
    /** @type {Map<string, Function> | undefined} */
    const map = /** @type {any} */ (config)[kCustomValueMap];

    if (!map || map.size === 0) {
        return result;
    }

    /** @type {Record<string, any>} */
    const newValues = {};
    let changed = false;

    for (const [key, value] of Object.entries(result.values)) {
        const fn = map.get(key);
        if (fn && value !== undefined) {
            if (Array.isArray(value)) {
                // multiple: true — pass the whole array to the factory
                newValues[key] = fn(value);
            } else if (typeof value === 'string') {
                newValues[key] = fn(value);
            } else {
                // Already transformed or non-string (e.g. boolean default) — pass through
                newValues[key] = value;
            }
            changed = true;
        } else {
            newValues[key] = value;
        }
    }

    if (!changed) {
        return result;
    }

    return {
        ...result,
        values: newValues,
    };
}
customValueTransformResult.order = 12;

export const customValue = /** @type {any} */ ([customValueTransformConfig, customValueTransformResult]);
