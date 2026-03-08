import { parseArgsPlus } from '@niceties/node-parseargs-plus';
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
