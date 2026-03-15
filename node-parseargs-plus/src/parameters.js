/**
 * Parameters middleware that adds typed positional parameter support.
 *
 * The middleware parses positional arguments according to parameter definitions
 * like `<name>` (required), `[name]` (optional), `<names...>` (required spread),
 * and `[names...]` (optional spread).
 *
 * Has `configOrder: 0` (default), so `transformConfig` runs at normal priority.
 * Has `resultOrder: 5`, so `transformResult` runs after default middlewares
 * but before commands (10) and help (20).
 */

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

/** @param {import('./types.d.ts').ParseArgsPlusConfig} config */
function parametersTransformConfig(config) {
    const extConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').ParametersConfigExtension} */ (config);
    if (!extConfig.parameters || extConfig.parameters.length === 0) {
        return config;
    }

    // Validate parameter definitions at runtime
    const defs = extConfig.parameters.map(parseParam);
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
    const extConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').ParametersConfigExtension} */ (config);
    if (!extConfig.parameters || extConfig.parameters.length === 0) {
        return result;
    }

    const defs = extConfig.parameters.map(parseParam);
    const positionals = result.positionals;
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

    return {
        ...result,
        parameters,
    };
}
parametersTransformResult.order = 5;

export const parameters = /** @type {any} */ ([parametersTransformConfig, parametersTransformResult]);
