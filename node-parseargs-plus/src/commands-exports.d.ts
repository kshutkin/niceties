import type { CommandsConfigExtension, CommandsOptionExtension, Middleware } from './types.d.ts';

/**
 * Commands middleware that adds subcommand support.
 *
 * The middleware uses a two-pass parsing strategy to support per-command
 * options. It resolves the command from the first positional argument,
 * then splits args at the command boundary: args before the command go to
 * pass 1 (global parse), args after go to pass 2 (parsed with merged
 * global + command options).
 *
 * The `commands` config extension requires a `commands` map and optionally
 * a `defaultCommand` to use when no command is specified.
 *
 * Has `configOrder: 10`, so `transformConfig` runs after other middlewares
 * (e.g. help adds `--help`/`--version` to global options first).
 * Has `resultOrder: 10`, so `transformResult` runs late (does pass-2 parsing last).
 */
export declare const commands: Middleware<CommandsOptionExtension, CommandsConfigExtension>;
