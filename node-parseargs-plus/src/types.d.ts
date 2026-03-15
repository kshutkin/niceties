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

// Merge two option config records, producing a ParsedValues that combines both.
// Keys in B override keys in A when they overlap.
type MergedParsedValues<A extends Record<string, OptionConfig>, B extends Record<string, OptionConfig>> = ParsedValues<
    Omit<A, keyof B> & B
>;

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
 * A transform function that can optionally carry an `order` property
 * to control its execution priority. Lower values run earlier. Default: 0.
 */
export interface TransformConfigFn {
    (config: ParseArgsPlusConfig): ParseArgsPlusConfig;
    /** Execution priority. Lower values run earlier. Default: 0. */
    readonly order?: number;
}

/**
 * A transform function that can optionally carry an `order` property
 * to control its execution priority. Lower values run earlier. Default: 0.
 */
export interface TransformResultFn {
    (
        // biome-ignore lint/suspicious/noExplicitAny: middleware results are dynamically shaped
        result: { values: Record<string, any>; positionals: string[]; tokens?: Token[] },
        config: ParseArgsPlusConfig
        // biome-ignore lint/suspicious/noExplicitAny: middleware results are dynamically shaped
    ): { values: Record<string, any>; positionals: string[]; tokens?: Token[] };
    /** Execution priority. Lower values run earlier. Default: 0. */
    readonly order?: number;
}

/**
 * A middleware is a tuple (array) where:
 *   [0] transformConfig – receives the config and returns a (possibly modified) config
 *   [1] transformResult – receives the result and original config, returns a (possibly modified) result
 *
 * Execution order can be controlled in two ways:
 *   - Per-function: assign an `order` property directly on a transform function.
 *   - Per-middleware: set `configOrder` / `resultOrder` on the tuple object.
 *
 * When both are present, the function-level `order` takes precedence.
 *
 * The `OptionExt`, `ConfigExt`, and `ResultExt` type parameters are carried at the type level
 * so that `parseArgsPlus` can merge extensions from all middlewares.
 *
 * `ResultExt` allows a middleware to declare additional fields or transformations
 * on the result type (e.g. adding a `command` discriminant).
 */
export type Middleware<
    // biome-ignore lint/suspicious/noExplicitAny: type definitions require `any` for generic flexibility
    // biome-ignore lint/complexity/noBannedTypes: `{}` is intentional as a default for no extensions
    OptionExt extends Record<string, any> = {},
    // biome-ignore lint/suspicious/noExplicitAny: type definitions require `any` for generic flexibility
    // biome-ignore lint/complexity/noBannedTypes: `{}` is intentional as a default for no extensions
    ConfigExt extends Record<string, any> = {},
    // biome-ignore lint/suspicious/noExplicitAny: type definitions require `any` for generic flexibility
    // biome-ignore lint/complexity/noBannedTypes: `{}` is intentional as a default for no extensions
    ResultExt extends Record<string, any> = {},
> = [transformConfig: TransformConfigFn, transformResult: TransformResultFn] & {
    /** @internal marker to carry the option extension at the type level */
    readonly __optionExt?: OptionExt;
    /** @internal marker to carry the config extension at the type level */
    readonly __configExt?: ConfigExt;
    /** @internal marker to carry the result extension at the type level */
    readonly __resultExt?: ResultExt;
    /** Execution priority for transformConfig. Lower values run earlier. Default: 0. Overridden by transformConfig.order if set. */
    readonly configOrder?: number;
    /** Execution priority for transformResult. Lower values run earlier. Default: 0. Overridden by transformResult.order if set. */
    readonly resultOrder?: number;
};

// Extract the option extension type from a single middleware
// biome-ignore lint/complexity/noBannedTypes: `{}` is the correct fallback for no extensions
// biome-ignore lint/suspicious/noExplicitAny: required for conditional type distribution
type ExtractOptionExt<M> = M extends Middleware<infer E, any, any> ? E : {};

// Extract the config extension type from a single middleware
// biome-ignore lint/complexity/noBannedTypes: `{}` is the correct fallback for no extensions
// biome-ignore lint/suspicious/noExplicitAny: required for conditional type distribution
type ExtractConfigExt<M> = M extends Middleware<any, infer C, any> ? C : {};

// Extract the result extension type from a single middleware
// biome-ignore lint/complexity/noBannedTypes: `{}` is the correct fallback for no extensions
// biome-ignore lint/suspicious/noExplicitAny: required for conditional type distribution
type ExtractResultExt<M> = M extends Middleware<any, any, infer R> ? R : {};

// Merge all option extensions from a tuple of middlewares into a single intersection
// biome-ignore lint/suspicious/noExplicitAny: required for conditional type distribution
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
// biome-ignore lint/suspicious/noExplicitAny: middleware array accepts any extension type
export type MergeMiddlewareOptionExts<M extends readonly Middleware<any, any, any>[]> =
    // biome-ignore lint/suspicious/noExplicitAny: fallback constraint must be open-ended
    // biome-ignore lint/complexity/noBannedTypes: empty object is the correct fallback for no extensions
    UnionToIntersection<ExtractOptionExt<M[number]>> extends infer R extends Record<string, any> ? R : {};
