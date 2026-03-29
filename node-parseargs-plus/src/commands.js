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
 * Commands middleware that adds subcommand support.
 *
 * Uses a two-pass parsing strategy:
 * - Pass 1 (in transformConfig): discovery parse with `strict: false` to find
 *   the command name, then splits args at the command boundary.
 *   Args before the command go to pass 1 (global parse).
 *   Args after the command go to pass 2 (command parse with merged options).
 * - Pass 2 (in transformResult): parses the command-specific args with the
 *   merged global + command options.
 *
 * Each transform function carries `order: 10`, so transformConfig runs after
 * other middlewares (e.g. help adds --help/--version to global options first)
 * and transformResult runs late (does pass-2 parsing last).
 *
 * @type {import('./types.d.ts').Middleware<import('./types.d.ts').CommandsOptionExtension, import('./types.d.ts').CommandsConfigExtension>}
 */

/** @param {import('./types.d.ts').ParseArgsPlusConfig} config */
function commandsTransformConfig(config) {
    const extConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').CommandsConfigExtension} */ (config);
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

        // Split at the command boundary: everything before goes to pass 1,
        // everything after goes to pass 2 (with merged options)
        globalArgs = args.slice(0, cmdIndex);
        commandArgs = isExplicitCommand ? args.slice(cmdIndex + 1) : args.slice(cmdIndex);
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
}
commandsTransformConfig.order = 10;

/**
 * @param {{ values: Record<string, any>; positionals: string[]; tokens?: import('./types.d.ts').Token[] }} result
 * @param {import('./types.d.ts').ParseArgsPlusConfig} config
 */
function commandsTransformResult(result, config) {
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
    // Command options take precedence (same name, same type — validated at the type level)
    const mergedOptions = { ...globalOptions, ...commandOptions };

    // Pass 2: parse command-specific args with merged options
    // Enable positionals if the command explicitly allows them or has parameters defined
    const hasParameters = Array.isArray(commandConfig.parameters) && commandConfig.parameters.length > 0;
    const allowPositionals = hasParameters || commandConfig.allowPositionals || false;

    // allowNegative: command-level override takes precedence, then global config
    const allowNegative = commandConfig.allowNegative ?? config.allowNegative ?? false;

    const pass2 = parseArgs({
        args: commandArgs,
        strict: config.strict ?? true,
        allowPositionals,
        allowNegative,
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
}
commandsTransformResult.order = 10;

export const commands = /** @type {any} */ ([commandsTransformConfig, commandsTransformResult]);
