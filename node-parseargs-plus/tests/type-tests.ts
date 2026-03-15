import { parseArgsPlus } from '@niceties/node-parseargs-plus';
import { commands } from '@niceties/node-parseargs-plus/commands';
import { help } from '@niceties/node-parseargs-plus/help';

// Helper: assert that two types are exactly equal
type IsExact<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
type Assert<T extends true> = T;

// 1. String option without default → optional string
const r1 = parseArgsPlus({
    options: {
        name: { type: 'string' },
    },
});
type _1 = Assert<IsExact<typeof r1.values.name, string | undefined>>;

// 2. String option with default → required string
const r2 = parseArgsPlus({
    options: {
        name: { type: 'string', default: 'world' },
    },
});
type _2 = Assert<IsExact<typeof r2.values.name, string>>;

// 3. Boolean option without default → optional boolean
const r3 = parseArgsPlus({
    options: {
        verbose: { type: 'boolean' },
    },
});
type _3 = Assert<IsExact<typeof r3.values.verbose, boolean | undefined>>;

// 4. Boolean option with default → required boolean
const r4 = parseArgsPlus({
    options: {
        verbose: { type: 'boolean', default: false },
    },
});
type _4 = Assert<IsExact<typeof r4.values.verbose, boolean>>;

// 5. String option with multiple → optional string[]
const r5 = parseArgsPlus({
    options: {
        files: { type: 'string', multiple: true },
    },
});
type _5 = Assert<IsExact<typeof r5.values.files, string[] | undefined>>;

// 6. String option with multiple and default → required string[]
const r6 = parseArgsPlus({
    options: {
        files: { type: 'string', multiple: true, default: ['a.txt'] },
    },
});
type _6 = Assert<IsExact<typeof r6.values.files, string[]>>;

// 7. Boolean option with multiple → optional boolean[]
const r7 = parseArgsPlus({
    options: {
        flags: { type: 'boolean', multiple: true },
    },
});
type _7 = Assert<IsExact<typeof r7.values.flags, boolean[] | undefined>>;

// 8. Boolean option with multiple and default → required boolean[]
const r8 = parseArgsPlus({
    options: {
        flags: { type: 'boolean', multiple: true, default: [true] },
    },
});
type _8 = Assert<IsExact<typeof r8.values.flags, boolean[]>>;

// 9. Mixed options: some required, some optional
const r9 = parseArgsPlus({
    options: {
        name: { type: 'string', default: 'world' },
        verbose: { type: 'boolean' },
        files: { type: 'string', multiple: true, default: [] as string[] },
        debug: { type: 'boolean', multiple: true },
    },
});
type _9a = Assert<IsExact<typeof r9.values.name, string>>;
type _9b = Assert<IsExact<typeof r9.values.verbose, boolean | undefined>>;
type _9c = Assert<IsExact<typeof r9.values.files, string[]>>;
type _9d = Assert<IsExact<typeof r9.values.debug, boolean[] | undefined>>;

// 10. Positionals are always string[]
type _10 = Assert<IsExact<typeof r9.positionals, string[]>>;

// 11. tokens: true → tokens property present
const r11 = parseArgsPlus({
    options: {
        name: { type: 'string' },
    },
    tokens: true,
});
type _11a = Assert<IsExact<typeof r11.values.name, string | undefined>>;
// tokens should exist
type _11b = Assert<'tokens' extends keyof typeof r11 ? true : false>;

// 12. tokens: false or absent → no tokens property
const r12 = parseArgsPlus({
    options: {
        name: { type: 'string' },
    },
});
type _12 = Assert<'tokens' extends keyof typeof r12 ? false : true>;

// 13. No options provided → base result
const r13 = parseArgsPlus({});
type _13 = Assert<IsExact<typeof r13.positionals, string[]>>;

// 14. Short alias doesn't affect value type
const r14 = parseArgsPlus({
    options: {
        verbose: { type: 'boolean', short: 'v' },
    },
});
type _14 = Assert<IsExact<typeof r14.values.verbose, boolean | undefined>>;

