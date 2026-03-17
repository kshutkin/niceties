import { parseArgsPlus } from '@niceties/node-parseargs-plus';
import { camelCase } from '@niceties/node-parseargs-plus/camel-case';
import { commands } from '@niceties/node-parseargs-plus/commands';
import { customValue } from '@niceties/node-parseargs-plus/custom-value';
import { help } from '@niceties/node-parseargs-plus/help';
import { optionalValue } from '@niceties/node-parseargs-plus/optional-value';
import { parameters } from '@niceties/node-parseargs-plus/parameters';

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

// ---------------------------------------------------------------------------
// Parameters middleware type tests
// ---------------------------------------------------------------------------

// 48. Single required parameter → { version: string }
const r48 = parseArgsPlus(
    {
        parameters: ['<version>'],
        args: ['1.0.0'],
    },
    [parameters]
);
type _48a = Assert<IsExact<typeof r48.parameters, { version: string }>>;

// 49. Single optional parameter → { name?: string }
const r49 = parseArgsPlus(
    {
        parameters: ['[name]'],
        args: [],
    },
    [parameters]
);
type _49a = Assert<IsExact<typeof r49.parameters, { name?: string }>>;

// 50. Required + optional parameter → { name: string; version?: string }
const r50 = parseArgsPlus(
    {
        parameters: ['<name>', '[version]'],
        args: ['my-pkg'],
    },
    [parameters]
);
type _50a = Assert<IsExact<typeof r50.parameters, { name: string; version?: string }>>;

// 51. Required spread → { files: string[] }
const r51 = parseArgsPlus(
    {
        parameters: ['<files...>'],
        args: ['a.txt'],
    },
    [parameters]
);
type _51a = Assert<IsExact<typeof r51.parameters, { files: string[] }>>;

// 52. Optional spread → { files?: string[] }
const r52 = parseArgsPlus(
    {
        parameters: ['[files...]'],
        args: [],
    },
    [parameters]
);
type _52a = Assert<IsExact<typeof r52.parameters, { files?: string[] }>>;

// 53. Required + required spread → { name: string; files: string[] }
const r53 = parseArgsPlus(
    {
        parameters: ['<name>', '<files...>'],
        args: ['pkg', 'a.txt'],
    },
    [parameters]
);
type _53a = Assert<IsExact<typeof r53.parameters, { name: string; files: string[] }>>;

// 54. Required + optional spread → { name: string; files?: string[] }
const r54 = parseArgsPlus(
    {
        parameters: ['<name>', '[files...]'],
        args: ['pkg'],
    },
    [parameters]
);
type _54a = Assert<IsExact<typeof r54.parameters, { name: string; files?: string[] }>>;

// 55. Space-separated names are camelCased → { packageName: string }
const r55 = parseArgsPlus(
    {
        parameters: ['<package name>'],
        args: ['my-pkg'],
    },
    [parameters]
);
type _55a = Assert<IsExact<typeof r55.parameters, { packageName: string }>>;

// 56. Hyphenated names are camelCased → { saveDev: string }
const r56 = parseArgsPlus(
    {
        parameters: ['<save-dev>'],
        args: ['true'],
    },
    [parameters]
);
type _56a = Assert<IsExact<typeof r56.parameters, { saveDev: string }>>;

// 57. Mixed required, optional, and spread with camelCase
const r57 = parseArgsPlus(
    {
        parameters: ['<package name>', '[output dir...]'],
        args: ['my-pkg', 'dist'],
    },
    [parameters]
);
type _57a = Assert<IsExact<typeof r57.parameters, { packageName: string; outputDir?: string[] }>>;

// 58. Parameters with options → both values and parameters are typed
const r58 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
        },
        parameters: ['<name>', '[version]'],
        args: ['-v' as string, 'pkg' as string],
    },
    [parameters]
);
type _58a = Assert<IsExact<typeof r58.values.verbose, boolean | undefined>>;
type _58b = Assert<IsExact<typeof r58.parameters, { name: string; version?: string }>>;

// 59. Parameters with help middleware → values, parameters all typed
const r59 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
        options: {
            verbose: { type: 'boolean', description: 'Enable verbose' },
        },
        parameters: ['<name>', '[version]'],
        args: ['pkg'],
    },
    [help, parameters]
);
type _59a = Assert<IsExact<typeof r59.values.verbose, boolean | undefined>>;
type _59b = Assert<IsExact<typeof r59.parameters, { name: string; version?: string }>>;

