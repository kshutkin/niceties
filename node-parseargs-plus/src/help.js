import { whiteBright } from '@niceties/ansi';

/**
 * Help middleware that adds --help/-h and --version/-v flag support.
 * When --help is passed, it prints usage information (based on option descriptions)
 * and exits with code 0. When --version is passed, it prints the version and exits
 * with code 0. The help and version flags are removed from the returned values.
 * @type {import('./types.d.ts').Middleware<import('./types.d.ts').HelpOptionExtension, import('./types.d.ts').HelpConfigExtension>}
 */
export const help = [
    config => {
        return {
            ...config,
            options: {
                ...config.options,
                help: { type: 'boolean', short: 'h' },
                version: { type: 'boolean', short: 'v' },
            },
        };
    },
    (result, originalConfig) => {
        const extConfig = /** @type {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').HelpConfigExtension} */ (
            originalConfig
        );
        if (result.values.version) {
            console.log(extConfig.version);
            process.exit(0);
        }
        if (result.values.help) {
            printHelp(extConfig);
            process.exit(0);
        }
        return result;
    },
];

/**
 * Builds the options text block for the help output.
 * @param {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').HelpConfigExtension} config
 * @returns {string[]}
 */
function buildOptionsText(config) {
    const options = /** @type {Record<string, import('./types.d.ts').OptionConfig & { description?: string }>} */ (config.options) || {};

    /** @type {{ flags: string; description: string }[]} */
    const rows = [];
    let maxFlagsLen = 0;

    // Always include --help and --version in the displayed options
    const allOptions = /** @type {Record<string, any>} */ ({
        ...options,
        help: { type: 'boolean', short: 'h', description: 'Show this help message' },
        version: { type: 'boolean', short: 'v', description: 'Show version number' },
    });

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
 * Prints help text based on the original config's options and their descriptions.
 * @param {import('./types.d.ts').ParseArgsPlusConfig & import('./types.d.ts').HelpConfigExtension} config
 */
function printHelp(config) {
    const userSections = config.helpSections || {};

    console.log(`${config.name} v${config.version}\n`);

    if (config.description) {
        console.log(config.description, '\n');
    }

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
    const optionsText = optionsOverride?.text ?? buildOptionsText(config);
    sections['options'] = {
        title: optionsOverride?.title ?? 'Options',
        text: optionsText,
        order: optionsOverride?.order ?? 1,
    };

    // Merge in any user-defined custom sections (non-standard ids)
    for (const [id, section] of Object.entries(userSections)) {
        if (id === 'usage' || id === 'options') {
            continue; // already merged above
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