// 15. allowPositionals and strict don't affect value types
const r15 = parseArgsPlus({
    options: {
        name: { type: 'string', default: 'test' },
    },
    allowPositionals: true,
    strict: true,
});
type _15 = Assert<IsExact<typeof r15.values.name, string>>;

// ---------------------------------------------------------------------------
// Middleware & help type tests
// ---------------------------------------------------------------------------

// 16. help middleware allows `description` on options
const r16 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
        options: {
            name: { type: 'string', default: 'world', description: 'Your name' },
            verbose: { type: 'boolean', description: 'Enable verbose output' },
        },
    },
    [help]
);
type _16a = Assert<IsExact<typeof r16.values.name, string>>;
type _16b = Assert<IsExact<typeof r16.values.verbose, boolean | undefined>>;
type _16c = Assert<IsExact<typeof r16.positionals, string[]>>;

// 17. help middleware with name and version in config
const r17 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '2.0.0',
        options: {
            output: { type: 'string', description: 'Output file' },
        },
    },
    [help]
);
type _17 = Assert<IsExact<typeof r17.values.output, string | undefined>>;

// 18. help middleware with no descriptions is fine (description is optional)
const r18 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
        options: {
            debug: { type: 'boolean' },
        },
    },
    [help]
);
type _18 = Assert<IsExact<typeof r18.values.debug, boolean | undefined>>;

// 19. help middleware with tokens: true still returns tokens
const r19 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
        options: {
            name: { type: 'string', description: 'Your name' },
        },
        tokens: true,
    },
    [help]
);
type _19a = Assert<IsExact<typeof r19.values.name, string | undefined>>;
type _19b = Assert<'tokens' extends keyof typeof r19 ? true : false>;

// 20. help middleware with multiple and default still works
const r20 = parseArgsPlus(
    {
        name: 'my-tool',
        version: '1.0.0',
        options: {
            files: { type: 'string', multiple: true, default: ['a.txt'], description: 'Input files' },
            verbose: { type: 'boolean', default: false, description: 'Verbose mode' },
        },
    },
    [help]
);
type _20a = Assert<IsExact<typeof r20.values.files, string[]>>;
type _20b = Assert<IsExact<typeof r20.values.verbose, boolean>>;

// 21. No middlewares still works as before (backward compatibility)
const r21 = parseArgsPlus({
    options: {
        name: { type: 'string', default: 'test' },
    },
});
type _21 = Assert<IsExact<typeof r21.values.name, string>>;

// 22. Empty middleware array
const r22 = parseArgsPlus(
    {
        options: {
            name: { type: 'string' },
        },
    },
    []
);
type _22 = Assert<IsExact<typeof r22.values.name, string | undefined>>;

// ---------------------------------------------------------------------------
// JS implementation return type tests (import from the actual .js module)
// ---------------------------------------------------------------------------

import { help as helpJs } from '../src/help';
import { parseArgsPlus as parseArgsPlusJs } from '../src/index';

// The JS implementation returns ParseArgsPlusResultBase & { tokens?: Token[] }
// so values is always Record<string, string | boolean | string[] | boolean[] | undefined>,
// positionals is string[], and tokens is optionally present.

// 23. JS impl: values is a broad record type (not any)
const jr1 = parseArgsPlusJs({
    options: {
        name: { type: 'string' },
    },
});
// values should be a proper record, not any
type _23a = Assert<IsExact<typeof jr1.values, Record<string, string | boolean | string[] | boolean[] | undefined>>>;
type _23b = Assert<IsExact<typeof jr1.positionals, string[]>>;

// 24. JS impl: tokens is optionally present
type _24 = Assert<IsExact<'tokens' extends keyof typeof jr1 ? true : false, true>>;
const jr2 = parseArgsPlusJs({
    options: { name: { type: 'string' } },
});
// tokens should be Token[] | undefined (optional property)
type _24b = Assert<undefined extends typeof jr2.tokens ? true : false>;

