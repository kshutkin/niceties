import type { Middleware } from './types.d.ts';

/**
 * CamelCase middleware that bridges camelCase JS option keys and kebab-case CLI flags.
 *
 * Users define options with camelCase keys (e.g. `saveDev`, `outputDir`).
 * The middleware converts them to kebab-case for `parseArgs` (e.g. `--save-dev`,
 * `--output-dir`), and converts the result values back to camelCase.
 *
 * Single-word keys pass through unchanged (`verbose` stays `verbose`).
 * Consecutive uppercase letters (acronyms) are handled correctly:
 * - `enableSSR` → `--enable-ssr`
 * - `useHTTPSProxy` → `--use-https-proxy`
 *
 * When used with the commands middleware, command-level option keys are also
 * converted. Command names themselves are not converted.
 *
 * Tokens are a low-level API and are not converted — `token.name` retains
 * the kebab-case form produced by `parseArgs`.
 *
 * Has `transformConfig.order = 5`, so it runs after help (-10) but before
 * commands (10).
 * Has `transformResult.order = 15`, so it runs after commands (10) but before
 * help (20).
 */
export declare const camelCase: Middleware;
