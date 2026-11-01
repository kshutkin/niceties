/**
 * Optional-value middleware that allows string options to be used bare (without a value).
 *
 * When an option is marked with `optionalValue: true`, it can be used as:
 *   --option value   → "value"
 *   --option         → ""  (empty string)
 *   -o value         → "value"
 *   -o               → ""  (empty string)
 *
 * This works by pre-processing the args array before `parseArgs` sees it:
 * - Bare `--option` (long, no `=`) is rewritten to `--option=` (inline empty value)
 * - Bare `-o` (short) is followed by an injected empty string `''`
 *
 * Only applies to options with `type: 'string'` and `optionalValue: true`.
 *
 * Has `transformConfig.order = 7`, so it runs after help (-10), camelCase (5),
 * and customValue (6), but before commands (10). This ensures option keys are
 * already in their final (kebab-case) form, function-typed `type` values have
 * been replaced with `'string'` by customValue (so `optionalValue` can
 * recognise them), and the rewritten args are visible to the commands
 * middleware's discovery parse.
 * Has `transformResult.order = 0` (default), as no result transformation is needed.
 */

import { kOptionalValue, rewriteOptionalArgs } from './optional-args.js';

/** @param {import('./types.d.ts').ParseArgsPlusConfig} config */
function optionalValueTransformConfig(config) {
    if (/** @type {any} */ (config).commands) {
        // Command discovery and both parse scopes must use their own schema.
        return { ...config, [kOptionalValue]: true };
    }
    const rewritten = rewriteOptionalArgs(config.args ?? process.argv.slice(2), config.options);
    return { ...config, args: rewritten.args };
}
optionalValueTransformConfig.order = 7;

/**
 * @param {{ values: Record<string, any>; positionals: string[]; tokens?: import('./types.d.ts').Token[] }} result
 * @param {import('./types.d.ts').ParseArgsPlusConfig} _config
 */
function optionalValueTransformResult(result, _config) {
    return result;
}

export const optionalValue = /** @type {any} */ ([optionalValueTransformConfig, optionalValueTransformResult]);