// 25. JS impl: return type is the same regardless of config shape
const jr3 = parseArgsPlusJs({
    options: {
        name: { type: 'string', default: 'world' },
        verbose: { type: 'boolean' },
        files: { type: 'string', multiple: true },
    },
});
type _25a = Assert<IsExact<typeof jr3.values, Record<string, string | boolean | string[] | boolean[] | undefined>>>;
type _25b = Assert<IsExact<typeof jr3.positionals, string[]>>;

// 26. JS impl: with middlewares still returns the same shape
const jr4 = parseArgsPlusJs(
    {
        options: {
            name: { type: 'string' },
        },
    },
    []
);
type _26 = Assert<IsExact<typeof jr4.values, Record<string, string | boolean | string[] | boolean[] | undefined>>>;

// 27. JS impl: with help middleware returns the same base shape
const jr5 = parseArgsPlusJs(
    {
        options: {
            name: { type: 'string' },
        },
    },
    [helpJs]
);
type _27a = Assert<IsExact<typeof jr5.values, Record<string, string | boolean | string[] | boolean[] | undefined>>>;
type _27b = Assert<IsExact<typeof jr5.positionals, string[]>>;

// 28. JS impl: empty config returns the base shape
const jr6 = parseArgsPlusJs({});
type _28a = Assert<IsExact<typeof jr6.values, Record<string, string | boolean | string[] | boolean[] | undefined>>>;
type _28b = Assert<IsExact<typeof jr6.positionals, string[]>>;

// 29. JS impl: return is not any (key access on values should be union, not any)
const jr7 = parseArgsPlusJs({ options: { x: { type: 'string' } } });
type _29 = Assert<IsExact<(typeof jr7.values)['x'], string | boolean | string[] | boolean[] | undefined>>;

// 30. JS impl: positionals is exactly string[], not any
const jr8 = parseArgsPlusJs({ allowPositionals: true });
type _30 = Assert<IsExact<typeof jr8.positionals, string[]>>;

// ---------------------------------------------------------------------------
// Commands middleware type tests
// ---------------------------------------------------------------------------

// 31. Commands with matching overlapping option types compiles fine
const r31 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
        },
        commands: {
            build: {
                description: 'Build the project',
                options: {
                    verbose: { type: 'boolean' },
                    output: { type: 'string' },
                },
            },
        },
    },
    [commands]
);
type _31a = Assert<IsExact<typeof r31.values.verbose, boolean | undefined>>;
type _31b = Assert<IsExact<typeof r31.positionals, string[]>>;

// 32. Commands with no overlapping options compiles fine
const r32 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
        },
        commands: {
            build: {
                options: {
                    output: { type: 'string' },
                },
            },
        },
    },
    [commands]
);
type _32 = Assert<IsExact<typeof r32.values.verbose, boolean | undefined>>;

// 33. Commands with no options at all compiles fine
const r33 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
        },
        commands: {
            build: {
                description: 'Build the project',
            },
        },
    },
    [commands]
);
type _33 = Assert<IsExact<typeof r33.values.verbose, boolean | undefined>>;

// 34. Mismatched overlapping option types should error at compile time
parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
        },
        commands: {
            build: {
                options: {
                    // @ts-expect-error: 'verbose' is boolean globally but string in command
                    verbose: { type: 'string' },
                },
            },
        },
    },
    [commands]
);

// 35. Mismatched types across multiple commands should error
parseArgsPlus(
    {
        options: {
            output: { type: 'string' },
        },
        commands: {
            build: {
                options: {
                    output: { type: 'string' }, // OK — matches global
                },
            },
            test: {
                options: {
                    // @ts-expect-error: 'output' is string globally but boolean in command
                    output: { type: 'boolean' },
                },
            },
        },
    },
    [commands]
);