// 60. Empty parameters array → parameters is Record<string, never>
const r60 = parseArgsPlus(
    {
        parameters: [],
        args: [],
    },
    [parameters]
);
type _60a = Assert<IsExact<typeof r60.parameters, Record<string, never>>>;

// 61. Parameters with tokens: true still works
const r61 = parseArgsPlus(
    {
        parameters: ['<name>'],
        tokens: true,
        args: ['hello'],
    },
    [parameters]
);
type _61a = Assert<IsExact<typeof r61.parameters, { name: string }>>;
type _61b = Assert<'tokens' extends keyof typeof r61 ? true : false>;

// 62. Multiple required parameters → all required in output
const r62 = parseArgsPlus(
    {
        parameters: ['<source>', '<destination>'],
        args: ['a', 'b'],
    },
    [parameters]
);
type _62a = Assert<IsExact<typeof r62.parameters, { source: string; destination: string }>>;

// 63. Multiple optional parameters → all optional in output
const r63 = parseArgsPlus(
    {
        parameters: ['[source]', '[destination]'],
        args: [],
    },
    [parameters]
);
type _63a = Assert<IsExact<typeof r63.parameters, { source?: string; destination?: string }>>;

// 64. Complex: required + optional + optional spread
const r64 = parseArgsPlus(
    {
        parameters: ['<command>', '[targets...]'],
        args: ['build', 'src'],
    },
    [parameters]
);
type _64a = Assert<IsExact<typeof r64.parameters, { command: string; targets?: string[] }>>;

// ---------------------------------------------------------------------------
// Parameters validation type tests (compile-time errors)
// ---------------------------------------------------------------------------

// 65. Invalid parameter strings should fail (uncomment to verify error):
// const rInvalid1 = parseArgsPlus(
//     { parameters: ['name'], args: [] },              // ← no brackets
//     [parameters]
// );

// 66. Required after optional should fail (uncomment to verify error):
// const rInvalid2 = parseArgsPlus(
//     { parameters: ['[opt]', '<req>'], args: [] },    // ← required after optional
//     [parameters]
// );

// 67. Spread not at end should fail (uncomment to verify error):
// const rInvalid3 = parseArgsPlus(
//     { parameters: ['<a...>', '<b>'], args: [] },     // ← spread not last
//     [parameters]
// );

// 68. Multiple spreads should fail (uncomment to verify error):
// const rInvalid4 = parseArgsPlus(
//     { parameters: ['<a...>', '<b...>'], args: [] },  // ← two spreads
//     [parameters]
// );

// ---------------------------------------------------------------------------
// Commands + Parameters middleware cooperation type tests
// ---------------------------------------------------------------------------

// 69. Command with parameters → per-command typed parameters
const r69 = parseArgsPlus(
    {
        commands: {
            install: {
                parameters: ['<package>'],
                description: 'Install a package',
            },
            build: {
                options: {
                    watch: { type: 'boolean' },
                },
            },
        },
        args: ['install', 'lodash'],
    },
    [commands, parameters]
);

type R69 = typeof r69;
type R69Install = Extract<R69, { command: 'install' }>;
type _69a = Assert<IsExact<R69Install['command'], 'install'>>;
type _69b = Assert<IsExact<R69Install['parameters'], { package: string }>>;

type R69Build = Extract<R69, { command: 'build' }>;
type _69c = Assert<IsExact<R69Build['command'], 'build'>>;
// Build has no parameters — should not have a parameters field
type _69d = Assert<IsExact<'parameters' extends keyof R69Build ? true : false, false>>;

// 70. Command with multiple parameters and spread
const r70 = parseArgsPlus(
    {
        commands: {
            deploy: {
                parameters: ['<target>', '[files...]'],
            },
        },
        args: ['deploy', 'production', 'app.js'],
    },
    [commands, parameters]
);
type R70 = typeof r70;
type R70Deploy = Extract<R70, { command: 'deploy' }>;
type _70a = Assert<IsExact<R70Deploy['parameters'], { target: string; files?: string[] }>>;

// 71. Commands + parameters + help all together
const r71 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
        options: {
            verbose: { type: 'boolean', description: 'Verbose' },
        },
        commands: {
            install: {
                parameters: ['<package>', '[version]'],
                description: 'Install a package',
            },
        },
        args: ['install', 'lodash', '4.17.21'],
    },
    [help, commands, parameters]
);
type R71 = typeof r71;
type R71Install = Extract<R71, { command: 'install' }>;
type _71a = Assert<IsExact<R71Install['parameters'], { package: string; version?: string }>>;
type _71b = Assert<IsExact<R71Install['values']['verbose'], boolean | undefined>>;

