import type {
    HelpConfigExtension,
    HelpOptionExtension,
    MergeMiddlewareConfigExts,
    MergeMiddlewareOptionExts,
    Middleware,
    ParseArgsPlusConfig,
    ParseArgsPlusConfigWithMiddleware,
    ParseArgsPlusResult,
    ParseArgsPlusResultFromExtended,
} from './types.d.ts';

/**
 * Help middleware that adds `--help` (`-h`) and `--version` (`-v`) flag support.
 *
 * When `--help` is passed, the middleware prints usage information
 * derived from option `description` fields, then calls `process.exit(0)`.
 * When `--version` is passed,
 * it prints the version string and exits with code 0.
 * The `help` and `version` flags are removed from the returned `values`.
 */
export declare const helpMiddleware: Middleware<HelpOptionExtension, HelpConfigExtension>;

/**
 * Enhanced wrapper around Node.js `util.parseArgs` with strong config-driven
 * typings and middleware support.
 *
 * @example
 * ```ts
 * import { parseArgsPlus, helpMiddleware } from '@niceties/node-parseargs-plus';
 *
 * const { values } = parseArgsPlus({
 *     name: 'my-cli',
 *     version: '1.0.0',
 *     options: {
 *         name: { type: 'string', default: 'world', description: 'Your name' },
 *         verbose: { type: 'boolean', description: 'Enable verbose output' },
 *     },
 * }, [helpMiddleware]);
 *
 * // values.name    → string          (required – has default)
 * // values.verbose → boolean | undefined (optional – no default)
 * ```
 */
export function parseArgsPlus<const T extends ParseArgsPlusConfig>(config: T): ParseArgsPlusResult<T>;
export function parseArgsPlus<
    // biome-ignore lint/suspicious/noExplicitAny: middleware array accepts any extension type
    const M extends Middleware<any, any>[],
    const T extends ParseArgsPlusConfigWithMiddleware<MergeMiddlewareOptionExts<M>, MergeMiddlewareConfigExts<M>>,
>(config: T, middlewares: M): ParseArgsPlusResultFromExtended<T>;
