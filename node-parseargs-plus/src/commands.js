import { parseArgs } from 'node:util';

/**
 * Symbol used to stash resolved command state on the config object
 * for cross-middleware communication.
 */
const kCommandState = Symbol.for('parseArgsPlus.commandState');

/**
 * Commands middleware that adds subcommand support.
 *
 * The middleware uses a two-pass parsing strategy:
 * - Pass 1 (in transformConfig): discovery parse with `strict: false` to find
 *   the command name from the first positional argument, then rewrites the config
 *   to parse only global args.
 * - Pass 2 (in transformResult): parses the command-specific args with the
 *   command's options merged with global options.
 *
 * Flags that appear after the command but are not recognized as command options
 * are moved back to globalArgs so that other middlewares (e.g. help) can handle
 * them in pass 1.
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

                // Discovery parse: use strict:false with global options declared
                // so that global string options correctly consume their values.
                // Unknown options (command-specific) are treated as boolean — that's
                // fine because we only need the token stream to find the command.
                const discovery = parseArgs({
                    args,
                    strict: false,
                    allowPositionals: true,
                    tokens: true,
                    options: /** @type {any} */ (globalOptions),
                });

                // Find the first positional token — that's our command candidate
                const firstPositionalToken = /** @type {import('./types.d.ts').Token | undefined} */ (
                    discovery.tokens.find((/** @type {any} */ t) => t.kind === 'positional')
                );

                /** @type {string | undefined} */
                let commandName;
                /** @type {string[]} */
                let commandArgs;
                /** @type {import('./types.d.ts').CommandConfig | undefined} */
                let commandConfig;
                /** @type {string[]} */
                let globalArgs;

                if (firstPositionalToken && /** @type {any} */ (firstPositionalToken).value in commandMap) {
                    // Known command found
                    commandName = /** @type {string} */ (/** @type {any} */ (firstPositionalToken).value);
                    commandConfig = commandMap[/** @type {string} */ (commandName)];
                    const cmdArgIndex = /** @type {any} */ (firstPositionalToken).index;
                    globalArgs = args.slice(0, cmdArgIndex);
                    commandArgs = args.slice(cmdArgIndex + 1);
                } else if (extConfig.defaultCommand && extConfig.defaultCommand in commandMap) {
                    // No known command found, use default
                    commandName = extConfig.defaultCommand;
                    commandConfig = commandMap[/** @type {string} */ (commandName)];
                    if (firstPositionalToken) {
                        // There are positionals but none matched a command —
                        // everything goes to the default command
                        const cmdArgIndex = /** @type {any} */ (firstPositionalToken).index;
                        globalArgs = args.slice(0, cmdArgIndex);
                        commandArgs = args.slice(cmdArgIndex);
                    } else {
                        // No positionals at all — everything is global
                        globalArgs = args;
                        commandArgs = [];
                    }
                } else if (firstPositionalToken) {
                    // Unknown command and no default
                    const available = Object.keys(commandMap).join(', ');
                    throw new Error(
                        `Unknown command '${/** @type {any} */ (firstPositionalToken).value}'. Available commands: ${available}`
                    );
                } else {
                    // No positionals and no default command — no command mode
                    commandName = undefined;
                    commandConfig = undefined;
                    globalArgs = args;
                    commandArgs = [];
                }

                // Validate: check for option name collisions between global and command options
                if (commandConfig?.options) {
                    for (const [name, cmdOpt] of Object.entries(commandConfig.options)) {
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

                // Move flags in commandArgs that are NOT command options back to globalArgs.
                // This ensures that flags added by later middlewares (like --help / --version
                // from the help middleware) and global flags that appear after the command
                // are visible to pass 1, where other middlewares can intercept them.
                if (commandArgs.length > 0 && commandConfig) {
                    const cmdOptionNames = new Set(Object.keys(commandConfig.options ?? {}));
                    // Also build a set of command short flags for matching
                    const cmdShortFlags = new Set();
                    for (const opt of Object.values(commandConfig.options ?? {})) {
                        if (/** @type {any} */ (opt).short) {
                            cmdShortFlags.add(opt.short);
                        }
                    }
                    // Also include global option names and shorts as "known in pass 2"
                    // since global flags after the command will be handled in pass 2.
                    // We only need to move flags that are NEITHER global NOR command options
                    // to globalArgs — those are likely from other middlewares (help, etc.).
                    const globalOptionNames = new Set(Object.keys(globalOptions));
                    const globalShortFlags = new Set();
                    for (const opt of Object.values(globalOptions)) {
                        if (/** @type {any} */ (opt).short) {
                            globalShortFlags.add(/** @type {any} */ (opt).short);
                        }
                    }

                    const filteredCommandArgs = [];
                    const movedToGlobal = [];
                    let i = 0;
                    while (i < commandArgs.length) {
                        const arg = commandArgs[i];
                        if (arg === '--') {
                            // option-terminator: everything after it stays in commandArgs
                            while (i < commandArgs.length) {
                                filteredCommandArgs.push(commandArgs[i]);
                                i++;
                            }
                            break;
                        }
                        if (arg.startsWith('--')) {
                            // Long flag: --name or --name=value
                            const eqIndex = arg.indexOf('=');
                            const flagName = eqIndex >= 0 ? arg.slice(2, eqIndex) : arg.slice(2);
                            if (cmdOptionNames.has(flagName) || globalOptionNames.has(flagName)) {
                                // Known command or global option — keep in commandArgs
                                filteredCommandArgs.push(arg);
                                // If it's a string type without inline value, the next arg is the value
                                if (eqIndex < 0) {
                                    const optDef = commandConfig?.options?.[flagName] || globalOptions[flagName];
                                    if (optDef?.type === 'string') {
                                        i++;
                                        if (i < commandArgs.length) {
                                            filteredCommandArgs.push(commandArgs[i]);
                                        }
                                    }
                                }
                            } else {
                                // Unknown flag — move to global for other middlewares
                                movedToGlobal.push(arg);
                                // Peek: if next arg doesn't start with '-', it might be a value
                                // But since we don't know the type (it's unknown), treat as boolean
                                // and leave the next arg. This is safe because --help / --version
                                // are boolean flags, which is the primary use case.
                            }
                        } else if (arg.startsWith('-') && arg.length > 1) {
                            // Short flag(s): -D or -Dr etc.
                            // Check if ALL characters are known command or global shorts
                            const chars = arg.slice(1);
                            let allKnown = true;
                            for (const ch of chars) {
                                if (!cmdShortFlags.has(ch) && !globalShortFlags.has(ch)) {
                                    allKnown = false;
                                    break;
                                }
                            }
                            if (allKnown) {
                                filteredCommandArgs.push(arg);
                                // If the last char is a string-type short, consume next arg as value
                                const lastChar = chars[chars.length - 1];
                                if (chars.length === 1) {
                                    // Find the option for this short flag
                                    let optDef;
                                    for (const opt of Object.values(commandConfig.options ?? {})) {
                                        if (opt.short === lastChar) {
                                            optDef = opt;
                                            break;
                                        }
                                    }
                                    if (!optDef) {
                                        for (const opt of Object.values(globalOptions)) {
                                            if (/** @type {any} */ (opt).short === lastChar) {
                                                optDef = /** @type {any} */ (opt);
                                                break;
                                            }
                                        }
                                    }
                                    if (optDef && optDef.type === 'string') {
                                        i++;
                                        if (i < commandArgs.length) {
                                            filteredCommandArgs.push(commandArgs[i]);
                                        }
                                    }
                                }
                            } else {
                                // Contains unknown short flags — move entire group to global
                                movedToGlobal.push(arg);
                            }
                        } else {
                            // Positional argument — keep in commandArgs
                            filteredCommandArgs.push(arg);
                        }
                        i++;
                    }

                    if (movedToGlobal.length > 0) {
                        // eslint-disable-line
                        commandArgs = filteredCommandArgs;
                        globalArgs = globalArgs.concat(movedToGlobal);
                    }
                }

                // Stash command state on the config for cross-middleware communication
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
                    // Keep strict as-is (default true) for global args
                };
            },

            // [1] transformResult
            (
                /** @type {{ values: Record<string, any>; positionals: string[]; tokens?: import('./types.d.ts').Token[] }} */ result,
                /** @type {import('./types.d.ts').ParseArgsPlusConfig} */ originalConfig
            ) => {
                const state = /** @type {any} */ (originalConfig)[kCommandState];
                if (!state) {
                    return result;
                }

                const { commandName, commandArgs, commandConfig } = state;

                // If no command was resolved (no positionals, no default), pass through
                if (!commandName || !commandConfig) {
                    return { ...result, command: undefined };
                }

                const globalOptions = originalConfig.options ?? {};
                const commandOptions = commandConfig.options ?? {};

                // Merge global + command options for pass 2
                // Command options take precedence (same name, same type — validated in transformConfig)
                const mergedOptions = { ...globalOptions, ...commandOptions };

                // Pass 2: parse command-specific args
                const pass2 = parseArgs({
                    args: commandArgs,
                    strict: originalConfig.strict ?? true,
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
        { order: -10 }
    )
);
