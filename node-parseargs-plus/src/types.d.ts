// Token types matching Node.js parseArgs token output
interface OptionToken {
    kind: 'option';
    name: string;
    rawName: string;
    index: number;
    value: string | undefined;
    inlineValue: boolean;
}

interface PositionalToken {
    kind: 'positional';
    index: number;
    value: string;
}

interface OptionTerminatorToken {
    kind: 'option-terminator';
    index: number;
}

type Token = OptionToken | PositionalToken | OptionTerminatorToken;

// Shape of a single option in the config
interface OptionConfig {
    type: 'string' | 'boolean';
    multiple?: boolean;
    short?: string;
    default?: string | boolean | string[] | boolean[];
}

// Resolve the value type for a single option based on its type and multiple flag
type ResolveOptionType<T extends OptionConfig> =
    T extends { type: 'string'; multiple: true } ? string[] :
    T extends { type: 'boolean'; multiple: true } ? boolean[] :
    T extends { type: 'string' } ? string :
    T extends { type: 'boolean' } ? boolean :
    string | boolean;

// Determine whether an option has a default value (and is therefore always present)
type HasDefault<T> =
    T extends { default: infer D }
        ? (undefined extends D ? false : true)
        : false;

// Flatten intersection types into a single object for better IDE hover display
type Prettify<T> = { [K in keyof T]: T[K] } & {};

// Extract keys of options that have a default (required in output)
type RequiredOptionKeys<O extends Record<string, OptionConfig>> = {
    [K in keyof O & string]: HasDefault<O[K]> extends true ? K : never;
}[keyof O & string];

// Extract keys of options that do NOT have a default (optional in output)
type OptionalOptionKeys<O extends Record<string, OptionConfig>> = {
    [K in keyof O & string]: HasDefault<O[K]> extends true ? never : K;
}[keyof O & string];

// Build the values object type from the options config
type ParsedValues<O extends Record<string, OptionConfig>> = Prettify<
    { [K in RequiredOptionKeys<O>]: ResolveOptionType<O[K]> } &
    { [K in OptionalOptionKeys<O>]?: ResolveOptionType<O[K]> }
>;

// The config accepted by parseArgsPlus
interface ParseArgsPlusConfig {
    options?: Record<string, OptionConfig>;
    allowPositionals?: boolean;
    strict?: boolean;
    args?: string[];
    tokens?: boolean;
}

// Base result shape (no options or unresolvable options)
interface ParseArgsPlusResultBase {
    values: Record<string, string | boolean | string[] | boolean[] | undefined>;
    positionals: string[];
}

interface ParseArgsPlusResultBaseWithTokens extends ParseArgsPlusResultBase {
    tokens: Token[];
}

// Typed result when options are known
interface ParseArgsPlusResultTyped<O extends Record<string, OptionConfig>> {
    values: ParsedValues<O>;
    positionals: string[];
}

interface ParseArgsPlusResultTypedWithTokens<O extends Record<string, OptionConfig>> extends ParseArgsPlusResultTyped<O> {
    tokens: Token[];
}

// Select the correct result type based on config
type ParseArgsPlusResult<T extends ParseArgsPlusConfig> =
    T extends { options: infer O extends Record<string, OptionConfig> }
        ? (T extends { tokens: true }
            ? ParseArgsPlusResultTypedWithTokens<O>
            : ParseArgsPlusResultTyped<O>)
        : (T extends { tokens: true }
            ? ParseArgsPlusResultBaseWithTokens
            : ParseArgsPlusResultBase);

/**
 * Enhanced wrapper around Node.js `util.parseArgs` with strong config-driven typings.
 *
 * Use `as const` or pass a literal config object for full type inference:
 *
 * @example
 * ```ts
 * const { values } = parseArgsPlus({
 *     options: {
 *         name: { type: 'string', default: 'world' },
 *         verbose: { type: 'boolean' },
 *         files: { type: 'string', multiple: true },
 *     },
 * });
 * // values.name    → string          (required – has default)
 * // values.verbose → boolean | undefined (optional – no default)
 * // values.files   → string[] | undefined (optional – no default)
 * ```
 */
export function parseArgsPlus<const T extends ParseArgsPlusConfig>(config: T): ParseArgsPlusResult<T>;
