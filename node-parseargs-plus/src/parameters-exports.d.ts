import type { Middleware, ParametersConfigExtension, ParametersOptionExtension, ParametersResultExtension } from './types.d.ts';

/**
 * Parameters middleware that adds typed positional parameter support.
 *
 * The middleware parses positional arguments according to parameter definitions
 * like `<name>` (required), `[name]` (optional), `<names...>` (required spread),
 * and `[names...]` (optional spread).
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
 * Has `resultOrder: 5`, so `transformResult` runs after default middlewares
 * but before commands (10) and help (20).
 */
export declare const parameters: Middleware<ParametersOptionExtension, ParametersConfigExtension, ParametersResultExtension>;
