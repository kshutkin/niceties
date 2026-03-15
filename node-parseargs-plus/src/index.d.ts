import type { Middleware, ParseArgsPlusConfig, ParseArgsPlusResultBase, Token } from './types.d.ts';

export declare function parseArgsPlus(
    config: ParseArgsPlusConfig,
    // biome-ignore lint/suspicious/noExplicitAny: middleware array accepts any extension type
    middlewares?: Middleware<any, any>[]
): ParseArgsPlusResultBase & { tokens?: Token[] };
