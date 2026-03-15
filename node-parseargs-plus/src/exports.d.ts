import type {
    MergeMiddlewareConfigExts,
    MergeMiddlewareOptionExts,
    Middleware,
    ParseArgsPlusConfig,
    ParseArgsPlusConfigWithMiddleware,
    ParseArgsPlusResult,
    ParseArgsPlusResultFromExtended,
    ValidateCommandOptionTypes,
} from './types.d.ts';

/**
 * Symbol used for cross-middleware communication of resolved command state.
 * The commands middleware stashes a {@link CommandState} on the config object
 * under this key during `transformConfig`, making it available to other
 * middlewares (e.g. help) regardless of middleware ordering.
 */
export declare const kCommandState: typeof import('./types.d.ts').kCommandState;

/**
 * Enhanced wrapper around Node.js `util.parseArgs` with strong config-driven
 * typings and middleware support.
 *
 * @example
 * ```ts
 * import { parseArgsPlus } from '@niceties/node-parseargs-plus';
 * import { help } from '@niceties/node-parseargs-plus/help';
 *
 * const { values } = parseArgsPlus({
 *     name: 'my-cli',
 *     version: '1.0.0',
 *     options: {
 *         name: { type: 'string', default: 'world', description: 'Your name' },
 *         verbose: { type: 'boolean', description: 'Enable verbose output' },
 *     },
 * }, [help]);
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
>(config: T & ValidateCommandOptionTypes<T>, middlewares: M): ParseArgsPlusResultFromExtended<T>;
