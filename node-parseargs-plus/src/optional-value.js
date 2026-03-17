/**
 * Optional-value middleware that allows string options to be used bare (without a value).
 *
 * When an option is marked with `optionalValue: true`, it can be used as:
 *   --option value   → "value"
 *   --option         → ""  (empty string)
 *   -o value         → "value"
 *   -o               → ""  (empty string)
 *
 * This works by pre-processing the args array before `parseArgs` sees it:
 * - Bare `--option` (long, no `=`) is rewritten to `--option=` (inline empty value)
 * - Bare `-o` (short) is followed by an injected empty string `''`
 *
 * Only applies to options with `type: 'string'` and `optionalValue: true`.
 *
 * Has `transformConfig.order = 7`, so it runs after help (-10), camelCase (5),
 * and customValue (6), but before commands (10). This ensures option keys are
 * already in their final (kebab-case) form, function-typed `type` values have
 * been replaced with `'string'` by customValue (so `optionalValue` can
 * recognise them), and the rewritten args are visible to the commands
 * middleware's discovery parse.
 * Has `transformResult.order = 0` (default), as no result transformation is needed.
 */

/**
 * Collect all option names and their short aliases that have `optionalValue: true`
 * from both global options and command-level options.
 *
 * @param {Record<string, import('./types.d.ts').OptionConfig> | undefined} options
 * @param {Record<string, import('./types.d.ts').CommandConfig> | undefined} commands
 * @returns {{ names: Set<string>; shortToLong: Map<string, string> }}
 */
function collectOptionalValueOptions(options, commands) {
    /** @type {Set<string>} */
    const names = new Set();
    /** @type {Map<string, string>} */
    const shortToLong = new Map();

    /**
     * @param {Record<string, import('./types.d.ts').OptionConfig> | undefined} opts
     */
    function scan(opts) {
        if (!opts) return;
        for (const [name, config] of Object.entries(opts)) {
            if (config.type === 'string' && /** @type {any} */ (config).optionalValue) {
                names.add(name);
                if (config.short) {
                    shortToLong.set(config.short, name);
                }
            }
        }
    }

    scan(options);

    if (commands) {
        for (const cmdConfig of Object.values(commands)) {
            scan(/** @type {import('./types.d.ts').CommandConfig} */ (cmdConfig).options);
        }
    }

    return { names, shortToLong };
}

/**
 * Determine whether the next argument looks like a value (not a flag).
 * An arg is considered a value if it exists and does not start with `-`,
 * OR if it is exactly `-` (a common convention for stdin).
 *
 * @param {string | undefined} next
 * @returns {boolean}
 */
function isValue(next) {
    return next !== undefined && (!next.startsWith('-') || next === '-');
}

/**
 * Pre-process the args array, rewriting bare optional-value options so that
 * `parseArgs` receives them with an explicit empty value.
 *
 * @param {string[]} args
 * @param {Set<string>} names - Long option names with optionalValue
 * @param {Map<string, string>} shortToLong - Short alias → long name mapping
 * @returns {string[]}
 */
function rewriteArgs(args, names, shortToLong) {
    /** @type {string[]} */
    const result = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        // Option terminator: copy everything remaining verbatim
        if (arg === '--') {
            for (let j = i; j < args.length; j++) {
                result.push(args[j]);
            }
            break;
        }

        // Long option: --name (no inline value via =)
        if (arg.startsWith('--') && !arg.includes('=')) {
            const name = arg.slice(2);

            // Skip --no-name negation forms
            if (name.startsWith('no-') && names.has(name.slice(3))) {
                result.push(arg);
                continue;
            }

            if (names.has(name)) {
                const next = args[i + 1];
                if (!isValue(next)) {
                    // Bare --option → --option= (empty inline value)
                    // biome-ignore lint/style/useTemplate: optimization
                    result.push(arg + '=');
                    continue;
                }
            }
        }

        // Short option: -x (exactly 2 chars, not --)
        if (arg.length === 2 && arg[0] === '-' && arg[1] !== '-') {
            const shortChar = arg[1];
            if (shortToLong.has(shortChar)) {
                const next = args[i + 1];
                if (!isValue(next)) {
                    // Bare -o → -o '' (inject empty string value)
                    result.push(arg);
                    result.push('');
                    continue;
                }
            }
        }

        result.push(arg);
    }

    return result;
}

/** @param {import('./types.d.ts').ParseArgsPlusConfig} config */
function optionalValueTransformConfig(config) {
    const options = config.options;
    const commands = /** @type {any} */ (config).commands;

    const { names, shortToLong } = collectOptionalValueOptions(options, commands);

    // Nothing to rewrite if no options have optionalValue
    if (names.size === 0) {
        return config;
    }

    const args = config.args ?? process.argv.slice(2);
    const rewritten = rewriteArgs(args, names, shortToLong);

    return {
        ...config,
        args: rewritten,
    };
}
optionalValueTransformConfig.order = 7;

/**
 * @param {{ values: Record<string, any>; positionals: string[]; tokens?: import('./types.d.ts').Token[] }} result
 * @param {import('./types.d.ts').ParseArgsPlusConfig} _config
 */
function optionalValueTransformResult(result, _config) {
    return result;
}

export const optionalValue = /** @type {any} */ ([optionalValueTransformConfig, optionalValueTransformResult]);
