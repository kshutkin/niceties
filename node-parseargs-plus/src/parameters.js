/**
 * Parameters middleware that adds typed positional parameter support.
 *
 * The middleware parses positional arguments according to parameter definitions
 * like `<name>` (required), `[name]` (optional), `<names...>` (required spread),
 * and `[names...]` (optional spread).
 *
 * Has `configOrder: 0` (default), so `transformConfig` runs at normal priority.
 * Has `resultOrder: 15`, so `transformResult` runs after commands (10)
 * but before help (20).
 */

const kCommandState = Symbol.for('parseArgsPlus.commandState');

const paramRegex = /^([<[])([a-zA-Z][a-zA-Z0-9 -]*?)(\.\.\.)?([>\]])$/;

/**
 * Parse a parameter definition string into its parts.
 * @param {string} param
 * @returns {{ name: string; camelName: string; required: boolean; spread: boolean }}
 */
function parseParam(param) {
    const match = paramRegex.exec(param);
    if (!match) {
        throw new Error(`Invalid parameter definition: '${param}'. Expected <name>, [name], <name...>, or [name...].`);
    }
    const [, bracket, rawName, dots, closeBracket] = match;
    const required = bracket === '<';
    // Validate matching brackets
    if ((required && closeBracket !== '>') || (!required && closeBracket !== ']')) {
        throw new Error(`Mismatched brackets in parameter definition: '${param}'.`);
    }
    const spread = dots === '...';
    const camelName = toCamelCase(rawName);
    return { name: rawName, camelName, required, spread };
}

/**
 * Convert a name with spaces or hyphens to camelCase.
 * @param {string} name
 * @returns {string}
 */
function toCamelCase(name) {
    return name
        .split(/[ -]+/)
        .map((part, i) => {
            const lower = part.toLowerCase();
            if (i === 0) return lower;
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join('');
}

/**
 * Validate parameter definitions at runtime.
 * @param {{ name: string; camelName: string; required: boolean; spread: boolean }[]} defs
 */
function validateDefs(defs) {
    let seenOptional = false;
    let spreadCount = 0;

    for (let i = 0; i < defs.length; i++) {
        const def = defs[i];
        if (def.spread) {
            spreadCount++;
            if (spreadCount > 1) {
                throw new Error('At most one spread parameter is allowed.');
            }
            if (i !== defs.length - 1) {
                throw new Error('Spread parameter must be the last parameter.');
            }
        }
        if (def.required && seenOptional) {
            throw new Error(`Required parameter '<${def.name}>' cannot appear after an optional parameter.`);
        }
        if (!def.required) {
            seenOptional = true;
        }
    }
}

/**
 * Extract named parameters from positionals according to parameter definitions.
 * @param {string[]} positionals
 * @param {{ name: string; camelName: string; required: boolean; spread: boolean }[]} defs
 * @returns {Record<string, string | string[] | undefined>}
 */
function extractParameters(positionals, defs) {
    /** @type {Record<string, string | string[] | undefined>} */
    const parameters = {};
    let positionalIndex = 0;

    for (const def of defs) {
        if (def.spread) {
            // Spread parameter: consume all remaining positionals
            const remaining = positionals.slice(positionalIndex);
            if (def.required && remaining.length === 0) {
                throw new Error(`Missing required parameter '<${def.name}...>'.`);
            }
            parameters[def.camelName] = def.required ? remaining : remaining.length > 0 ? remaining : undefined;
            positionalIndex = positionals.length;
        } else {
            // Single parameter
            const value = positionals[positionalIndex];
            if (def.required && value === undefined) {
                throw new Error(`Missing required parameter '<${def.name}>'.`);
            }
            parameters[def.camelName] = value;
            if (value !== undefined) {
                positionalIndex++;
            }
        }
    }

    return parameters;
}

/** @param {import('./types.d.ts').ParseArgsPlusConfig} config */
function parametersTransformConfig(config) {
    const extConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').ParametersConfigExtension} */ (config);
    if (!extConfig.parameters || extConfig.parameters.length === 0) {
        return config;
    }

    // When commands middleware is active, don't modify allowPositionals here —
    // the commands middleware handles that in its own pass-2 parsing.
    if (/** @type {any} */ (config).commands) {
        return config;
    }

    // Validate parameter definitions at runtime
    const defs = extConfig.parameters.map(parseParam);
    validateDefs(defs);

    // Enable positionals so parseArgs collects them
    return {
        ...config,
        allowPositionals: true,
    };
}

/**
 * @param {{ values: Record<string, any>; positionals: string[]; tokens?: import('./types.d.ts').Token[] }} result
 * @param {import('./types.d.ts').ParseArgsPlusConfig} config
 */
function parametersTransformResult(result, config) {
    // Skip parameter extraction when help or version flags are set —
    // the help middleware (order 20) will handle them and exit.
    if (result.values.help || result.values.version) {
        return result;
    }

    const commandState = /** @type {any} */ (config)[kCommandState];

    /** @type {readonly string[] | undefined} */
    let parametersDef;

    if (commandState?.commandName && commandState.commandConfig) {
        // Commands middleware is active and a command was resolved.
        // Use the command's parameters definition if it has one.
        parametersDef = commandState.commandConfig.parameters;
    } else {
        // No commands middleware or no command resolved — use top-level parameters.
        const extConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').ParametersConfigExtension} */ (
            config
        );
        parametersDef = extConfig.parameters;
    }

    if (!parametersDef || parametersDef.length === 0) {
        return result;
    }

    const defs = parametersDef.map(parseParam);
    validateDefs(defs);
    const parameters = extractParameters(result.positionals, defs);

    return {
        ...result,
        parameters,
    };
}
parametersTransformResult.order = 15;

export const parameters = /** @type {any} */ ([parametersTransformConfig, parametersTransformResult]);
