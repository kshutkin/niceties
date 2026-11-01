export const kTokenState = Symbol.for('parseArgsPlus.tokenState');

/**
 * Restore indexes relative to the caller's args, before optional-value rewriting
 * and command slicing. A rewritten bare long flag did not have an inline value.
 * @param {import('./types.d.ts').Token[]} tokens
 * @param {string[]} args Original args within this scope.
 * @param {number[] | undefined} indexes Rewritten index to original scope index.
 * @param {number} [offset] Scope start in the full args array.
 * @returns {import('./types.d.ts').Token[]}
 */
export function remapTokens(tokens, args, indexes, offset = 0) {
    return tokens.map(token => {
        const index = indexes?.[token.index] ?? token.index;
        const mapped = { ...token, index: index + offset };
        if (mapped.kind === 'option' && mapped.inlineValue && mapped.rawName.startsWith('--') && !args[index].includes('=')) {
            mapped.inlineValue = false;
        }
        return mapped;
    });
}