// 72. Different commands with different parameter shapes
const r72 = parseArgsPlus(
    {
        commands: {
            copy: {
                parameters: ['<source>', '<destination>'],
            },
            install: {
                parameters: ['<packages...>'],
            },
        },
        args: ['copy', 'a.txt', 'b.txt'],
    },
    [commands, parameters]
);
type R72 = typeof r72;
type R72Copy = Extract<R72, { command: 'copy' }>;
type _72a = Assert<IsExact<R72Copy['parameters'], { source: string; destination: string }>>;
type R72Install = Extract<R72, { command: 'install' }>;
type _72b = Assert<IsExact<R72Install['parameters'], { packages: string[] }>>;

// 73. Command with camelCase parameter names
const r73 = parseArgsPlus(
    {
        commands: {
            install: {
                parameters: ['<package-name>'],
            },
        },
        args: ['install', '@scope/pkg'],
    },
    [commands, parameters]
);
type R73Install = Extract<typeof r73, { command: 'install' }>;
type _73a = Assert<IsExact<R73Install['parameters'], { packageName: string }>>;

// 74. Commands with options + parameters on same command
const r74 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
        },
        commands: {
            install: {
                parameters: ['<package>'],
                options: {
                    'save-dev': { type: 'boolean' },
                },
            },
        },
        args: ['install', '--save-dev', 'lodash'],
    },
    [commands, parameters]
);
type R74 = typeof r74;
type R74Install = Extract<R74, { command: 'install' }>;
type _74a = Assert<IsExact<R74Install['parameters'], { package: string }>>;
type _74b = Assert<IsExact<R74Install['values']['save-dev'], boolean | undefined>>;
type _74c = Assert<IsExact<R74Install['values']['verbose'], boolean | undefined>>;

// 75. No command matched arm should not have parameters
type R74None = Extract<R74, { command: undefined }>;
type _75a = Assert<IsExact<R74None['command'], undefined>>;

// 76. Commands with no parameters middleware → no parameters field
const r76 = parseArgsPlus(
    {
        commands: {
            install: {
                parameters: ['<package>'],
            },
        },
        args: ['install', 'lodash'],
    },
    [commands]
);
type R76Install = Extract<typeof r76, { command: 'install' }>;
type _76a = Assert<IsExact<'parameters' extends keyof R76Install ? true : false, false>>;

// ---------------------------------------------------------------------------
// CamelCase middleware type tests
// ---------------------------------------------------------------------------

// 77. camelCase middleware with simple camelCase option keys
const r77 = parseArgsPlus(
    {
        options: {
            saveDev: { type: 'boolean' },
            outputDir: { type: 'string' },
        },
        args: ['--save-dev', '--output-dir', './dist'],
    },
    [camelCase]
);
type _77a = Assert<IsExact<typeof r77.values.saveDev, boolean | undefined>>;
type _77b = Assert<IsExact<typeof r77.values.outputDir, string | undefined>>;

// 78. camelCase middleware with default values preserves required typing
const r78 = parseArgsPlus(
    {
        options: {
            logLevel: { type: 'string', default: 'info' },
            verbose: { type: 'boolean' },
        },
        args: [],
    },
    [camelCase]
);
type _78a = Assert<IsExact<typeof r78.values.logLevel, string>>;
type _78b = Assert<IsExact<typeof r78.values.verbose, boolean | undefined>>;

// 79. camelCase middleware with multiple option
const r79 = parseArgsPlus(
    {
        options: {
            includePath: { type: 'string', multiple: true },
        },
        args: ['--include-path', './src'],
    },
    [camelCase]
);
type _79a = Assert<IsExact<typeof r79.values.includePath, string[] | undefined>>;

// 80. camelCase + help middleware
const r80 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
        options: {
            saveDev: { type: 'boolean', description: 'Save as dev' },
        },
        args: ['--save-dev'],
    },
    [camelCase, help]
);
type _80a = Assert<IsExact<typeof r80.values.saveDev, boolean | undefined>>;

