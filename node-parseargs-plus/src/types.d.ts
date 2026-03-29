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

// Resolve the value type for a single option based on its type and multiple flag.
// When `__customReturn` is present (injected by StripExtFromOptions for function-typed options),
// the return type of the transform function is used directly — no automatic `R[]` wrapping,
// because with `multiple: true` the factory function receives the whole `string[]` array
// and is responsible for returning the final type itself.
type ResolveOptionType<T extends OptionConfig> = T extends { __customReturn: infer R }
    ? R
    : T extends { type: 'string'; multiple: true }
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

// An OptionConfig extended with the extra fields contributed by middlewares.
// Uses Omit so that extension fields (e.g. `type` in CustomValueOptionExtension)
// *replace* the base OptionConfig field instead of being narrowed by intersection.
// biome-ignore lint/suspicious/noExplicitAny: extension record is intentionally open-ended
type ExtendedOptionConfig<Ext extends Record<string, any>> = Omit<OptionConfig, keyof Ext> & Ext;

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

// Thread OptionExt into command configs so that command-level options also accept
// extended option types (e.g. function-typed `type` from customValue middleware).
// biome-ignore lint/suspicious/noExplicitAny: extension record is intentionally open-ended
type ExtendCommandConfigOptions<C, OptionExt extends Record<string, any>> = C extends { options?: Record<string, any> }
    ? Omit<C, 'options'> & { options?: Record<string, ExtendedOptionConfig<OptionExt>> }
    : C;

// When ConfigExt contains a `commands` field (from the commands middleware),
// replace each command's `options` type with the extended option config.
// biome-ignore lint/suspicious/noExplicitAny: extension record is intentionally open-ended
type ExtendConfigExtCommands<CE extends Record<string, any>, OptionExt extends Record<string, any>> = CE extends {
    commands: Record<string, infer C>;
}
    ? Omit<CE, 'commands'> & { commands: Record<string, ExtendCommandConfigOptions<C, OptionExt>> }
    : CE;

// The config accepted by parseArgsPlus when middlewares extend the option and/or config shape.
// The `ConfigExt` fields are merged into the top-level config via intersection.
// Command-level options are also extended with OptionExt via ExtendConfigExtCommands.
// biome-ignore lint/suspicious/noExplicitAny: extension record is intentionally open-ended
export type ParseArgsPlusConfigWithMiddleware<OptionExt extends Record<string, any>, ConfigExt extends Record<string, any>> = {
    options?: Record<string, ExtendedOptionConfig<OptionExt>>;
    allowPositionals?: boolean;
    allowNegative?: boolean;
    strict?: boolean;
    args?: string[];
    tokens?: boolean;
} & ExtendConfigExtCommands<ConfigExt, OptionExt>;

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
//
// When an option's `type` is a function (from the customValue middleware), the standard
// Pick → OptionConfig path fails because the function doesn't satisfy `type: 'string' | 'boolean'`.
// In that case we synthesise a compatible OptionConfig with a `__customReturn` phantom marker
// carrying the function's return type, so that `ResolveOptionType` can resolve it correctly.
// biome-ignore lint/suspicious/noExplicitAny: accepts any option extension shape
type StripExtFromOptions<O extends Record<string, any>> = {
    [K in keyof O]: Pick<O[K], keyof OptionConfig & keyof O[K]> extends infer Picked
        ? Picked extends OptionConfig
            ? Picked
            : // biome-ignore lint/suspicious/noExplicitAny: function types may have any signature
              O[K] extends { type: (...args: any[]) => infer R }
              ? { type: 'string'; __customReturn: R } & (O[K] extends { default: infer D } ? { default: D } : Record<string, never>)
              : OptionConfig
        : never;
};

// ---------------------------------------------------------------------------
// Command discriminated union builder
// ---------------------------------------------------------------------------

// Build a single arm of the command discriminated union:
// { command: CommandName; values: Prettify<MergedParsedValues<GlobalOpts, CmdOpts>>; positionals: string[] }
type CommandArmBase<
    GlobalOpts extends Record<string, OptionConfig>,
    CmdName extends string,
    Cmd extends CommandConfig,
    WithTokens extends boolean,
    // biome-ignore lint/suspicious/noExplicitAny: command options may include function-typed extensions
