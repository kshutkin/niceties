import type { CommandsConfigExtension, CommandsOptionExtension, Middleware } from './types.d.ts';

/**
 * Commands middleware that adds subcommand support.
 *
 * The middleware uses a two-pass parsing strategy to support per-command
 * options. It resolves the command from the first positional argument,
 * then parses command-specific args with the command's own options.
 *
 * The `commands` config extension requires a `commands` map and optionally
 * a `defaultCommand` to use when no command is specified.
 *
 * The middleware has `order: -10`, so it runs before other middlewares
 * in `transformConfig` and after them in `transformResult`.
 */
export declare const commands: Middleware<CommandsOptionExtension, CommandsConfigExtension>;