// 81. camelCase + commands middleware
const r81 = parseArgsPlus(
    {
        options: {
            logLevel: { type: 'string' },
        },
        commands: {
            build: {
                options: {
                    watchMode: { type: 'boolean' },
                },
            },
        },
        args: ['build', '--watch-mode'],
    },
    [camelCase, commands]
);
type R81Build = Extract<typeof r81, { command: 'build' }>;
type _81a = Assert<IsExact<R81Build['values']['logLevel'], string | undefined>>;
type _81b = Assert<IsExact<R81Build['values']['watchMode'], boolean | undefined>>;

// 82. camelCase + parameters middleware
const r82 = parseArgsPlus(
    {
        options: {
            saveDev: { type: 'boolean' },
        },
        parameters: ['<package name>'],
        args: ['--save-dev', 'my-pkg'],
    },
    [camelCase, parameters]
);
type _82a = Assert<IsExact<typeof r82.values.saveDev, boolean | undefined>>;
type _82b = Assert<IsExact<typeof r82.parameters, { packageName: string }>>;

// 83. camelCase + commands + parameters middleware
const r83 = parseArgsPlus(
    {
        options: {
            logLevel: { type: 'string' },
        },
        commands: {
            install: {
                options: {
                    saveDev: { type: 'boolean' },
                },
                parameters: ['<package>'],
            },
        },
        args: ['install', '--save-dev', 'lodash'],
    },
    [camelCase, commands, parameters]
);
type R83Install = Extract<typeof r83, { command: 'install' }>;
type _83a = Assert<IsExact<R83Install['values']['saveDev'], boolean | undefined>>;
type _83b = Assert<IsExact<R83Install['values']['logLevel'], string | undefined>>;
type _83c = Assert<IsExact<R83Install['parameters'], { package: string }>>;

// 84. camelCase with all four middlewares
const r84 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
        options: {
            logLevel: { type: 'string', description: 'Log level' },
        },
        commands: {
            install: {
                description: 'Install packages',
                options: {
                    saveDev: { type: 'boolean', description: 'Dev dep' },
                },
                parameters: ['<package>'],
            },
        },
        args: ['install', '--save-dev', 'lodash'],
    },
    [camelCase, help, commands, parameters]
);
type R84Install = Extract<typeof r84, { command: 'install' }>;
type _84a = Assert<IsExact<R84Install['values']['saveDev'], boolean | undefined>>;
type _84b = Assert<IsExact<R84Install['values']['logLevel'], string | undefined>>;
type _84c = Assert<IsExact<R84Install['parameters'], { package: string }>>;

// 85. camelCase with single-word keys (no conversion needed)
const r85 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
            output: { type: 'string' },
        },
        args: ['--verbose', '--output', 'file.txt'],
    },
    [camelCase]
);
type _85a = Assert<IsExact<typeof r85.values.verbose, boolean | undefined>>;
type _85b = Assert<IsExact<typeof r85.values.output, string | undefined>>;

// ---------------------------------------------------------------------------
// Optional-value middleware type tests
// ---------------------------------------------------------------------------

// 86. optionalValue: string option with optionalValue: true → still string | undefined
const r86 = parseArgsPlus(
    {
        options: {
            filter: { type: 'string', optionalValue: true },
        },
        args: ['--filter'],
    },
    [optionalValue]
);
type _86a = Assert<IsExact<typeof r86.values.filter, string | undefined>>;

// 87. optionalValue: string option with optionalValue and default → string (required)
const r87 = parseArgsPlus(
    {
        options: {
            filter: { type: 'string', optionalValue: true, default: 'all' },
        },
        args: [],
    },
    [optionalValue]
);
type _87a = Assert<IsExact<typeof r87.values.filter, string>>;

// 88. optionalValue: multiple: true with optionalValue → string[] | undefined
const r88 = parseArgsPlus(
    {
        options: {
            filter: { type: 'string', multiple: true, optionalValue: true },
        },
        args: ['--filter'],
    },
    [optionalValue]
);
type _88a = Assert<IsExact<typeof r88.values.filter, string[] | undefined>>;

// 89. optionalValue: multiple: true with optionalValue and default → string[]
const r89 = parseArgsPlus(
    {
        options: {
            filter: { type: 'string', multiple: true, optionalValue: true, default: [] as string[] },
        },
        args: [],
    },
    [optionalValue]
);
type _89a = Assert<IsExact<typeof r89.values.filter, string[]>>;