> = Cmd extends { options: infer CO extends Record<string, any> }
    ? WithTokens extends true
        ? { command: CmdName; values: MergedParsedValues<GlobalOpts, StripExtFromOptions<CO>>; positionals: string[]; tokens: Token[] }
        : { command: CmdName; values: MergedParsedValues<GlobalOpts, StripExtFromOptions<CO>>; positionals: string[] }
    : WithTokens extends true
      ? { command: CmdName; values: ParsedValues<GlobalOpts>; positionals: string[]; tokens: Token[] }
      : { command: CmdName; values: ParsedValues<GlobalOpts>; positionals: string[] };

/** Conditionally add `parameters` to a command arm when the command defines parameters */
type CommandArmWithParameters<
    Base,
    // biome-ignore lint/suspicious/noExplicitAny: command configs may include extended option types
    Cmd extends Record<string, any>,
    HasParametersMiddleware extends boolean,
> = HasParametersMiddleware extends true
    ? Cmd extends { parameters: infer P extends readonly string[] }
        ? Base & { parameters: ParametersResult<P> }
        : Base
    : Base;

type CommandArm<
    GlobalOpts extends Record<string, OptionConfig>,
    CmdName extends string,
    // biome-ignore lint/suspicious/noExplicitAny: command configs may include extended option types
    Cmd extends Record<string, any>,
    WithTokens extends boolean,
    HasParametersMiddleware extends boolean = false,
> = CommandArmWithParameters<CommandArmBase<GlobalOpts, CmdName, Cmd, WithTokens>, Cmd, HasParametersMiddleware>;

// Build the "no command matched" arm
type NoCommandArm<GlobalOpts extends Record<string, OptionConfig>, WithTokens extends boolean> = WithTokens extends true
    ? { command: undefined; values: ParsedValues<GlobalOpts>; positionals: string[]; tokens: Token[] }
    : { command: undefined; values: ParsedValues<GlobalOpts>; positionals: string[] };

// Distribute across all command names to build the full union
type CommandUnion<
    GlobalOpts extends Record<string, OptionConfig>,
    // biome-ignore lint/suspicious/noExplicitAny: command configs may include extended option types
    Commands extends Record<string, any>,
    WithTokens extends boolean,
    HasParametersMiddleware extends boolean = false,
> =
    | {
          [K in keyof Commands & string]: CommandArm<GlobalOpts, K, Commands[K], WithTokens, HasParametersMiddleware>;
      }[keyof Commands & string]
    | NoCommandArm<GlobalOpts, WithTokens>;

// ---------------------------------------------------------------------------
// Extended result type (with middleware result extensions)
// ---------------------------------------------------------------------------

/** Helper: conditionally intersect with parameters result when the marker is present (non-commands case) */
type MaybeWithParameters<
    Base,
    // biome-ignore lint/suspicious/noExplicitAny: accepts any middleware config shape
    T extends Record<string, any>,
    // biome-ignore lint/suspicious/noExplicitAny: result extension is open-ended
    RE extends Record<string, any>,
> = RE extends ResultParametersMarker ? Base & BuildParametersResult<T> : Base;

