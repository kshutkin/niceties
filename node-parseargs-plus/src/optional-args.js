export const kOptionalValue = Symbol.for('parseArgsPlus.optionalValue');

/**
 * Rewrite bare optional-value flags within one option scope. Keep each output
 * argument's original index so injected short-option values cannot move the
 * command boundary.
 * @param {string[]} args
 * @param {Record<string, import('./types.d.ts').OptionConfig> | undefined} options
 * @returns {{ args: string[]; indexes: number[] }}
 */
export function rewriteOptionalArgs(args, options) {
    const names = new Set();
    const shortToLong = new Map();
    for (const [name, option] of Object.entries(options ?? {})) {
        if (option.type === 'string' && /** @type {any} */ (option).optionalValue) names.add(name);
        // Required and boolean aliases must also shadow earlier optional aliases.
        if (option.short) shortToLong.set(option.short, name);
    }

    /** @type {string[]} */
    const rewritten = [];
    /** @type {number[]} */
    const indexes = [];
    /** @param {string} arg @param {number} index */
    function push(arg, index) {
        rewritten.push(arg);
        indexes.push(index);
    }
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--') {
            for (let j = i; j < args.length; j++) push(args[j], j);
            break;
        }
        const next = args[i + 1];
        const hasValue = next !== undefined && (!next.startsWith('-') || next === '-');
        if (arg.startsWith('--') && !arg.includes('=')) {
            const name = arg.slice(2);
            if (name.startsWith('no-') && names.has(name.slice(3))) {
                push(arg, i);
                continue;
            }
            if (names.has(name) && !hasValue) {
                push(`${arg}=`, i);
                continue;
            }
        }
        if (arg.length === 2 && arg[0] === '-' && arg[1] !== '-' && names.has(shortToLong.get(arg[1])) && !hasValue) {
            push(arg, i);
            push('', i);
            continue;
        }
        push(arg, i);
    }
    return { args: rewritten, indexes };
}