// 90. optionalValue + help: option with optionalValue and description
const r90 = parseArgsPlus(
    {
        name: 'test-cli',
        version: '1.0.0',
        options: {
            filter: { type: 'string', optionalValue: true, description: 'Filter results' },
            name: { type: 'string', description: 'Your name' },
        },
        args: ['--filter'],
    },
    [optionalValue, help]
);
type _90a = Assert<IsExact<typeof r90.values.filter, string | undefined>>;
type _90b = Assert<IsExact<typeof r90.values.name, string | undefined>>;

// 91. optionalValue + commands: optionalValue on global option with command discriminant
const r91 = parseArgsPlus(
    {
        options: {
            filter: { type: 'string', optionalValue: true },
        },
        commands: {
            build: {
                options: {
                    watch: { type: 'boolean' },
                },
            },
        },
        args: ['build', '--filter'],
    },
    [optionalValue, commands]
);
type R91 = typeof r91;
type R91Build = Extract<R91, { command: 'build' }>;
type _91a = Assert<IsExact<R91Build['values']['filter'], string | undefined>>;
type _91b = Assert<IsExact<R91Build['values']['watch'], boolean | undefined>>;

// 92. optionalValue + commands: optionalValue on command-level option
const r92 = parseArgsPlus(
    {
        options: {},
        commands: {
            build: {
                options: {
                    mode: { type: 'string', optionalValue: true },
                },
            },
        },
        args: ['build', '--mode'],
    },
    [optionalValue, commands]
);
type R92 = typeof r92;
type R92Build = Extract<R92, { command: 'build' }>;
type _92a = Assert<IsExact<R92Build['values']['mode'], string | undefined>>;

// 93. optionalValue + camelCase: camelCase keys with optionalValue
const r93 = parseArgsPlus(
    {
        options: {
            logLevel: { type: 'string', optionalValue: true },
        },
        args: ['--log-level'],
    },
    [camelCase, optionalValue]
);
type _93a = Assert<IsExact<typeof r93.values.logLevel, string | undefined>>;

// 94. optionalValue + parameters: both middlewares together
const r94 = parseArgsPlus(
    {
        options: {
            filter: { type: 'string', optionalValue: true },
        },
        parameters: ['<name>'],
        args: ['hello', '--filter'],
    },
    [optionalValue, parameters]
);
type _94a = Assert<IsExact<typeof r94.values.filter, string | undefined>>;
type _94b = Assert<IsExact<typeof r94.parameters, { name: string }>>;

// 95. optionalValue: boolean option is unaffected by optionalValue marker
const r95 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
            filter: { type: 'string', optionalValue: true },
        },
        args: ['--verbose', '--filter'],
    },
    [optionalValue]
);
type _95a = Assert<IsExact<typeof r95.values.verbose, boolean | undefined>>;
type _95b = Assert<IsExact<typeof r95.values.filter, string | undefined>>;

// 96. optionalValue + help + commands + camelCase: all middlewares together
const r96 = parseArgsPlus(
    {
        name: 'test-cli',
        version: '1.0.0',
        options: {
            logLevel: { type: 'string', optionalValue: true, description: 'Log level' },
        },
        commands: {
            build: {
                description: 'Build the project',
                options: {
                    watchMode: { type: 'boolean', description: 'Watch mode' },
                },
            },
        },
        args: ['build', '--log-level'],
    },
    [camelCase, optionalValue, commands, help]
);
type R96 = typeof r96;
type R96Build = Extract<R96, { command: 'build' }>;
type _96a = Assert<IsExact<R96Build['values']['logLevel'], string | undefined>>;
type _96b = Assert<IsExact<R96Build['values']['watchMode'], boolean | undefined>>;

// ---------------------------------------------------------------------------
// Custom-value middleware type tests
// ---------------------------------------------------------------------------
// The customValue middleware allows `type` to be a function (e.g. `Number`).
// At the TypeScript level, the return type of the function is inferred and
// propagated into the result values. These tests verify both standard option
// types and function-typed options work correctly.

// 97. customValue alone with string option → string | undefined
const r97 = parseArgsPlus(
    {
        options: {
            port: { type: 'string' },
        },
        args: ['--port', '8080'],
    },
    [customValue]
);
type _97a = Assert<IsExact<typeof r97.values.port, string | undefined>>;

// 98. customValue with default → string (required)
const r98 = parseArgsPlus(
    {
        options: {
            port: { type: 'string', default: '3000' },
        },
        args: [],
    },
    [customValue]
);
type _98a = Assert<IsExact<typeof r98.values.port, string>>;

