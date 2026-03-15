import { whiteBright } from '@niceties/ansi';

/**
 * Symbol used to read resolved command state from the config object,
 * set by the commands middleware during transformConfig.
 */
const kCommandState = Symbol.for('parseArgsPlus.commandState');

/**
 * Help middleware that adds --help/-h and --version/-v flag support.
 * When --help is passed, it prints usage information (based on option descriptions)
 * and exits with code 0. When --version is passed, it prints the version and exits
 * with code 0. The help and version flags are removed from the returned values.
 *
 * When used alongside the commands middleware, it renders command-specific help
 * when a command is active, or a global help with a command list when no command
 * is specified.
 *
 * Has order: 10, so transformConfig runs after other middlewares (e.g. commands)
 * and transformResult runs before them (first in reverse order).
 *
 * @type {import('./types.d.ts').Middleware<import('./types.d.ts').HelpOptionExtension, import('./types.d.ts').HelpConfigExtension>}
 */
export const help = /** @type {any} */ (
    Object.assign(
        [
            // [0] transformConfig
            (/** @type {import('./types.d.ts').ParseArgsPlusConfig} */ config) => {
                return {
                    ...config,
                    options: {
                        ...config.options,
                        help: { type: 'boolean', short: 'h' },
                        version: { type: 'boolean', short: 'v' },
                    },
                };
            },

            // [1] transformResult
            (
                /** @type {{ values: Record<string, any>; positionals: string[]; tokens?: import('./types.d.ts').Token[] }} */ result,
                /** @type {import('./types.d.ts').ParseArgsPlusConfig} */ originalConfig
            ) => {
                const extConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').HelpConfigExtension} */ (
                    originalConfig
                );
                if (result.values.version) {
                    console.log(extConfig.version);
                    process.exit(0);
                }
                if (result.values.help) {
                    const commandState = /** @type {any} */ (originalConfig)[kCommandState];
                    const commands = /** @type {any} */ (originalConfig).commands;

                    if (commands && commandState?.commandName && commandState.commandConfig) {
                        // Command-specific help
                        printCommandHelp(extConfig, commandState.commandName, commandState.commandConfig, commands);
                    } else if (commands) {
                        // Global help with command list
                        printGlobalHelpWithCommands(extConfig, commands);
                    } else {
                        // No commands — original help behavior
                        printHelp(extConfig);
                    }
                    process.exit(0);
                }
                return result;
            },
        ],
        { order: 10 }
    )
);

/**
 * Builds the options text block for the help output.
 * @param {Record<string, import('./types.d.ts').OptionConfig & { description?: string }>} options
 * @param {boolean} [includeHelpVersion] Whether to include --help and --version in the output.
 * @returns {string[]}
 */
function buildOptionsText(options, includeHelpVersion = true) {
    /** @type {{ flags: string; description: string }[]} */
    const rows = [];
    let maxFlagsLen = 0;

    const allOptions = /** @type {Record<string, any>} */ (
        includeHelpVersion
            ? {
                  ...options,
                  help: { type: 'boolean', short: 'h', description: 'Show this help message' },
                  version: { type: 'boolean', short: 'v', description: 'Show version number' },
              }
            : { ...options }
    );

    for (const [name, opt] of Object.entries(allOptions)) {
        const shortPart = opt.short ? `-${opt.short}, ` : '    ';
        const typeSuffix = opt.type === 'string' ? ' <value>' : '';
        const flags = `  ${shortPart}--${name}${typeSuffix}`;
        const description = /** @type {string} */ (/** @type {any} */ (opt).description) || '';
        if (flags.length > maxFlagsLen) {
            maxFlagsLen = flags.length;
        }
        rows.push({ flags, description });
    }

    /** @type {string[]} */
    const lines = [];
    for (const row of rows) {
        const padding = ' '.repeat(maxFlagsLen - row.flags.length + 2);
        if (row.description) {
            lines.push(`${row.flags}${padding}${row.description}`);
        } else {
            lines.push(row.flags);
        }
    }

    return lines;
}

/**
 * Builds a commands list text block for the help output.
 * @param {Record<string, import('./types.d.ts').CommandConfig>} commands
 * @returns {string[]}
 */
function buildCommandsText(commands) {
    /** @type {{ name: string; description: string }[]} */
    const rows = [];
    let maxNameLen = 0;

    for (const [name, cmd] of Object.entries(commands)) {
        const description = cmd.description || '';
        if (name.length > maxNameLen) {
            maxNameLen = name.length;
        }
        rows.push({ name, description });
    }

    /** @type {string[]} */
    const lines = [];
    for (const row of rows) {
        const padding = ' '.repeat(maxNameLen - row.name.length + 2);
        if (row.description) {
            lines.push(`  ${row.name}${padding}${row.description}`);
        } else {
            lines.push(`  ${row.name}`);
        }
    }

    return lines;
}

/**
 * Prints a section: title in bright white, then body lines indented.
 * @param {{ title: string; text?: string | string[] }} section
 */
function printSection(section) {
    console.log(whiteBright(`${section.title}:`));
    if (section.text != null) {
        const lines = Array.isArray(section.text) ? section.text : [section.text];
        for (const line of lines) {
            console.log(`  ${line}`);
        }
    }
    console.log('');
}

/**
 * Collects, merges, sorts, and prints sections.
 * @param {Record<string, { title: string; text?: string | string[]; order: number }>} sections
 * @param {Record<string, import('./types.d.ts').HelpSection> | undefined} userSections
 */
