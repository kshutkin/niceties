import process from 'node:process';

import { whiteBright } from '@niceties/ansi';

/**
 * Symbol used to read resolved command state from the config object,
 * set by the commands middleware during transformConfig.
 */
const kCommandState = Symbol.for('parseArgsPlus.commandState');

/**
 * Returns the current terminal width, or undefined if not available (e.g. piped output).
 * @returns {number | undefined}
 */
function getTerminalWidth() {
    return process.stdout?.columns;
}

/**
 * Wraps a single line of text to fit within `width` columns, word-breaking at spaces.
 * The first line is assumed to already occupy `currentCol` columns (i.e. the text
 * starts at that column position). Continuation lines are indented to `indent` columns.
 * If a single word exceeds the available width it is placed on its own line unbroken.
 *
 * When `width` is undefined (no TTY) the text is returned as-is in a single-element array.
 *
 * @param {string} text        The text to wrap.
 * @param {number} indent      Number of columns to indent continuation lines.
 * @param {number | undefined} width  Terminal width (columns), or undefined to skip wrapping.
 * @param {number} [currentCol] Column position where text starts on the first line.
 * @returns {string[]}  Array of lines (without trailing newlines).
 */
function wrapText(text, indent, width, currentCol) {
    if (width == null) {
        return [text];
    }
    if (currentCol == null) {
        currentCol = indent;
    }

    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) {
        return [''];
    }

    /** @type {string[]} */
    const lines = [];
    let line = '';
    let col = currentCol;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (line.length === 0) {
            // First word on this line — always accept it
            line = word;
            col = col + word.length;
        } else if (col + 1 + word.length <= width) {
            // Fits on current line
            // biome-ignore lint/style/useTemplate: optimization
            line += ' ' + word;
            col += 1 + word.length;
        } else {
            // Wrap to next line
            lines.push(line);
            line = word;
            col = indent + word.length;
        }
    }
    if (line.length > 0) {
        lines.push(line);
    }

    return lines;
}

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
 * Has configOrder: -10, so transformConfig runs before other middlewares (e.g. commands),
 * ensuring --help/--version are known global options when commands resolves the command.
 * Has resultOrder: 20, so transformResult runs after the commands middleware merges
 * pass-2 values, ensuring --help/--version are visible regardless of where they
 * appear on the command line.
 *
 * @type {import('./types.d.ts').Middleware<import('./types.d.ts').HelpOptionExtension, import('./types.d.ts').HelpConfigExtension>}
 */
/** @param {import('./types.d.ts').ParseArgsPlusConfig} config */
function helpTransformConfig(config) {
    return {
        ...config,
        options: {
            ...config.options,
            help: { type: 'boolean', short: 'h' },
            version: { type: 'boolean', short: 'v' },
        },
    };
}
helpTransformConfig.order = -10;

/**
 * @param {{ values: Record<string, any>; positionals: string[]; tokens?: import('./types.d.ts').Token[] }} result
 * @param {import('./types.d.ts').ParseArgsPlusConfig} config
 */