// 99. customValue with boolean option → boolean | undefined
const r99 = parseArgsPlus(
    {
        options: {
            verbose: { type: 'boolean' },
        },
        args: ['--verbose'],
    },
    [customValue]
);
type _99a = Assert<IsExact<typeof r99.values.verbose, boolean | undefined>>;

// 100. customValue with multiple: true → string[] | undefined
const r100 = parseArgsPlus(
    {
        options: {
            port: { type: 'string', multiple: true },
        },
        args: ['--port', '80', '--port', '443'],
    },
    [customValue]
);
type _100a = Assert<IsExact<typeof r100.values.port, string[] | undefined>>;

// 101. customValue with multiple: true and default → string[]
const r101 = parseArgsPlus(
    {
        options: {
            port: { type: 'string', multiple: true, default: ['80'] as string[] },
        },
        args: [],
    },
    [customValue]
);
type _101a = Assert<IsExact<typeof r101.values.port, string[]>>;

// 102. customValue + help: description accepted, values typed correctly
const r102 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
        options: {
            port: { type: 'string', description: 'Port number' },
            verbose: { type: 'boolean', description: 'Verbose output' },
        },
        args: ['--port', '3000'],
    },
    [customValue, help]
);
type _102a = Assert<IsExact<typeof r102.values.port, string | undefined>>;
type _102b = Assert<IsExact<typeof r102.values.verbose, boolean | undefined>>;

// 103. customValue + commands: discriminated union works
const r103 = parseArgsPlus(
    {
        options: {
            timeout: { type: 'string' },
        },
        commands: {
            serve: {
                options: {
                    port: { type: 'string' },
                },
            },
        },
        args: ['serve', '--port', '8080'],
    },
    [customValue, commands]
);
type R103 = typeof r103;
type R103Serve = Extract<R103, { command: 'serve' }>;
type _103a = Assert<IsExact<R103Serve['values']['port'], string | undefined>>;
type _103b = Assert<IsExact<R103Serve['values']['timeout'], string | undefined>>;

// 104. customValue + commands: command with no options
const r104 = parseArgsPlus(
    {
        options: {
            port: { type: 'string' },
        },
        commands: {
            clean: {
                description: 'Clean up',
            },
        },
        args: ['clean'],
    },
    [customValue, commands]
);
type R104 = typeof r104;
type R104Clean = Extract<R104, { command: 'clean' }>;
type _104a = Assert<IsExact<R104Clean['values']['port'], string | undefined>>;

// 105. customValue + camelCase: camelCase keys work
const r105 = parseArgsPlus(
    {
        options: {
            serverPort: { type: 'string' },
            maxRetries: { type: 'string', default: '3' },
        },
        args: ['--server-port', '4000'],
    },
    [customValue, camelCase]
);
type _105a = Assert<IsExact<typeof r105.values.serverPort, string | undefined>>;
type _105b = Assert<IsExact<typeof r105.values.maxRetries, string>>;

// 106. customValue + camelCase + commands: full cooperation
const r106 = parseArgsPlus(
    {
        options: {
            logLevel: { type: 'string' },
        },
        commands: {
            serve: {
                options: {
                    serverPort: { type: 'string' },
                },
            },
        },
        args: ['serve', '--server-port', '3000'],
    },
    [customValue, camelCase, commands]
);
type R106 = typeof r106;
type R106Serve = Extract<R106, { command: 'serve' }>;
type _106a = Assert<IsExact<R106Serve['values']['serverPort'], string | undefined>>;
type _106b = Assert<IsExact<R106Serve['values']['logLevel'], string | undefined>>;

// 107. customValue + parameters: both work together
const r107 = parseArgsPlus(
    {
        options: {
            port: { type: 'string' },
        },
        parameters: ['<name>'],
        args: ['hello', '--port', '8080'],
    },
    [customValue, parameters]
);
type _107a = Assert<IsExact<typeof r107.values.port, string | undefined>>;
type _107b = Assert<IsExact<typeof r107.parameters, { name: string }>>;

// 108. customValue + optionalValue: both work on their respective options
const r108 = parseArgsPlus(
    {
        options: {
            filter: { type: 'string', optionalValue: true },
            port: { type: 'string' },
        },
        args: ['--filter', '--port', '3000'],
    },
    [customValue, optionalValue]
);
type _108a = Assert<IsExact<typeof r108.values.filter, string | undefined>>;
type _108b = Assert<IsExact<typeof r108.values.port, string | undefined>>;