// 36. Commands with help middleware and matching types compiles fine
const r36 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
        options: {
            verbose: { type: 'boolean', description: 'Enable verbose output' },
        },
        commands: {
            build: {
                description: 'Build the project',
                options: {
                    verbose: { type: 'boolean', description: 'Verbose build' },
                    output: { type: 'string', description: 'Output directory' },
                },
            },
        },
    },
    [help, commands]
);
type _36a = Assert<IsExact<typeof r36.values.verbose, boolean | undefined>>;
type _36b = Assert<IsExact<typeof r36.positionals, string[]>>;

// ---------------------------------------------------------------------------
// Function-level order on middleware transform functions
// ---------------------------------------------------------------------------

// 37. help middleware transform functions carry order
type _37a = Assert<typeof help extends [infer C, unknown] ? (C extends { order?: number } ? true : false) : false>;
type _37b = Assert<typeof help extends [unknown, infer R] ? (R extends { order?: number } ? true : false) : false>;

// 38. commands middleware transform functions carry order
type _38a = Assert<typeof commands extends [infer C, unknown] ? (C extends { order?: number } ? true : false) : false>;
type _38b = Assert<typeof commands extends [unknown, infer R] ? (R extends { order?: number } ? true : false) : false>;

// ---------------------------------------------------------------------------
// Help result extension type tests (help/version flags in values)
// ---------------------------------------------------------------------------

// 39. help middleware adds help and version boolean flags to values
const r39 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
        options: {
            name: { type: 'string', default: 'world', description: 'Your name' },
        },
    },
    [help]
);
type _39a = Assert<IsExact<typeof r39.values.name, string>>;
type _39b = Assert<IsExact<typeof r39.values.help, boolean | undefined>>;
type _39c = Assert<IsExact<typeof r39.values.version, boolean | undefined>>;

// 40. help middleware with no user options still exposes help/version
const r40 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
    },
    [help]
);
type _40a = Assert<IsExact<typeof r40.values.help, boolean | undefined>>;
type _40b = Assert<IsExact<typeof r40.values.version, boolean | undefined>>;

// ---------------------------------------------------------------------------
// Commands discriminated union type tests
// ---------------------------------------------------------------------------

// 41. commands middleware produces a discriminated union on `command`
const r41 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
        },
        commands: {
            build: {
                description: 'Build the project',
                options: {
                    output: { type: 'string' },
                },
            },
            test: {
                description: 'Run tests',
                options: {
                    coverage: { type: 'boolean' },
                },
            },
        },
    },
    [commands]
);

// The result should have a `command` property
type _41a = Assert<'command' extends keyof typeof r41 ? true : false>;

// When command is 'build', values includes global + build options
type R41 = typeof r41;
type R41Build = Extract<R41, { command: 'build' }>;
type _41b = Assert<IsExact<R41Build['command'], 'build'>>;
type _41c = Assert<IsExact<R41Build['values']['verbose'], boolean | undefined>>;
type _41d = Assert<IsExact<R41Build['values']['output'], string | undefined>>;

// When command is 'test', values includes global + test options
type R41Test = Extract<R41, { command: 'test' }>;
type _41e = Assert<IsExact<R41Test['command'], 'test'>>;
type _41f = Assert<IsExact<R41Test['values']['verbose'], boolean | undefined>>;
type _41g = Assert<IsExact<R41Test['values']['coverage'], boolean | undefined>>;

// When command is undefined, only global options
type R41None = Extract<R41, { command: undefined }>;
type _41h = Assert<IsExact<R41None['command'], undefined>>;
type _41i = Assert<IsExact<R41None['values']['verbose'], boolean | undefined>>;

// 42. commands + help together: discriminated union with help/version flags
const r42 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
        options: {
            verbose: { type: 'boolean', description: 'Enable verbose' },
        },
        commands: {
            build: {
                description: 'Build the project',
                options: {
                    output: { type: 'string', description: 'Output dir' },
                },
            },
            serve: {
                description: 'Start dev server',
                options: {
                    port: { type: 'string', description: 'Port number' },
                },
            },
        },
    },
    [help, commands]
);

