// Token types matching Node.js parseArgs token output
interface OptionToken {
    kind: 'option';
    name: string;
    rawName: string;
    index: number;
    value: string | undefined;
    inlineValue: boolean | undefined;
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
type ResolveOptionType<T extends OptionConfig> = T extends { type: 'string'; multiple: true }
    ? string[]
    : T extends { type: 'boolean'; multiple: true }
      ? boolean[]
      : T extends { type: 'string' }
        ? string
        : T extends { type: 'boolean' }
          ? boolean
          : string | boolean;

// Determine whether an option has a default value (and is therefore always present)
type HasDefault<T> = T extends { default: infer D } ? (undefined extends D ? false : true) : false;

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
    { [K in RequiredOptionKeys<O>]: ResolveOptionType<O[K]> } & { [K in OptionalOptionKeys<O>]?: ResolveOptionType<O[K]> }
>;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * A middleware can extend the option config shape (via `OptionExt`),
 * transform the config before `parseArgs` is called, and transform
 * the result afterwards.
 */
// biome-ignore lint/suspicious/noExplicitAny: type definitions require `any` for generic flexibility
// biome-ignore lint/complexity/noBannedTypes: `{}` is intentional as a default for no extensions
interface Middleware<OptionExt extends Record<string, any> = {}> {
    transformConfig(config: ParseArgsPlusConfig): ParseArgsPlusConfig;
    transformResult(
        // biome-ignore lint/suspicious/noExplicitAny: middleware results are dynamically shaped
        result: { values: Record<string, any>; positionals: string[]; tokens?: Token[] },
        config: ParseArgsPlusConfig
        // biome-ignore lint/suspicious/noExplicitAny: middleware results are dynamically shaped
    ): { values: Record<string, any>; positionals: string[]; tokens?: Token[] };
    /** @internal marker to carry the option extension at the type level */
    readonly __optionExt?: OptionExt;
}

// Extract the option extension type from a single middleware
// biome-ignore lint/complexity/noBannedTypes: `{}` is the correct fallback for no extensions
type ExtractOptionExt<M> = M extends Middleware<infer E> ? E : {};

// Merge all option extensions from a tuple of middlewares into a single intersection
// biome-ignore lint/suspicious/noExplicitAny: required for conditional type distribution
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
// biome-ignore lint/suspicious/noExplicitAny: middleware array accepts any extension type
type MergeMiddlewareOptionExts<M extends readonly Middleware<any>[]> = UnionToIntersection<ExtractOptionExt<M[number]>>;

// An OptionConfig extended with the extra fields contributed by middlewares
// biome-ignore lint/suspicious/noExplicitAny: extension record is intentionally open-ended
type ExtendedOptionConfig<Ext extends Record<string, any>> = OptionConfig & Ext;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// The config accepted by parseArgsPlus (no middlewares or unresolvable middlewares)
interface ParseArgsPlusConfig {
    options?: Record<string, OptionConfig>;
    allowPositionals?: boolean;
    allowNegative?: boolean;
    strict?: boolean;
    args?: string[];
    tokens?: boolean;
}

// The config accepted by parseArgsPlus when middlewares extend the option shape
// biome-ignore lint/suspicious/noExplicitAny: extension record is intentionally open-ended
interface ParseArgsPlusConfigWithMiddleware<Ext extends Record<string, any>> {
    options?: Record<string, ExtendedOptionConfig<Ext>>;
    allowPositionals?: boolean;
    allowNegative?: boolean;
    strict?: boolean;
    args?: string[];
    tokens?: boolean;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

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
type ParseArgsPlusResult<T extends ParseArgsPlusConfig> = T extends { options: infer O extends Record<string, OptionConfig> }
    ? T extends { tokens: true }
        ? ParseArgsPlusResultTypedWithTokens<O>
        : ParseArgsPlusResultTyped<O>
    : T extends { tokens: true }
      ? ParseArgsPlusResultBaseWithTokens
      : ParseArgsPlusResultBase;

// Same as above but strips the middleware extension keys from OptionConfig before resolving values,
// so that extra fields like `description` don't break the OptionConfig constraint.
// biome-ignore lint/suspicious/noExplicitAny: accepts any option extension shape
type StripExtFromOptions<O extends Record<string, any>> = {
    [K in keyof O]: Pick<O[K], keyof OptionConfig> extends infer P extends OptionConfig ? P : OptionConfig;
};

// biome-ignore lint/suspicious/noExplicitAny: accepts any middleware config shape
type ParseArgsPlusResultFromExtended<T extends ParseArgsPlusConfigWithMiddleware<any>> = T extends {
    // biome-ignore lint/suspicious/noExplicitAny: inferred options are open-ended
    options: infer O extends Record<string, any>;
}
    ? T extends { tokens: true }
        ? ParseArgsPlusResultTypedWithTokens<StripExtFromOptions<O>>
        : ParseArgsPlusResultTyped<StripExtFromOptions<O>>
    : T extends { tokens: true }
      ? ParseArgsPlusResultBaseWithTokens
      : ParseArgsPlusResultBase;

// ---------------------------------------------------------------------------
// Help middleware
// ---------------------------------------------------------------------------

/** Extension that help middleware adds to each option. */
interface HelpOptionExtension {
    /** A human-readable description shown in the help text. */
    description?: string;
}

/** Configuration for the help middleware itself. */
interface HelpMiddlewareConfig {
    /** Custom header printed before the options list. Overrides the auto-generated usage line. */
    header?: string;
    /** Custom footer printed after the options list. */
    footer?: string;
    /** Program name used in the auto-generated usage line (e.g. "my-cli"). */
    name?: string;
}

/**
 * Creates a help middleware.
 *
 * When `--help` (or `-h`) is passed, the middleware prints usage information
 * derived from option `description` fields, then calls `process.exit(0)`.
 * The `help` flag is removed from the returned `values`.
 */
export function helpMiddleware(config?: HelpMiddlewareConfig): Middleware<HelpOptionExtension>;

// ---------------------------------------------------------------------------
// parseArgsPlus
// ---------------------------------------------------------------------------

/**
 * Enhanced wrapper around Node.js `util.parseArgs` with strong config-driven
 * typings and middleware support.
 *
 * @example
 * ```ts
 * import { parseArgsPlus, helpMiddleware } from '@niceties/node-parseargs-plus';
 *
 * const { values } = parseArgsPlus({
 *     options: {
 *         name: { type: 'string', default: 'world', description: 'Your name' },
 *         verbose: { type: 'boolean', description: 'Enable verbose output' },
 *     },
 * }, [helpMiddleware({ name: 'my-cli' })]);
 *
 * // values.name    → string          (required – has default)
 * // values.verbose → boolean | undefined (optional – no default)
 * ```
 */
export function parseArgsPlus<const T extends ParseArgsPlusConfig>(config: T): ParseArgsPlusResult<T>;
export function parseArgsPlus<
    // biome-ignore lint/suspicious/noExplicitAny: middleware array accepts any extension type
    const M extends Middleware<any>[],
    const T extends ParseArgsPlusConfigWithMiddleware<MergeMiddlewareOptionExts<M>>,
>(config: T, middlewares: M): ParseArgsPlusResultFromExtended<T>;
