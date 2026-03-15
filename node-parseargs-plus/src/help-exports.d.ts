import type { HelpConfigExtension, HelpOptionExtension, Middleware } from './types.d.ts';

/**
 * Help middleware that adds `--help` (`-h`) and `--version` (`-v`) flag support.
 *
 * When `--help` is passed, the middleware prints usage information
 * derived from option `description` fields, then calls `process.exit(0)`.
 * When `--version` is passed,
 * it prints the version string and exits with code 0.
 * The `help` and `version` flags are removed from the returned `values`.
 *
 * Has `configOrder: -10`, so `transformConfig` runs before other middlewares,
 * ensuring `--help`/`--version` are known global options when commands resolves the command.
 * Has `resultOrder: 20`, so `transformResult` runs after the commands middleware
 * merges pass-2 values, ensuring `--help`/`--version` are visible regardless of
 * where they appear on the command line.
 */
export declare const help: Middleware<HelpOptionExtension, HelpConfigExtension>;