/** Check whether the result extension includes the parameters marker */
// biome-ignore lint/suspicious/noExplicitAny: result extension is open-ended
type HasParametersMarker<RE extends Record<string, any>> = RE extends ResultParametersMarker ? true : false;

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
              // biome-ignore lint/suspicious/noExplicitAny: command configs may include extended option types
              commands: infer C extends Record<string, any>;
          }
            ? CommandUnion<
                  MergeExtraValues<StripExtFromOptions<O>, RE>,
                  C,
                  T extends { tokens: true } ? true : false,
                  HasParametersMarker<RE>
              >
            : // biome-ignore lint/suspicious/noExplicitAny: command configs may include extended option types
              T extends { commands: infer C extends Record<string, any> }
              ? CommandUnion<
                    // biome-ignore lint/complexity/noBannedTypes: empty object is the correct fallback for no options
                    RE extends ResultExtraValues ? RE['extraValues'] : {},
                    C,
                    T extends { tokens: true } ? true : false,
                    HasParametersMarker<RE>
                >
              : T extends {
                      // biome-ignore lint/suspicious/noExplicitAny: inferred options are open-ended
                      options: infer O extends Record<string, any>;
                  }
                ? T extends { tokens: true }
                    ? MaybeWithParameters<ParseArgsPlusResultTypedWithTokens<MergeExtraValues<StripExtFromOptions<O>, RE>>, T, RE>
                    : MaybeWithParameters<ParseArgsPlusResultTyped<MergeExtraValues<StripExtFromOptions<O>, RE>>, T, RE>
                : RE extends ResultExtraValues
                  ? T extends { tokens: true }
                      ? MaybeWithParameters<ParseArgsPlusResultTypedWithTokens<RE['extraValues']>, T, RE>
                      : MaybeWithParameters<ParseArgsPlusResultTyped<RE['extraValues']>, T, RE>
                  : T extends { tokens: true }
                    ? MaybeWithParameters<ParseArgsPlusResultBaseWithTokens, T, RE>
                    : MaybeWithParameters<ParseArgsPlusResultBase, T, RE>
        : // No command discriminant — just merge extra values if any
          T extends {
                // biome-ignore lint/suspicious/noExplicitAny: inferred options are open-ended
                options: infer O extends Record<string, any>;
            }
          ? T extends { tokens: true }
              ? MaybeWithParameters<ParseArgsPlusResultTypedWithTokens<MergeExtraValues<StripExtFromOptions<O>, RE>>, T, RE>
              : MaybeWithParameters<ParseArgsPlusResultTyped<MergeExtraValues<StripExtFromOptions<O>, RE>>, T, RE>
          : RE extends ResultExtraValues
            ? T extends { tokens: true }
                ? MaybeWithParameters<ParseArgsPlusResultTypedWithTokens<RE['extraValues']>, T, RE>
                : MaybeWithParameters<ParseArgsPlusResultTyped<RE['extraValues']>, T, RE>
            : T extends { tokens: true }
              ? MaybeWithParameters<ParseArgsPlusResultBaseWithTokens, T, RE>
              : MaybeWithParameters<ParseArgsPlusResultBase, T, RE>;

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
    /** Positional parameter definitions for this command. Each string must be `<name>`, `[name]`, `<name...>`, or `[name...]`. */
    parameters?: readonly string[];
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
    text?: string | readonly string[];
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

// ---------------------------------------------------------------------------
// Parameters middleware
// ---------------------------------------------------------------------------

/**
 * A valid parameter string is one of:
 *   `<name>`       – required single value
 *   `[name]`       – optional single value
 *   `<name...>`    – required variadic (spread)
 *   `[name...]`    – optional variadic (spread)
 *
 * Names may contain letters, digits, hyphens, and spaces.
 */

/** Check if a string is a valid required parameter `<name>` or `<name...>` */
type IsRequiredParam<S extends string> = S extends `<${string}>` ? true : false;

/** Check if a string is a valid optional parameter `[name]` or `[name...]` */
type IsOptionalParam<S extends string> = S extends `[${string}]` ? true : false;

/** Check if a parameter is variadic (spread) */
type IsSpread<S extends string> = S extends `<${string}...>` ? true : S extends `[${string}...]` ? true : false;

/** Extract the raw name from a parameter string */
type ExtractParamRawName<S extends string> = S extends `<${infer Name}...>`
    ? Name
    : S extends `[${infer Name}...]`
      ? Name
      : S extends `<${infer Name}>`
        ? Name
        : S extends `[${infer Name}]`
          ? Name
          : never;

/**
 * Convert a kebab-case / space-separated parameter name to camelCase.
 * e.g. "package name" → "packageName", "save-dev" → "saveDev"
 */
type CamelCase<S extends string> = S extends `${infer Head} ${infer Tail}`
    ? `${Lowercase<Head>}${CamelCasePascal<Tail>}`
    : S extends `${infer Head}-${infer Tail}`
      ? `${Lowercase<Head>}${CamelCasePascal<Tail>}`
      : Lowercase<S>;

/** Capitalize the first letter then continue camelCasing */
type CamelCasePascal<S extends string> = S extends `${infer Head} ${infer Tail}`
    ? `${Capitalize<Lowercase<Head>>}${CamelCasePascal<Tail>}`
    : S extends `${infer Head}-${infer Tail}`
      ? `${Capitalize<Lowercase<Head>>}${CamelCasePascal<Tail>}`
      : Capitalize<Lowercase<S>>;