function helpTransformResult(result, config) {
    const extConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').HelpConfigExtension} */ (config);
    if (result.values.version) {
        console.log(extConfig.version);
        process.exit(0);
    }
    if (result.values.help) {
        const commandState = /** @type {any} */ (config)[kCommandState];
        const commands = /** @type {any} */ (config).commands;

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
}
helpTransformResult.order = 20;

export const help = /** @type {any} */ ([helpTransformConfig, helpTransformResult]);

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

    const descriptionCol = maxFlagsLen + 2;
    const termWidth = getTerminalWidth();

    /** @type {string[]} */
    const lines = [];
    for (const row of rows) {
        const padding = ' '.repeat(maxFlagsLen - row.flags.length + 2);
        if (row.description) {
            const wrapped = wrapText(row.description, descriptionCol, termWidth, descriptionCol);
            lines.push(`${row.flags}${padding}${wrapped[0]}`);
            for (let i = 1; i < wrapped.length; i++) {
                lines.push(' '.repeat(descriptionCol) + wrapped[i]);
            }
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

    // "  " + name column + gap of 2
    const descriptionCol = 2 + maxNameLen + 2;
    const termWidth = getTerminalWidth();

    /** @type {string[]} */
    const lines = [];
    for (const row of rows) {
        const padding = ' '.repeat(maxNameLen - row.name.length + 2);
        if (row.description) {
            const wrapped = wrapText(row.description, descriptionCol, termWidth, descriptionCol);
            lines.push(`  ${row.name}${padding}${wrapped[0]}`);
            for (let i = 1; i < wrapped.length; i++) {
                lines.push(' '.repeat(descriptionCol) + wrapped[i]);
            }
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
        const textLines = Array.isArray(section.text) ? section.text : [section.text];
        const termWidth = getTerminalWidth();
        const indent = 2;
        for (const line of textLines) {
            // Lines from buildOptionsText / buildCommandsText already have leading
            // spaces and were already wrapped by those builders. Print them as-is.
            if (line.startsWith('  ')) {
                console.log(line);
            } else {
                // Plain section text — wrap with 2-space indent
                const wrapped = wrapText(line, indent, termWidth, indent);
                console.log(`  ${wrapped[0]}`);
                for (let i = 1; i < wrapped.length; i++) {
                    console.log(' '.repeat(indent) + wrapped[i]);
                }
            }
        }
    }
    console.log('');
}

/**
 * Creates a section descriptor, applying user overrides for title, text, and order if present.
 * @param {string} id
 * @param {string} defaultTitle
 * @param {string | string[]} defaultText
 * @param {number} defaultOrder
 * @param {Record<string, import('./types.d.ts').HelpSection>} userSections
 * @returns {{ title: string; text?: string | string[]; order: number }}
 */
function buildSection(id, defaultTitle, defaultText, defaultOrder, userSections) {
    const override = userSections[id];
    return {
        title: override?.title ?? defaultTitle,
        text: override?.text ?? defaultText,
        order: override?.order ?? defaultOrder,
    };
}

/**
 * Unified help renderer. Prints a header line, optional description,
 * then merges default sections with user-defined custom sections and prints them all.
 * @param {string} header
 * @param {string | undefined} description
 * @param {Record<string, { title: string; text?: string | string[]; order: number }>} sections
 * @param {Record<string, import('./types.d.ts').HelpSection>} userSections
 */
function renderHelp(header, description, sections, userSections) {
    console.log(header + '\n');

    if (description) {
        const termWidth = getTerminalWidth();
        const wrapped = wrapText(description, 0, termWidth, 0);
        console.log(wrapped.join('\n'), '\n');
    }

    // Merge in any user-defined custom sections (non-standard ids)
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
    const options = /** @type {Record<string, import('./types.d.ts').OptionConfig & { description?: string }>} */ (config.options);

    renderHelp(
        `${config.name} v${config.version}`,
        config.description,
        {
            usage: buildSection(
                'usage',
                'Usage',
                `${config.name} [options]${config.allowPositionals ? ' [arguments]' : ''}`,
                0,
                userSections
            ),
            options: buildSection('options', 'Options', buildOptionsText(options), 1, userSections),
        },
        userSections
    );
}

/**
 * Prints global help text that includes a list of available commands.
 * @param {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').HelpConfigExtension} config
 * @param {Record<string, import('./types.d.ts').CommandConfig>} commands
 */
function printGlobalHelpWithCommands(config, commands) {
    const userSections = config.helpSections || {};
    const options = /** @type {Record<string, import('./types.d.ts').OptionConfig & { description?: string }>} */ (config.options);

    renderHelp(
        `${config.name} v${config.version}`,
        config.description,
        {
            usage: buildSection('usage', 'Usage', `${config.name} [options] <command> [command-options]`, 0, userSections),
            commands: buildSection('commands', 'Commands', buildCommandsText(commands), 1, userSections),
            options: buildSection('options', 'Global Options', buildOptionsText(options), 2, userSections),
        },
        userSections
    );
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
    const globalOptions = /** @type {Record<string, import('./types.d.ts').OptionConfig & { description?: string }>} */ (config.options);
    const commandOptions =
        /** @type {Record<string, import('./types.d.ts').OptionConfig & { description?: string }>} */ (commandConfig.options) || {};

    /** @type {Record<string, { title: string; text?: string | string[]; order: number }>} */
    const sections = {
        usage: buildSection(
            'usage',
            'Usage',
            `${config.name} ${commandName} [options]${commandConfig.allowPositionals ? ' [arguments]' : ''}`,
            0,
            userSections
        ),
    };

    // Command options section (order 1) — only if the command has options
    if (Object.keys(commandOptions).length > 0) {
        sections['command-options'] = buildSection('command-options', 'Options', buildOptionsText(commandOptions, false), 1, userSections);
    }

    sections['options'] = buildSection('options', 'Global Options', buildOptionsText(globalOptions), 2, userSections);

    renderHelp(`${config.name} ${commandName}`, commandConfig.description, sections, userSections);
}