function printSections(sections, userSections) {
    // Merge in any user-defined custom sections (non-standard ids)
    if (userSections) {
        for (const [id, section] of Object.entries(userSections)) {
            if (id in sections) {
                continue; // already merged
            }
            sections[id] = {
                title: section.title,
                text: section.text,
                order: section.order ?? 2,
            };
        }
    }

    // Sort sections by order, then by insertion order for equal orders
    const sortedEntries = Object.entries(sections).sort((a, b) => a[1].order - b[1].order);

    for (const [, section] of sortedEntries) {
        printSection(section);
    }
}

/**
 * Prints help text based on the original config's options and their descriptions.
 * This is the original help output when no commands are configured.
 * @param {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').HelpConfigExtension} config
 */
function printHelp(config) {
    const userSections = config.helpSections || {};

    console.log(`${config.name} v${config.version}\n`);

    if (config.description) {
        console.log(config.description, '\n');
    }

    const options = /** @type {Record<string, import('./types.d.ts').OptionConfig & { description?: string }>} */ (config.options) || {};

    // Build the default sections keyed by id
    /** @type {Record<string, { title: string; text?: string | string[]; order: number }>} */
    const sections = {};

    // Usage section (order 0)
    const usageOverride = userSections['usage'];
    sections['usage'] = {
        title: usageOverride?.title ?? 'Usage',
        text: usageOverride?.text ?? `${config.name} [options]${config.allowPositionals ? ' [arguments]' : ''}`,
        order: usageOverride?.order ?? 0,
    };

    // Options section (order 1)
    const optionsOverride = userSections['options'];
    sections['options'] = {
        title: optionsOverride?.title ?? 'Options',
        text: optionsOverride?.text ?? buildOptionsText(options),
        order: optionsOverride?.order ?? 1,
    };

    printSections(sections, userSections);
}

/**
 * Prints global help text that includes a list of available commands.
 * @param {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').HelpConfigExtension} config
 * @param {Record<string, import('./types.d.ts').CommandConfig>} commands
 */
function printGlobalHelpWithCommands(config, commands) {
    const userSections = config.helpSections || {};

    console.log(`${config.name} v${config.version}\n`);

    if (config.description) {
        console.log(config.description, '\n');
    }

    const options = /** @type {Record<string, import('./types.d.ts').OptionConfig & { description?: string }>} */ (config.options) || {};

    /** @type {Record<string, { title: string; text?: string | string[]; order: number }>} */
    const sections = {};

    // Usage section (order 0)
    const usageOverride = userSections['usage'];
    sections['usage'] = {
        title: usageOverride?.title ?? 'Usage',
        text: usageOverride?.text ?? `${config.name} [options] <command> [command-options]`,
        order: usageOverride?.order ?? 0,
    };

    // Commands section (order 1)
    const commandsOverride = userSections['commands'];
    sections['commands'] = {
        title: commandsOverride?.title ?? 'Commands',
        text: commandsOverride?.text ?? buildCommandsText(commands),
        order: commandsOverride?.order ?? 1,
    };

    // Global options section (order 2)
    const optionsOverride = userSections['options'];
    sections['options'] = {
        title: optionsOverride?.title ?? 'Global Options',
        text: optionsOverride?.text ?? buildOptionsText(options),
        order: optionsOverride?.order ?? 2,
    };

    printSections(sections, userSections);
}

/**
 * Prints command-specific help text showing the command's options and global options.
 * @param {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').HelpConfigExtension} config
 * @param {string} commandName
 * @param {import('./types.d.ts').CommandConfig} commandConfig
 * @param {Record<string, import('./types.d.ts').CommandConfig>} _commands
 */
function printCommandHelp(config, commandName, commandConfig, _commands) {
    const userSections = config.helpSections || {};

    console.log(`${config.name} ${commandName}\n`);

    if (commandConfig.description) {
        console.log(commandConfig.description, '\n');
    }

    const globalOptions =
        /** @type {Record<string, import('./types.d.ts').OptionConfig & { description?: string }>} */ (config.options) || {};
    const commandOptions =
        /** @type {Record<string, import('./types.d.ts').OptionConfig & { description?: string }>} */ (commandConfig.options) || {};

    /** @type {Record<string, { title: string; text?: string | string[]; order: number }>} */
    const sections = {};

    // Usage section (order 0)
    const usageOverride = userSections['usage'];
    sections['usage'] = {
        title: usageOverride?.title ?? 'Usage',
        text: usageOverride?.text ?? `${config.name} ${commandName} [options]${commandConfig.allowPositionals ? ' [arguments]' : ''}`,
        order: usageOverride?.order ?? 0,
    };

    // Command options section (order 1) — only if the command has options
    if (Object.keys(commandOptions).length > 0) {
        const cmdOptionsOverride = userSections['command-options'];
        sections['command-options'] = {
            title: cmdOptionsOverride?.title ?? 'Options',
            text: cmdOptionsOverride?.text ?? buildOptionsText(commandOptions, false),
            order: cmdOptionsOverride?.order ?? 1,
        };
    }

    // Global options section (order 2)
    const optionsOverride = userSections['options'];
    sections['options'] = {
        title: optionsOverride?.title ?? 'Global Options',
        text: optionsOverride?.text ?? buildOptionsText(globalOptions),
        order: optionsOverride?.order ?? 2,
    };

    printSections(sections, userSections);
}