// 109. customValue with mixed string and boolean options
const r109 = parseArgsPlus(
    {
        options: {
            port: { type: 'string' },
            verbose: { type: 'boolean' },
            name: { type: 'string', default: 'app' },
        },
        args: ['--port', '80', '--verbose'],
    },
    [customValue]
);
type _109a = Assert<IsExact<typeof r109.values.port, string | undefined>>;
type _109b = Assert<IsExact<typeof r109.values.verbose, boolean | undefined>>;
type _109c = Assert<IsExact<typeof r109.values.name, string>>;

// 110. customValue + all middlewares together
const r110 = parseArgsPlus(
    {
        name: 'test-cli',
        version: '1.0.0',
        options: {
            logLevel: { type: 'string', description: 'Log level' },
        },
        commands: {
            serve: {
                description: 'Start server',
                options: {
                    serverPort: { type: 'string', description: 'Port' },
                },
            },
        },
        args: ['serve', '--server-port', '3000'],
    },
    [customValue, camelCase, optionalValue, commands, help]
);
type R110 = typeof r110;
type R110Serve = Extract<R110, { command: 'serve' }>;
type _110a = Assert<IsExact<R110Serve['values']['serverPort'], string | undefined>>;
type _110b = Assert<IsExact<R110Serve['values']['logLevel'], string | undefined>>;

// 111. customValue + parameters + commands: per-command parameters with custom values
const r111 = parseArgsPlus(
    {
        options: {
            timeout: { type: 'string' },
        },
        commands: {
            deploy: {
                parameters: ['<target>', '[files...]'],
                options: {
                    port: { type: 'string' },
                },
            },
        },
        args: ['deploy', '--port', '22', 'production', 'app.js'],
    },
    [customValue, commands, parameters]
);
type R111 = typeof r111;
type R111Deploy = Extract<R111, { command: 'deploy' }>;
type _111a = Assert<IsExact<R111Deploy['values']['port'], string | undefined>>;
type _111b = Assert<IsExact<R111Deploy['values']['timeout'], string | undefined>>;
type _111c = Assert<IsExact<R111Deploy['parameters'], { target: string; files?: string[] }>>;

// 112. customValue with tokens: true
const r112 = parseArgsPlus(
    {
        options: {
            port: { type: 'string' },
        },
        tokens: true,
        args: ['--port', '8080'],
    },
    [customValue]
);
type _112a = Assert<IsExact<typeof r112.values.port, string | undefined>>;
type _112b = Assert<'tokens' extends keyof typeof r112 ? true : false>;

// ---------------------------------------------------------------------------
// Custom-value function-type inference tests
// ---------------------------------------------------------------------------
// These tests verify that when `type` is a function, the return type of
// that function is correctly inferred in the result values.

// 113. type: Number → number | undefined
const r113 = parseArgsPlus(
    {
        options: {
            port: { type: Number },
        },
        args: ['--port', '8080'],
    },
    [customValue]
);
type _113a = Assert<IsExact<typeof r113.values.port, number | undefined>>;

// 114. type: custom arrow fn → inferred return type
const r114 = parseArgsPlus(
    {
        options: {
            tags: { type: (v: string) => v.split(',') },
        },
        args: ['--tags', 'a,b,c'],
    },
    [customValue]
);
type _114a = Assert<IsExact<typeof r114.values.tags, string[] | undefined>>;

// 115. type: Number with default → number (required, since default is present)
const r115 = parseArgsPlus(
    {
        options: {
            port: { type: Number, default: '3000' },
        },
        args: [],
    },
    [customValue]
);
type _115a = Assert<IsExact<typeof r115.values.port, number>>;

// 116. type: factory receiving string[] with multiple: true → number[] | undefined
const r116 = parseArgsPlus(
    {
        options: {
            port: { type: (values: string[]) => values.map(Number), multiple: true },
        },
        args: ['--port', '80', '--port', '443'],
    },
    [customValue]
);
type _116a = Assert<IsExact<typeof r116.values.port, number[] | undefined>>;

