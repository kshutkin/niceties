import type { Middleware, OptionalValueOptionExtension } from './types.d.ts';

/**
 * Optional-value middleware that allows string options to be used bare (without a value).
 *
 * When an option is marked with `optionalValue: true`, it can be used as:
 *   `--option value`   → `"value"`
 *   `--option`         → `""` (empty string)
 *   `-o value`         → `"value"`
 *   `-o`               → `""` (empty string)
 *
 * This works by pre-processing the args array before `parseArgs` sees it:
 * - Bare `--option` (long, no `=`) is rewritten to `--option=` (inline empty value)
 * - Bare `-o` (short) is followed by an injected empty string `''`
 *
 * Only applies to options with `type: 'string'` and `optionalValue: true`.
 * Works with both single and `multiple: true` string options.
 *
 * When used with the commands middleware, command-level options with
 * `optionalValue: true` are also handled — the args are rewritten before
 * command resolution occurs.
 *
 * Has `transformConfig.order = 6`, so it runs after help (-10) and camelCase (5)
 * but before commands (10), ensuring option keys are already in their final
 * (kebab-case) form when args are rewritten, and that the rewritten args are
 * visible to the commands middleware's discovery parse.
 * Has `transformResult.order = 0` (default), as no result transformation is needed.
 */
export declare const optionalValue: Middleware<OptionalValueOptionExtension>;