type R42 = typeof r42;

// Has `command` discriminant
type _42a = Assert<'command' extends keyof R42 ? true : false>;

// Build arm: global + help/version + build options
type R42Build = Extract<R42, { command: 'build' }>;
type _42b = Assert<IsExact<R42Build['command'], 'build'>>;
type _42c = Assert<IsExact<R42Build['values']['verbose'], boolean | undefined>>;
type _42d = Assert<IsExact<R42Build['values']['output'], string | undefined>>;
type _42e = Assert<IsExact<R42Build['values']['help'], boolean | undefined>>;
type _42f = Assert<IsExact<R42Build['values']['version'], boolean | undefined>>;

// Serve arm: global + help/version + serve options
type R42Serve = Extract<R42, { command: 'serve' }>;
type _42g = Assert<IsExact<R42Serve['command'], 'serve'>>;
type _42h = Assert<IsExact<R42Serve['values']['port'], string | undefined>>;
type _42i = Assert<IsExact<R42Serve['values']['help'], boolean | undefined>>;

// No command arm: global + help/version only
type R42None = Extract<R42, { command: undefined }>;
type _42j = Assert<IsExact<R42None['values']['verbose'], boolean | undefined>>;
type _42k = Assert<IsExact<R42None['values']['help'], boolean | undefined>>;

// 43. commands with default values: required options carry through the union
const r43 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean', default: false },
        },
        commands: {
            build: {
                options: {
                    output: { type: 'string', default: './dist' },
                },
            },
        },
    },
    [commands]
);

type R43 = typeof r43;
type R43Build = Extract<R43, { command: 'build' }>;
type _43a = Assert<IsExact<R43Build['values']['verbose'], boolean>>;
type _43b = Assert<IsExact<R43Build['values']['output'], string>>;

type R43None = Extract<R43, { command: undefined }>;
type _43c = Assert<IsExact<R43None['values']['verbose'], boolean>>;

// 44. commands with tokens: true: tokens present in all arms
const r44 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
        },
        commands: {
            build: {
                options: {
                    output: { type: 'string' },
                },
            },
        },
        tokens: true,
    },
    [commands]
);

type R44 = typeof r44;
type R44Build = Extract<R44, { command: 'build' }>;
type _44a = Assert<'tokens' extends keyof R44Build ? true : false>;
type R44None = Extract<R44, { command: undefined }>;
type _44b = Assert<'tokens' extends keyof R44None ? true : false>;

// 45. commands without options on a command: only global options in that arm
const r45 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
        },
        commands: {
            init: {
                description: 'Initialize project',
            },
        },
    },
    [commands]
);

type R45 = typeof r45;
type R45Init = Extract<R45, { command: 'init' }>;
type _45a = Assert<IsExact<R45Init['values']['verbose'], boolean | undefined>>;

// 46. commands middleware without commands in config falls back to plain result
const r46 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
        },
        commands: {},
    },
    [commands]
);
type _46a = Assert<IsExact<typeof r46.positionals, string[]>>;

// 47. commands with overlapping options that have matching types:
//     the command-specific option config takes precedence in the union arm
const r47 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
            output: { type: 'string' },
        },
        commands: {
            build: {
                options: {
                    verbose: { type: 'boolean' },
                    output: { type: 'string', default: './dist' },
                    minify: { type: 'boolean' },
                },
            },
        },
    },
    [commands]
);

type R47 = typeof r47;
type R47Build = Extract<R47, { command: 'build' }>;
// `output` has a default in the build command, so it should be required
type _47a = Assert<IsExact<R47Build['values']['output'], string>>;
type _47b = Assert<IsExact<R47Build['values']['minify'], boolean | undefined>>;
type _47c = Assert<IsExact<R47Build['values']['verbose'], boolean | undefined>>;

// In the no-command arm, `output` is optional (no default globally)
type R47None = Extract<R47, { command: undefined }>;
type _47d = Assert<IsExact<R47None['values']['output'], string | undefined>>;
