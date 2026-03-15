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

export type Token = OptionToken | PositionalToken | OptionTerminatorToken;

/** Symbol used for cross-middleware communication of resolved command state. */
export declare const kCommandState: unique symbol;

/** Shape of the command state stashed on the config by the commands middleware. */
export interface CommandState {
    /** Resolved command name, or undefined if no command was matched. */
    commandName: string | undefined;
    /** Args slice after the command positional. */
    commandArgs: string[];
    /** The matched command's config, or undefined if no command matched. */
    commandConfig: CommandConfig | undefined;
}

// Shape of a single option in the config
export interface OptionConfig {
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
 * A middleware is a tuple (array) where:
 *   [0] transformConfig – receives the config and returns a (possibly modified) config
 *   [1] transformResult – receives the result and original config, returns a (possibly modified) result
 *
 * The `OptionExt` and `ConfigExt` type parameters are carried at the type level
 * so that `parseArgsPlus` can merge extensions from all middlewares.
 */
// biome-ignore lint/suspicious/noExplicitAny: type definitions require `any` for generic flexibility
// biome-ignore lint/complexity/noBannedTypes: `{}` is intentional as a default for no extensions
export type Middleware<OptionExt extends Record<string, any> = {}, ConfigExt extends Record<string, any> = {}> = [
    transformConfig: (config: ParseArgsPlusConfig) => ParseArgsPlusConfig,
    transformResult: (
        // biome-ignore lint/suspicious/noExplicitAny: middleware results are dynamically shaped
        result: { values: Record<string, any>; positionals: string[]; tokens?: Token[] },
        config: ParseArgsPlusConfig
        // biome-ignore lint/suspicious/noExplicitAny: middleware results are dynamically shaped
    ) => { values: Record<string, any>; positionals: string[]; tokens?: Token[] },
] & {
    /** @internal marker to carry the option extension at the type level */
    readonly __optionExt?: OptionExt;
    /** @internal marker to carry the config extension at the type level */
    readonly __configExt?: ConfigExt;
    /** Execution priority. Lower values run transformConfig earlier and transformResult later. Default: 0. */
    readonly order?: number;
};

// Extract the option extension type from a single middleware
// biome-ignore lint/complexity/noBannedTypes: `{}` is the correct fallback for no extensions
// biome-ignore lint/suspicious/noExplicitAny: required for conditional type distribution
type ExtractOptionExt<M> = M extends Middleware<infer E, any> ? E : {};

// Extract the config extension type from a single middleware
// biome-ignore lint/complexity/noBannedTypes: `{}` is the correct fallback for no extensions
// biome-ignore lint/suspicious/noExplicitAny: required for conditional type distribution
type ExtractConfigExt<M> = M extends Middleware<any, infer C> ? C : {};

// Merge all option extensions from a tuple of middlewares into a single intersection
// biome-ignore lint/suspicious/noExplicitAny: required for conditional type distribution
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
// biome-ignore lint/suspicious/noExplicitAny: middleware array accepts any extension type
export type MergeMiddlewareOptionExts<M extends readonly Middleware<any, any>[]> = UnionToIntersection<ExtractOptionExt<M[number]>>;
// biome-ignore lint/suspicious/noExplicitAny: middleware array accepts any extension type
export type MergeMiddlewareConfigExts<M extends readonly Middleware<any, any>[]> = UnionToIntersection<ExtractConfigExt<M[number]>>;

// An OptionConfig extended with the extra fields contributed by middlewares
// biome-ignore lint/suspicious/noExplicitAny: extension record is intentionally open-ended
type ExtendedOptionConfig<Ext extends Record<string, any>> = OptionConfig & Ext;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// The config accepted by parseArgsPlus (no middlewares or unresolvable middlewares)
export interface ParseArgsPlusConfig {
    options?: Record<string, OptionConfig>;
    allowPositionals?: boolean;
    allowNegative?: boolean;
    strict?: boolean;
    args?: string[];
    tokens?: boolean;
}

// The config accepted by parseArgsPlus when middlewares extend the option and/or config shape.
// The `ConfigExt` fields are merged into the top-level config via intersection.
// biome-ignore lint/suspicious/noExplicitAny: extension record is intentionally open-ended
export type ParseArgsPlusConfigWithMiddleware<OptionExt extends Record<string, any>, ConfigExt extends Record<string, any>> = {
    options?: Record<string, ExtendedOptionConfig<OptionExt>>;
    allowPositionals?: boolean;
    allowNegative?: boolean;
    strict?: boolean;
    args?: string[];
    tokens?: boolean;
} & ConfigExt;

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

// Base result shape (no options or unresolvable options)
export interface ParseArgsPlusResultBase {
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
export type ParseArgsPlusResult<T extends ParseArgsPlusConfig> = T extends { options: infer O extends Record<string, OptionConfig> }
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
export type ParseArgsPlusResultFromExtended<T extends ParseArgsPlusConfigWithMiddleware<any, any>> = T extends {
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
// Commands middleware
// ---------------------------------------------------------------------------

/** Configuration for a single command. */
export interface CommandConfig {
    /** Human-readable description of the command. */
    description?: string;
    /** Options specific to this command. */
    options?: Record<string, OptionConfig>;
    /** Whether this command accepts positional arguments. Default: false. */
    allowPositionals?: boolean;
}

/** Extension that the commands middleware adds to the top-level config. */
export interface CommandsConfigExtension {
    /** Map of command names to their configurations. */
    commands: Record<string, CommandConfig>;
    /** Command to use when no command is specified or the first positional doesn't match any command. */
    defaultCommand?: string;
}

/** The commands middleware does not extend individual option configs. */
// biome-ignore lint/complexity/noBannedTypes: empty extension is intentional
export type CommandsOptionExtension = {};

// ---------------------------------------------------------------------------
// Help middleware
// ---------------------------------------------------------------------------

/** Extension that help middleware adds to each option. */
export interface HelpOptionExtension {
    /** A human-readable description shown in the help text. */
    description?: string;
}

/** A custom help section that can be added to the help output. */
export interface HelpSection {
    /** Section title displayed as a bright-white header. */
    title: string;
    /** Body text displayed below the title, indented. Can be a single string or an array of strings (one per line). */
    text?: string | string[];
    /** Controls the position of this section relative to others. Lower numbers appear first. */
    order?: number;
}

/** Extension that help middleware adds to the top-level config. */
export interface HelpConfigExtension {
    /** Program name used in the auto-generated usage line (e.g. "my-cli"). */
    name: string;
    /** Program version string (e.g. "1.0.0"). When `--version` is passed, prints the version and exits. */
    version: string;
    /** Optional program description displayed in the help text between the usage line and the options list. */
    description?: string;
    /**
     * Optional custom help sections keyed by section id.
     * Use `"usage"` or `"options"` to override the title/text of the built-in sections.
     * Any other key adds a new section to the help output.
     */
    helpSections?: Record<string, HelpSection>;
}