/** Get the camelCase key name for a parameter string */
type ParamKey<S extends string> = CamelCase<ExtractParamRawName<S>>;

/** Get the value type for a parameter string */
type ParamValueType<S extends string> = IsSpread<S> extends true ? string[] : string;

// ---------------------------------------------------------------------------
// Parameter list validation
// ---------------------------------------------------------------------------

/**
 * Validate that a single parameter string matches one of the allowed patterns:
 *   `<name>`, `[name]`, `<name...>`, `[name...]`
 *
 * Returns the string itself when valid, or `never` when invalid.
 */
type ValidateParamString<S extends string> = IsRequiredParam<S> extends true ? S : IsOptionalParam<S> extends true ? S : never;

/**
 * Count the number of spread parameters in a tuple.
 */
type CountSpreads<T extends readonly string[], Acc extends readonly 0[] = []> = T extends readonly [
    infer Head extends string,
    ...infer Tail extends string[],
]
    ? IsSpread<Head> extends true
        ? CountSpreads<Tail, [...Acc, 0]>
        : CountSpreads<Tail, Acc>
    : Acc['length'];

/**
 * Check that no required parameters appear after an optional one.
 * Returns `true` when order is valid, `false` otherwise.
 */
type ValidateParamOrder<T extends readonly string[], SeenOptional extends boolean = false> = T extends readonly [
    infer Head extends string,
    ...infer Tail extends string[],
]
    ? IsOptionalParam<Head> extends true
        ? ValidateParamOrder<Tail, true>
        : SeenOptional extends true
          ? false // required after optional
          : ValidateParamOrder<Tail, false>
    : true;

/**
 * Check that spread parameters only appear at the end.
 * Returns `true` when valid, `false` otherwise.
 */
type ValidateSpreadIsLast<T extends readonly string[]> = T extends readonly [infer Head extends string, ...infer Tail extends string[]]
    ? IsSpread<Head> extends true
        ? Tail extends readonly []
            ? true
            : false
        : ValidateSpreadIsLast<Tail>
    : true;

/**
 * Validate a full parameters tuple:
 * 1. Each string matches a valid pattern
 * 2. At most one spread parameter (guaranteed by spread-is-last + single pass)
 * 3. Spread parameter is last
 * 4. No required parameters after optional ones
 *
 * Returns the tuple type itself when valid, otherwise a branded error tuple.
 */
type ValidateParametersTuple<T extends readonly string[]> =
    CountSpreads<T> extends 0 | 1
        ? ValidateSpreadIsLast<T> extends true
            ? ValidateParamOrder<T> extends true
                ? { [K in keyof T]: ValidateParamString<T[K] & string> }
                : readonly ['@@error: required parameters must come before optional ones']
            : readonly ['@@error: spread parameter must be last']
        : readonly ['@@error: at most one spread parameter is allowed'];

// ---------------------------------------------------------------------------
// Build the parameters result object type from the tuple
// ---------------------------------------------------------------------------

/** Build the required keys portion of the parameters object */
type RequiredParamKeys<T extends readonly string[]> = {
    [K in keyof T & `${number}` as T[K] extends string
        ? IsRequiredParam<T[K]> extends true
            ? ParamKey<T[K]>
            : never
        : never]: T[K] extends string ? ParamValueType<T[K]> : never;
};

/** Build the optional keys portion of the parameters object */
type OptionalParamKeys<T extends readonly string[]> = {
    [K in keyof T & `${number}` as T[K] extends string
        ? IsOptionalParam<T[K]> extends true
            ? ParamKey<T[K]>
            : never
        : never]?: T[K] extends string ? ParamValueType<T[K]> : never;
};

/** The full parameters result object for a given tuple */
export type ParametersResult<T extends readonly string[]> = Prettify<RequiredParamKeys<T> & OptionalParamKeys<T>>;

// ---------------------------------------------------------------------------
// Parameters middleware extension types
// ---------------------------------------------------------------------------

/** The parameters middleware does not extend individual option configs. */
// biome-ignore lint/complexity/noBannedTypes: empty extension is intentional
export type ParametersOptionExtension = {};