// biome-ignore lint/suspicious/noExplicitAny: middleware array accepts any extension type
export type MergeMiddlewareConfigExts<M extends readonly Middleware<any, any, any>[]> =
    // biome-ignore lint/suspicious/noExplicitAny: fallback constraint must be open-ended
    // biome-ignore lint/complexity/noBannedTypes: empty object is the correct fallback for no extensions
    UnionToIntersection<ExtractConfigExt<M[number]>> extends infer R extends Record<string, any> ? R : {};
// biome-ignore lint/suspicious/noExplicitAny: middleware array accepts any extension type
export type MergeMiddlewareResultExts<M extends readonly Middleware<any, any, any>[]> =
    // biome-ignore lint/suspicious/noExplicitAny: fallback constraint must be open-ended
    // biome-ignore lint/complexity/noBannedTypes: empty object is the correct fallback for no extensions
    UnionToIntersection<ExtractResultExt<M[number]>> extends infer R extends Record<string, any> ? R : {};

// An OptionConfig extended with the extra fields contributed by middlewares
// biome-ignore lint/suspicious/noExplicitAny: extension record is intentionally open-ended
type ExtendedOptionConfig<Ext extends Record<string, any>> = OptionConfig & Ext;

// ---------------------------------------------------------------------------
// Result extension application
// ---------------------------------------------------------------------------

/**
 * Marker interface for result extensions that add extra options to values.
 * Middlewares use this to declare additional option configs injected into the result.
 */
export interface ResultExtraValues {
    /** Extra option configs to merge into the result values. */
    extraValues: Record<string, OptionConfig>;
}

/**
 * Marker interface for result extensions that produce a discriminated command union.
 * The commands middleware uses this so `parseArgsPlus` can build a per-command
 * discriminated union result type.
 */
export interface ResultCommandDiscriminant {
    /** Marker that triggers discriminated union generation from the config's `commands`. */
    commandDiscriminant: true;
}

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

// Helper: merge extra values from ResultExt into an options record
// biome-ignore lint/suspicious/noExplicitAny: extension record is intentionally open-ended
type MergeExtraValues<O extends Record<string, OptionConfig>, RE extends Record<string, any>> = RE extends ResultExtraValues
    ? O & RE['extraValues']
    : O;

// ---------------------------------------------------------------------------
// Command option type validation
// ---------------------------------------------------------------------------

// For a single command, check that every option key overlapping with global
// options has a matching `type` field. Produces the original CommandConfig
// when valid, or a branded error type for conflicting keys.
type ValidateCommandOptions<GlobalOpts extends Record<string, OptionConfig>, CmdOpts extends Record<string, OptionConfig>> = {
    [K in keyof CmdOpts]: K extends keyof GlobalOpts
        ? CmdOpts[K]['type'] extends GlobalOpts[K & string]['type']
            ? GlobalOpts[K & string]['type'] extends CmdOpts[K]['type']
                ? CmdOpts[K]
                : OptionConfig & {
                      type: GlobalOpts[K & string]['type'];
                      '@@error': `Option type must match global option type '${GlobalOpts[K & string]['type']}'`;
                  }
            : OptionConfig & {
                  type: GlobalOpts[K & string]['type'];
                  '@@error': `Option type must match global option type '${GlobalOpts[K & string]['type']}'`;
              }
        : CmdOpts[K];
};

// Validate all commands in a commands map against global options.
// Each command's options are checked for type compatibility with overlapping global options.
type ValidateCommands<GlobalOpts extends Record<string, OptionConfig>, Commands extends Record<string, CommandConfig>> = {
    [CmdName in keyof Commands]: Commands[CmdName] extends { options: infer CO extends Record<string, OptionConfig> }
        ? Omit<Commands[CmdName], 'options'> & { options: ValidateCommandOptions<GlobalOpts, CO> }
        : Commands[CmdName];
};

// Validates command option types against global options for a given config.
// When both `options` and `commands` are present, overlapping option names
// must have matching `type` fields. Use via intersection in function signatures:
//   config: T & ValidateCommandOptionTypes<T>
// biome-ignore lint/suspicious/noExplicitAny: extension record is intentionally open-ended
export type ValidateCommandOptionTypes<T extends Record<string, any>> = T extends {
    options: infer GO extends Record<string, OptionConfig>;
    commands: infer C extends Record<string, CommandConfig>;
}
    ? Omit<T, 'commands'> & { commands: ValidateCommands<GO, C> }
    : T;

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

// ---------------------------------------------------------------------------
// Command discriminated union builder
// ---------------------------------------------------------------------------

