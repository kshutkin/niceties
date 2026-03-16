import type { CustomValueOptionExtension, Middleware } from './types.d.ts';

/**
 * Custom-value middleware that allows option `type` to be a function (constructor).
 *
 * When an option's `type` is set to a function (e.g. `Number`, `JSON.parse`,
 * or any `(value: string) => T`), the middleware:
 * 1. Replaces `type` with `'string'` so `parseArgs` accepts it
 * 2. After parsing, calls the function with the string value to produce the
 *    final transformed value
 *
 * Examples:
 *   `{ type: Number }`            → `--port 8080`      → `8080` (number)
 *   `{ type: JSON.parse }`        → `--data '{"a":1}'` → `{ a: 1 }` (object)
 *   `{ type: v => v.split(',') }` → `--tags a,b,c`     → `['a','b','c']` (array)
 *
 * Works with `multiple: true` — each occurrence is individually transformed.
 * Works with `default` — default string values ARE transformed, since `parseArgs`
 * places them in `values` indistinguishably from CLI-provided values. If you need
 * an already-typed default, set `default` to the final value and handle the type
 * mismatch externally.
 *
 * When used with the commands middleware, command-level options with function
 * `type` are also handled — the functions are extracted before command
 * resolution occurs.
 *
 * When used with the camelCase middleware, option keys are already in
 * kebab-case form during config transformation and the transform map
 * uses kebab-case keys accordingly.
 *
 * Has `transformConfig.order = 7`, so it runs after help (-10), camelCase (5),
 * and optionalValue (6), but before commands (10).
 * Has `transformResult.order = 12`, so it runs after commands (10) but before
 * camelCase (15) and help (20).
 */
export declare const customValue: Middleware<CustomValueOptionExtension>;