/** Extension that the parameters middleware adds to the top-level config. */
export interface ParametersConfigExtension {
    /** Positional parameter definitions. Each string must be `<name>`, `[name]`, `<name...>`, or `[name...]`. When using commands, parameters can be defined per-command instead. */
    parameters?: readonly string[];
}

/**
 * Marker interface for result extensions that produce a typed `parameters` object.
 * The parameters middleware uses this so `parseArgsPlus` can build a
 * per-config typed `parameters` field on the result.
 */
export interface ResultParametersMarker {
    /** Marker that triggers parameters object generation from the config's `parameters`. */
    parametersMarker: true;
}

/** Result extension for the parameters middleware. */
export type ParametersResultExtension = ResultParametersMarker;

/**
 * Build the `{ parameters: ... }` intersection to add to the result type
 * when the parameters middleware is active.
 */
type BuildParametersResult<T> = T extends { parameters: infer P extends readonly string[] }
    ? { parameters: ParametersResult<P> }
    : // biome-ignore lint/complexity/noBannedTypes: empty intersection is intentional when no parameters defined
      {};

/** Validate the `parameters` field on a single command config */
type ValidateCommandParameters<C extends CommandConfig> = C extends { parameters: infer P extends readonly string[] }
    ? Omit<C, 'parameters'> & { parameters: ValidateParametersTuple<P> }
    : C;

/** Validate `parameters` on all commands in a commands map */
type ValidateCommandsParameters<Commands extends Record<string, CommandConfig>> = {
    [K in keyof Commands]: ValidateCommandParameters<Commands[K]>;
};

/** Validate the `parameters` field in a config object (top-level and per-command) */
export type ValidateParameters<T> = (
    T extends { parameters: infer P extends readonly string[] }
        ? Omit<T, 'parameters'> & { parameters: ValidateParametersTuple<P> }
        : T
) extends infer V
    ? V extends { commands: infer C extends Record<string, CommandConfig> }
        ? Omit<V, 'commands'> & { commands: ValidateCommandsParameters<C> }
        : V
    : never;

// ---------------------------------------------------------------------------
// Optional-value middleware
// ---------------------------------------------------------------------------

/**
 * Extension that the optional-value middleware adds to each option.
 *
 * When `optionalValue` is `true` on a `type: 'string'` option, that option
 * can be used bare on the command line (e.g. `--option` with no following value).
 * A bare use produces an empty string `""` in the parsed values.
 *
 * Works with both single and `multiple: true` string options.
 */
export interface OptionalValueOptionExtension {
    /**
     * When `true`, this string option can be used without a value.
     * Bare `--option` produces `""` (empty string) in the result.
     * Only meaningful for `type: 'string'` options.
     */
    optionalValue?: boolean;
}

// ---------------------------------------------------------------------------
// Custom-value middleware
// ---------------------------------------------------------------------------

/**
 * Extension that the custom-value middleware adds to each option.
 *
 * When `type` is set to a function (e.g. `Number`, `JSON.parse`, or any
 * `(value: string) => T`), the middleware replaces it with `'string'` for
 * `parseArgs` and calls the function on each parsed string value to produce
 * the final transformed result.
 *
 * Works with both single and `multiple: true` options.
 * Default string values ARE transformed, since `parseArgs` places them in
 * `values` indistinguishably from CLI-provided values.
 */
export interface CustomValueOptionExtension {
    /**
     * Override `type` to also accept a transform function.
     * When a function is provided, the option is parsed as a string
     * and the function is called with the parsed value to produce
     * the final value.
     *
     * For single-value options the function receives a `string`.
     * For `multiple: true` options the function receives the whole
     * `string[]` array, giving full control over the final shape
     * (e.g. deduplication, sorting, batch conversion).
     *
     * Built-in constructors like `Number`, `Boolean`, `URL`, `Date`
     * work naturally as transform functions for single-value options.
     *
     * The return type of the function is preserved at the type level,
     * so `{ type: Number }` produces `number` in the result values.
     */
    // biome-ignore lint/suspicious/noExplicitAny: custom transform functions may return any type
    type: ((value: string) => any) | ((value: string[]) => any) | 'string' | 'boolean';
}