// Build a single arm of the command discriminated union:
// { command: CommandName; values: Prettify<MergedParsedValues<GlobalOpts, CmdOpts>>; positionals: string[] }
type CommandArm<
    GlobalOpts extends Record<string, OptionConfig>,
    CmdName extends string,
    Cmd extends CommandConfig,
    WithTokens extends boolean,
> = Cmd extends { options: infer CO extends Record<string, OptionConfig> }
    ? WithTokens extends true
        ? { command: CmdName; values: MergedParsedValues<GlobalOpts, StripExtFromOptions<CO>>; positionals: string[]; tokens: Token[] }
        : { command: CmdName; values: MergedParsedValues<GlobalOpts, StripExtFromOptions<CO>>; positionals: string[] }
    : WithTokens extends true
      ? { command: CmdName; values: ParsedValues<GlobalOpts>; positionals: string[]; tokens: Token[] }
      : { command: CmdName; values: ParsedValues<GlobalOpts>; positionals: string[] };

// Build the "no command matched" arm
type NoCommandArm<GlobalOpts extends Record<string, OptionConfig>, WithTokens extends boolean> = WithTokens extends true
    ? { command: undefined; values: ParsedValues<GlobalOpts>; positionals: string[]; tokens: Token[] }
    : { command: undefined; values: ParsedValues<GlobalOpts>; positionals: string[] };

// Distribute across all command names to build the full union
type CommandUnion<
    GlobalOpts extends Record<string, OptionConfig>,
    Commands extends Record<string, CommandConfig>,
    WithTokens extends boolean,
> =
    | {
          [K in keyof Commands & string]: CommandArm<GlobalOpts, K, Commands[K], WithTokens>;
      }[keyof Commands & string]
    | NoCommandArm<GlobalOpts, WithTokens>;

// ---------------------------------------------------------------------------
// Extended result type (with middleware result extensions)
// ---------------------------------------------------------------------------

export type ParseArgsPlusResultFromExtended<
    // biome-ignore lint/suspicious/noExplicitAny: accepts any middleware config shape
    T extends ParseArgsPlusConfigWithMiddleware<any, any>,
    // biome-ignore lint/suspicious/noExplicitAny: result extension is open-ended
    // biome-ignore lint/complexity/noBannedTypes: empty object is the correct fallback
    RE extends Record<string, any> = {},
> =
    // Check if the commands middleware is active (ResultCommandDiscriminant) AND
    // the config has both options and commands
    RE extends ResultCommandDiscriminant
        ? T extends {
              // biome-ignore lint/suspicious/noExplicitAny: inferred options are open-ended
              options: infer O extends Record<string, any>;
              commands: infer C extends Record<string, CommandConfig>;
          }
            ? CommandUnion<MergeExtraValues<StripExtFromOptions<O>, RE>, C, T extends { tokens: true } ? true : false>
            : T extends { commands: infer C extends Record<string, CommandConfig> }
              ? // biome-ignore lint/complexity/noBannedTypes: empty object is the correct fallback for no options
                CommandUnion<RE extends ResultExtraValues ? RE['extraValues'] : {}, C, T extends { tokens: true } ? true : false>
              : T extends {
                      // biome-ignore lint/suspicious/noExplicitAny: inferred options are open-ended
                      options: infer O extends Record<string, any>;
                  }
                ? T extends { tokens: true }
                    ? ParseArgsPlusResultTypedWithTokens<MergeExtraValues<StripExtFromOptions<O>, RE>>
                    : ParseArgsPlusResultTyped<MergeExtraValues<StripExtFromOptions<O>, RE>>
                : RE extends ResultExtraValues
                  ? T extends { tokens: true }
                      ? ParseArgsPlusResultTypedWithTokens<RE['extraValues']>
                      : ParseArgsPlusResultTyped<RE['extraValues']>
                  : T extends { tokens: true }
                    ? ParseArgsPlusResultBaseWithTokens
                    : ParseArgsPlusResultBase
        : // No command discriminant — just merge extra values if any
          T extends {
                // biome-ignore lint/suspicious/noExplicitAny: inferred options are open-ended
                options: infer O extends Record<string, any>;
            }
          ? T extends { tokens: true }
              ? ParseArgsPlusResultTypedWithTokens<MergeExtraValues<StripExtFromOptions<O>, RE>>
              : ParseArgsPlusResultTyped<MergeExtraValues<StripExtFromOptions<O>, RE>>
          : RE extends ResultExtraValues
            ? T extends { tokens: true }
                ? ParseArgsPlusResultTypedWithTokens<RE['extraValues']>
                : ParseArgsPlusResultTyped<RE['extraValues']>
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

/** Result extension that the commands middleware contributes: discriminated union on `command`. */
export type CommandsResultExtension = ResultCommandDiscriminant;

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

/**
 * Result extension for the help middleware.
 * Adds `help` and `version` boolean flags to the result values,
 * reflecting the options injected by the help middleware.
 */
export interface HelpResultExtension extends ResultExtraValues {
    extraValues: {
        help: { type: 'boolean' };
        version: { type: 'boolean' };
    };
}
