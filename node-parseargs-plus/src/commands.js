import { parseArgs } from 'node:util';

/**
 * Symbol used to stash resolved command state on the config object
 * for cross-middleware communication.
 */
const kCommandState = Symbol.for('parseArgsPlus.commandState');

/**
 * Resolves which command (if any) was specified, returning the command name,
 * its config, and the index of the command positional in the args array.
 *
 * @param {string[]} args
 * @param {Record<string, import('./types.d.ts').CommandConfig>} commandMap
 * @param {Record<string, import('./types.d.ts').OptionConfig>} globalOptions
 * @param {string | undefined} defaultCommand
 * @returns {{ commandName: string | undefined; commandConfig: import('./types.d.ts').CommandConfig | undefined; cmdIndex: number }}
 */
function resolveCommand(args, commandMap, globalOptions, defaultCommand) {
    // Discovery parse: strict:false so unknown (command-specific) flags don't throw.
    // Global options are declared so that global string options consume their values
    // and don't swallow the command positional.
    const discovery = parseArgs({
        args,
        strict: false,
        allowPositionals: true,
        tokens: true,
        options: /** @type {any} */ (globalOptions),
    });

    const firstPositionalToken = /** @type {any} */ (discovery.tokens.find((/** @type {any} */ t) => t.kind === 'positional'));

    if (firstPositionalToken && firstPositionalToken.value in commandMap) {
        return {
            commandName: firstPositionalToken.value,
            commandConfig: commandMap[firstPositionalToken.value],
            cmdIndex: firstPositionalToken.index,
        };
    }

    if (defaultCommand && defaultCommand in commandMap) {
        return {
            commandName: defaultCommand,
            commandConfig: commandMap[defaultCommand],
            // -1 signals "no explicit command positional to skip"
            cmdIndex: firstPositionalToken ? firstPositionalToken.index : -1,
        };
    }

    if (firstPositionalToken) {
        const available = Object.keys(commandMap).join(', ');
        throw new Error(`Unknown command '${firstPositionalToken.value}'. Available commands: ${available}`);
    }

    // No positionals and no default — no command mode
    return { commandName: undefined, commandConfig: undefined, cmdIndex: -1 };
}

/**
 * Validates that overlapping option names between global and command scopes
 * have the same type.
 *
 * @param {Record<string, import('./types.d.ts').OptionConfig>} globalOptions
 * @param {Record<string, import('./types.d.ts').OptionConfig>} commandOptions
 * @param {string} commandName
 */
function validateOptionTypes(globalOptions, commandOptions, commandName) {
    for (const [name, cmdOpt] of Object.entries(commandOptions)) {
        if (name in globalOptions) {
            const globalOpt = globalOptions[name];
            if (globalOpt.type !== cmdOpt.type) {
                throw new Error(
                    `Option '--${name}' has type '${globalOpt.type}' globally but type '${cmdOpt.type}' in command '${commandName}'. ` +
                        `Use different option names to avoid conflicts.`
                );
            }
        }
    }
}

/**
 * Builds a lookup of option names → their definitions, and a map from
 * short flags → option definitions.
 *
 * @param {Record<string, import('./types.d.ts').OptionConfig>} options
 * @returns {{ names: Set<string>; shorts: Map<string, import('./types.d.ts').OptionConfig> }}
 */
function buildOptionLookup(options) {
    const names = new Set(Object.keys(options));
    /** @type {Map<string, import('./types.d.ts').OptionConfig>} */
    const shorts = new Map();
    for (const [, opt] of Object.entries(options)) {
        if (opt.short) {
            shorts.set(opt.short, opt);
        }
    }
    return { names, shorts };
}

