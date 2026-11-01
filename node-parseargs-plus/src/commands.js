import { parseArgs } from 'node:util';

import { kOptionalValue, rewriteOptionalArgs } from './optional-args.js';
import { kTokenState, remapTokens } from './tokens.js';

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
 * @param {boolean} optionalValues
 * @returns {{ commandName: string | undefined; commandConfig: import('./types.d.ts').CommandConfig | undefined; cmdIndex: number }}
 */
function resolveCommand(args, commandMap, globalOptions, defaultCommand, optionalValues) {
    // Discovery parse: strict:false so unknown (command-specific) flags don't throw.
    // Global options are declared so that global string options consume their values
    // and don't swallow the command positional.
    const discoveryArgs = optionalValues ? rewriteOptionalArgs(args, globalOptions) : undefined;
    const discovery = parseArgs({
        args: discoveryArgs?.args ?? args,
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
            cmdIndex: discoveryArgs ? discoveryArgs.indexes[firstPositionalToken.index] : firstPositionalToken.index,
        };
    }

    if (defaultCommand && defaultCommand in commandMap) {
        return {
            commandName: defaultCommand,
            commandConfig: commandMap[defaultCommand],
            // -1 signals "no explicit command positional to skip"
            cmdIndex: -1,
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

/** @param {import('./types.d.ts').ParseArgsPlusConfig & { args: string[] }} config */
function commandsTransformConfig(config) {
    const extConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').CommandsConfigExtension} */ (config);
    const commandMap = extConfig.commands;
    if (!commandMap) {
        return config;
    }

    const { args } = config;
    const globalOptions = config.options ?? {};
    const optionalValues = /** @type {any} */ (config)[kOptionalValue] === true;

    const { commandName, commandConfig, cmdIndex } = resolveCommand(
        args,
        commandMap,
        globalOptions,
        extConfig.defaultCommand,
        optionalValues
    );

    /** @type {string[]} */
    let globalArgs;
    /** @type {string[]} */
    let commandArgs;

    if (!commandName || !commandConfig) {
        // No command resolved
        globalArgs = args;
        commandArgs = [];
    } else if (cmdIndex === -1) {
        // An implicit command owns the entire argument list, including flags
        // before its first positional. Parse it with the merged option schema.
        globalArgs = [];
        commandArgs = args;
    } else {
        // Split at the command boundary: everything before goes to pass 1,
        // everything after goes to pass 2 (with merged options)
        globalArgs = args.slice(0, cmdIndex);
        commandArgs = args.slice(cmdIndex + 1);
    }

    const originalGlobalArgs = globalArgs;
    const originalCommandArgs = commandArgs;
    const rewrittenGlobal = optionalValues ? rewriteOptionalArgs(globalArgs, globalOptions) : undefined;
    const rewrittenCommand = optionalValues ? rewriteOptionalArgs(commandArgs, { ...globalOptions, ...commandConfig?.options }) : undefined;
    globalArgs = rewrittenGlobal?.args ?? globalArgs;
    commandArgs = rewrittenCommand?.args ?? commandArgs;

    // Stash command state for cross-middleware communication
    /** @type {any} */ (config)[kCommandState] = {
        commandName,
        commandArgs,
        commandConfig,
        tokensRequested: config.tokens ?? false,
        cmdIndex,
        originalCommandArgs,
        commandIndexes: rewrittenCommand?.indexes,
    };

    // Rewrite config for pass 1: global args only
    return {
        ...config,
        args: globalArgs,
        allowPositionals: false,
        // Tokens distinguish explicit flags from defaults during the merge.
        tokens: commandName ? true : config.tokens,
        [kTokenState]: { args: originalGlobalArgs, indexes: rewrittenGlobal?.indexes },
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

    const { commandName, commandArgs, commandConfig, tokensRequested, cmdIndex, originalCommandArgs, commandIndexes } = state;

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
        tokens: true,
        strict: config.strict ?? true,
        allowPositionals,
        allowNegative,
        options: /** @type {any} */ (mergedOptions),
    });

    // Defaults lose to explicit flags on either side of the command. When both
    // passes supply an explicit value, the later command-scope value wins.
    const mergedValues = { ...result.values, ...pass2.values };
    const explicitAfter = new Set(pass2.tokens.filter(token => token.kind === 'option').map(token => token.name));
    for (const token of result.tokens ?? []) {
        if (token.kind === 'option' && !explicitAfter.has(token.name)) {
            mergedValues[token.name] = result.values[token.name];
        }
    }

    return {
        values: mergedValues,
        positionals: pass2.positionals,
        command: commandName,
        ...(tokensRequested
            ? {
                  tokens: [
                      ...(result.tokens ?? []),
                      ...(cmdIndex >= 0 ? [{ kind: 'positional', index: cmdIndex, value: commandName }] : []),
                      ...remapTokens(pass2.tokens, originalCommandArgs, commandIndexes, cmdIndex < 0 ? 0 : cmdIndex + 1),
                  ],
              }
            : {}),
    };
}
commandsTransformResult.order = 10;

export const commands = /** @type {any} */ ([commandsTransformConfig, commandsTransformResult]);