// 117. mixed: Number function + regular string + regular boolean
const r117 = parseArgsPlus(
    {
        options: {
            port: { type: Number },
            name: { type: 'string' },
            verbose: { type: 'boolean' },
        },
        args: ['--port', '80', '--name', 'app', '--verbose'],
    },
    [customValue]
);
type _117a = Assert<IsExact<typeof r117.values.port, number | undefined>>;
type _117b = Assert<IsExact<typeof r117.values.name, string | undefined>>;
type _117c = Assert<IsExact<typeof r117.values.verbose, boolean | undefined>>;

// 118. type: Number + help middleware
const r118 = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.0.0',
        options: {
            port: { type: Number, description: 'Port number' },
            verbose: { type: 'boolean', description: 'Verbose output' },
        },
        args: ['--port', '3000'],
    },
    [customValue, help]
);
type _118a = Assert<IsExact<typeof r118.values.port, number | undefined>>;
type _118b = Assert<IsExact<typeof r118.values.verbose, boolean | undefined>>;

// 119. type: Number in command options + commands middleware
const r119 = parseArgsPlus(
    {
        options: {
            timeout: { type: Number },
        },
        commands: {
            serve: {
                options: {
                    port: { type: Number },
                },
            },
        },
        args: ['serve', '--port', '8080'],
    },
    [customValue, commands]
);
type R119 = typeof r119;
type R119Serve = Extract<R119, { command: 'serve' }>;
type _119a = Assert<IsExact<R119Serve['values']['port'], number | undefined>>;
type _119b = Assert<IsExact<R119Serve['values']['timeout'], number | undefined>>;

// 120. type: Number + camelCase middleware
const r120 = parseArgsPlus(
    {
        options: {
            serverPort: { type: Number },
        },
        args: ['--server-port', '4000'],
    },
    [customValue, camelCase]
);
type _120a = Assert<IsExact<typeof r120.values.serverPort, number | undefined>>;

// 121. type: Number + parameters middleware
const r121 = parseArgsPlus(
    {
        options: {
            port: { type: Number },
        },
        parameters: ['<name>'],
        args: ['hello', '--port', '8080'],
    },
    [customValue, parameters]
);
type _121a = Assert<IsExact<typeof r121.values.port, number | undefined>>;
type _121b = Assert<IsExact<typeof r121.parameters, { name: string }>>;

// 122. type: Number with tokens: true
const r122 = parseArgsPlus(
    {
        options: {
            port: { type: Number },
        },
        tokens: true,
        args: ['--port', '8080'],
    },
    [customValue]
);
type _122a = Assert<IsExact<typeof r122.values.port, number | undefined>>;
type _122b = Assert<'tokens' extends keyof typeof r122 ? true : false>;

// 123. type: Number + commands + help + camelCase (all middlewares)
const r123 = parseArgsPlus(
    {
        name: 'test-cli',
        version: '1.0.0',
        options: {
            maxRetries: { type: Number, description: 'Retry count' },
        },
        commands: {
            serve: {
                description: 'Start server',
                options: {
                    serverPort: { type: Number, description: 'Port' },
                },
            },
        },
        args: ['serve', '--server-port', '3000'],
    },
    [customValue, camelCase, commands, help]
);
type R123 = typeof r123;
type R123Serve = Extract<R123, { command: 'serve' }>;
type _123a = Assert<IsExact<R123Serve['values']['serverPort'], number | undefined>>;
type _123b = Assert<IsExact<R123Serve['values']['maxRetries'], number | undefined>>;

// 124. type: factory receiving string[] + multiple: true + default → number[]
const r124 = parseArgsPlus(
    {
        options: {
            ports: { type: (values: string[]) => values.map(Number), multiple: true, default: ['80'] as string[] },
        },
        args: [],
    },
    [customValue]
);
type _124a = Assert<IsExact<typeof r124.values.ports, number[]>>;

// 125. type: Number + commands + parameters: per-command parameters with Number values
const r125 = parseArgsPlus(
    {
        options: {
            timeout: { type: Number },
        },
        commands: {
            deploy: {
                parameters: ['<target>'],
                options: {
                    port: { type: Number },
                },
            },
        },
        args: ['deploy', '--port', '22', 'production'],
    },
    [customValue, commands, parameters]
);
type R125 = typeof r125;
type R125Deploy = Extract<R125, { command: 'deploy' }>;
type _125a = Assert<IsExact<R125Deploy['values']['port'], number | undefined>>;
type _125b = Assert<IsExact<R125Deploy['values']['timeout'], number | undefined>>;
type _125c = Assert<IsExact<R125Deploy['parameters'], { target: string }>>;