/**
 * Splits args after the command boundary into two buckets:
 *   - `commandArgs`: flags/positionals that belong to the command
 *   - `globalArgs`: global flags that appeared after the command
 *
 * A flag is considered "global" if it matches a global option name/short
 * and does NOT match a command option name/short.
 * A flag that matches both stays in commandArgs (command takes precedence).
 * A flag that matches neither stays in commandArgs (pass 2 strict mode
 * will reject it if appropriate).
 *
 * @param {string[]} args  The raw args slice after the command positional.
 * @param {Record<string, import('./types.d.ts').OptionConfig>} globalOptions
 * @param {Record<string, import('./types.d.ts').OptionConfig>} commandOptions
 * @returns {{ commandArgs: string[]; globalArgs: string[] }}
 */
function splitArgs(args, globalOptions, commandOptions) {
    const global = buildOptionLookup(globalOptions);
    const cmd = buildOptionLookup(commandOptions);

    /** @type {string[]} */
    const commandArgs = [];
    /** @type {string[]} */
    const globalArgs = [];

    let i = 0;
    while (i < args.length) {
        const arg = args[i];

        // option-terminator: everything from here stays in commandArgs
        if (arg === '--') {
            while (i < args.length) {
                commandArgs.push(args[i]);
                i++;
            }
            break;
        }

        if (arg.startsWith('--')) {
            // Long flag: --name or --name=value
            const eqIndex = arg.indexOf('=');
            const flagName = eqIndex >= 0 ? arg.slice(2, eqIndex) : arg.slice(2);
            const isCmd = cmd.names.has(flagName);
            const isGlobal = global.names.has(flagName);

            if (isGlobal && !isCmd) {
                // Purely global — move to globalArgs
                globalArgs.push(arg);
                if (eqIndex < 0 && globalOptions[flagName]?.type === 'string') {
                    i++;
                    if (i < args.length) {
                        globalArgs.push(args[i]);
                    }
                }
            } else {
                // Command-specific, overlapping, or unknown — keep in commandArgs
                commandArgs.push(arg);
                if (eqIndex < 0) {
                    const optDef = commandOptions[flagName] || globalOptions[flagName];
                    if (optDef?.type === 'string') {
                        i++;
                        if (i < args.length) {
                            commandArgs.push(args[i]);
                        }
                    }
                }
            }
        } else if (arg.startsWith('-') && arg.length > 1) {
            // Short flag(s): -D or -Dv etc.
            const chars = arg.slice(1);

            // Check if ALL chars resolve to purely-global shorts
            let allPurelyGlobal = true;
            for (const ch of chars) {
                const isCmd = cmd.shorts.has(ch);
                const isGlobal = global.shorts.has(ch);
                if (!isGlobal || isCmd) {
                    allPurelyGlobal = false;
                    break;
                }
            }

            if (allPurelyGlobal) {
                globalArgs.push(arg);
                // If single char and it's a string type, consume next arg as value
                if (chars.length === 1) {
                    const optDef = global.shorts.get(chars);
                    if (optDef?.type === 'string') {
                        i++;
                        if (i < args.length) {
                            globalArgs.push(args[i]);
                        }
                    }
                }
            } else {
                commandArgs.push(arg);
                // If single char and it's a known string type, consume next arg as value
                if (chars.length === 1) {
                    const optDef = cmd.shorts.get(chars) || global.shorts.get(chars);
                    if (optDef?.type === 'string') {
                        i++;
                        if (i < args.length) {
                            commandArgs.push(args[i]);
                        }
                    }
                }
            }
        } else {
            // Positional — keep in commandArgs
            commandArgs.push(arg);
        }
        i++;
    }

    return { commandArgs, globalArgs };
}

/**
 * Commands middleware that adds subcommand support.
 *
 * Uses a two-pass parsing strategy:
 * - Pass 1 (in transformConfig): discovery parse with `strict: false` to find
 *   the command name, then splits args into globalArgs and commandArgs.
 *   Global flags that appear after the command are moved back to globalArgs.
 * - Pass 2 (in transformResult): parses the command-specific args with the
 *   command's own options.
 *
 * Has configOrder: 10, so transformConfig runs after other middlewares
 * (e.g. help adds --help/--version to global options first).
 * Has resultOrder: 10, so transformResult runs late (does pass 2 parsing last).
 *
 * @type {import('./types.d.ts').Middleware<import('./types.d.ts').CommandsOptionExtension, import('./types.d.ts').CommandsConfigExtension>}
 */
