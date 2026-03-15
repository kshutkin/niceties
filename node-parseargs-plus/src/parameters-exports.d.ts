import type { Middleware, ParametersConfigExtension, ParametersOptionExtension, ParametersResultExtension } from './types.d.ts';

/**
 * Parameters middleware that adds typed positional parameter support.
 *
 * The middleware parses positional arguments according to parameter definitions
 * like `<name>` (required), `[name]` (optional), `<names...>` (required spread),
 * and `[names...]` (optional spread).
 *
 * Parameters can be defined at the top level or per-command when used with the
 * commands middleware. When a command is resolved, the command's `parameters`
 * definition is used instead of the top-level one.
 *
 * Parameter names are converted to camelCase in the result object:
 * - `<package name>` → `parameters.packageName: string`
 * - `[save-dev]` → `parameters.saveDev?: string`
 * - `<files...>` → `parameters.files: string[]`
 * - `[extras...]` → `parameters.extras?: string[]`
 *
 * Validation rules (enforced at both type and runtime level):
 * - Required parameters (`<>`) must come before optional ones (`[]`)
 * - At most one spread parameter (`...`) is allowed
 * - Spread parameter must be the last parameter
 *
 * Has `configOrder: 0` (default), so `transformConfig` runs at normal priority.
 * Has `resultOrder: 15`, so `transformResult` runs after commands (10)
 * but before help (20).
 */
export declare const parameters: Middleware<ParametersOptionExtension, ParametersConfigExtension, ParametersResultExtension>;