export const commands = /** @type {any} */ (
    Object.assign(
        [
            // [0] transformConfig
            (/** @type {import('./types.d.ts').ParseArgsPlusConfig} */ config) => {
                const extConfig =
                    /** @type {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').CommandsConfigExtension} */ (config);
                const commandMap = extConfig.commands;
                if (!commandMap) {
                    return config;
                }

                const args = config.args ?? process.argv.slice(2);
                const globalOptions = config.options ?? {};

                const { commandName, commandConfig, cmdIndex } = resolveCommand(args, commandMap, globalOptions, extConfig.defaultCommand);

                /** @type {string[]} */
                let globalArgs;
                /** @type {string[]} */
                let commandArgs;

                if (!commandName || !commandConfig) {
                    // No command resolved
                    globalArgs = args;
                    commandArgs = [];
                } else if (cmdIndex === -1) {
                    // Default command, no explicit command positional
                    // No positionals at all — everything is global
                    globalArgs = args;
                    commandArgs = [];
                } else {
                    // Check if the command positional is the actual command name
                    // or the start of default command's positionals
                    const isExplicitCommand = args[cmdIndex] === commandName;

                    const rawGlobalArgs = args.slice(0, cmdIndex);
                    const rawCommandArgs = isExplicitCommand ? args.slice(cmdIndex + 1) : args.slice(cmdIndex);

                    // Validate option type collisions
                    if (commandConfig.options) {
                        validateOptionTypes(globalOptions, commandConfig.options, commandName);
                    }

                    // Split command args: move purely-global flags back to globalArgs
                    const split = splitArgs(rawCommandArgs, globalOptions, commandConfig.options ?? {});
                    commandArgs = split.commandArgs;
                    globalArgs = rawGlobalArgs.concat(split.globalArgs);
                }

                // Stash command state for cross-middleware communication
                /** @type {any} */ (config)[kCommandState] = {
                    commandName,
                    commandArgs,
                    commandConfig,
                };

                // Rewrite config for pass 1: global args only
                return {
                    ...config,
                    args: globalArgs,
                    allowPositionals: false,
                };
            },

            // [1] transformResult
            (
                /** @type {{ values: Record<string, any>; positionals: string[]; tokens?: import('./types.d.ts').Token[] }} */ result,
                /** @type {import('./types.d.ts').ParseArgsPlusConfig} */ config
            ) => {
                const state = /** @type {any} */ (config)[kCommandState];
                if (!state) {
                    return result;
                }

                const { commandName, commandArgs, commandConfig } = state;

                // If no command was resolved, pass through
                if (!commandName || !commandConfig) {
                    return { ...result, command: undefined };
                }

                const globalOptions = config.options ?? {};
                const commandOptions = commandConfig.options ?? {};

                // Merge global + command options for pass 2
                // Command options take precedence (same name, same type — validated in transformConfig)
                const mergedOptions = { ...globalOptions, ...commandOptions };

                // Pass 2: parse command-specific args
                const pass2 = parseArgs({
                    args: commandArgs,
                    strict: config.strict ?? true,
                    allowPositionals: commandConfig.allowPositionals ?? false,
                    options: /** @type {any} */ (mergedOptions),
                });

                // Merge values: pass 1 (global) + pass 2 (command)
                // Pass 2 values win on overlap (the flag appeared in command scope)
                const mergedValues = { ...result.values, ...pass2.values };

                return {
                    values: mergedValues,
                    positionals: pass2.positionals,
                    command: commandName,
                };
            },
        ],
        { configOrder: 10, resultOrder: 10 }
    )
);
