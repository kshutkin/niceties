import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { whiteBright } from '@niceties/ansi';

import { commands } from '../src/commands.js';
import { help } from '../src/help.js';
import { parseArgsPlus } from '../src/index.js';

describe('node-parseargs-plus', () => {
    describe('parseArgsPlus without middlewares', () => {
        it('parses string options', () => {
            const result = parseArgsPlus({
                options: {
                    name: { type: 'string' },
                },
                args: ['--name', 'hello'],
            });
            expect(result.values.name).toBe('hello');
        });

        it('parses boolean options', () => {
            const result = parseArgsPlus({
                options: {
                    verbose: { type: 'boolean' },
                },
                args: ['--verbose'],
            });
            expect(result.values.verbose).toBe(true);
        });

        it('parses short options', () => {
            const result = parseArgsPlus({
                options: {
                    verbose: { type: 'boolean', short: 'v' },
                },
                args: ['-v'],
            });
            expect(result.values.verbose).toBe(true);
        });

        it('parses multiple options', () => {
            const result = parseArgsPlus({
                options: {
                    file: { type: 'string', multiple: true },
                },
                args: ['--file', 'a.txt', '--file', 'b.txt'],
            });
            expect(result.values.file).toEqual(['a.txt', 'b.txt']);
        });

        it('uses default values', () => {
            const result = parseArgsPlus({
                options: {
                    name: { type: 'string', default: 'world' },
                },
                args: [],
            });
            expect(result.values.name).toBe('world');
        });

        it('parses positionals when allowed', () => {
            const result = parseArgsPlus({
                allowPositionals: true,
                args: ['foo', 'bar'],
            });
            expect(result.positionals).toEqual(['foo', 'bar']);
        });

        it('returns tokens when requested', () => {
            const result = parseArgsPlus({
                options: {
                    name: { type: 'string' },
                },
                tokens: true,
                args: ['--name', 'hello'],
            });
            expect(result.tokens).toBeDefined();
            expect(Array.isArray(result.tokens)).toBe(true);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it('works with empty config', () => {
            const result = parseArgsPlus({
                args: [],
                strict: false,
            });
            expect(result.positionals).toEqual([]);
        });
    });

    describe('middleware system', () => {
        it('calls transformConfig on each middleware', () => {
            const transformConfig = vi.fn(config => ({
                ...config,
                options: {
                    ...config.options,
                    extra: { type: 'boolean' },
                },
            }));
            const transformResult = vi.fn(result => result);
            const middleware = [transformConfig, transformResult];

            parseArgsPlus(
                {
                    options: {
                        name: { type: 'string' },
                    },
                    args: ['--name', 'test'],
                },
                [middleware]
            );

            expect(transformConfig).toHaveBeenCalledOnce();
        });

        it('calls transformResult on each middleware in reverse order', () => {
            const order = [];
            const middleware1 = [
                config => config,
                result => {
                    order.push('mw1');
                    return result;
                },
            ];
            const middleware2 = [
                config => config,
                result => {
                    order.push('mw2');
                    return result;
                },
            ];

            parseArgsPlus(
                {
                    args: [],
                    strict: false,
                },
                [middleware1, middleware2]
            );

            expect(order).toEqual(['mw2', 'mw1']);
        });

        it('passes original config to transformResult', () => {
            const originalConfig = {
                options: {
                    name: { type: 'string' },
                },
                args: ['--name', 'test'],
            };

            const transformResult = vi.fn((result, config) => {
                expect(config).toBe(originalConfig);
                return result;
            });
            const middleware = [config => config, transformResult];

            parseArgsPlus(originalConfig, [middleware]);

            expect(transformResult).toHaveBeenCalledOnce();
        });

        it('allows middleware to modify the result', () => {
            const middleware = [
                config => config,
                result => ({
                    ...result,
                    values: { ...result.values, injected: 'yes' },
                }),
            ];

            const result = parseArgsPlus(
                {
                    args: [],
                    strict: false,
                },
                [middleware]
            );

            expect(result.values.injected).toBe('yes');
        });

        it('chains multiple middlewares transformConfig in order', () => {
            const mw1 = [
                config => ({
                    ...config,
                    options: {
                        ...config.options,
                        flag1: { type: 'boolean' },
                    },
                }),
                result => result,
            ];
            const mw2 = [
                config => ({
                    ...config,
                    options: {
                        ...config.options,
                        flag2: { type: 'boolean' },
                    },
                }),
                result => result,
            ];

            const result = parseArgsPlus(
                {
                    args: ['--flag1', '--flag2'],
                },
                [mw1, mw2]
            );

            expect(result.values.flag1).toBe(true);
            expect(result.values.flag2).toBe(true);
        });

        it('works with empty middleware array', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        name: { type: 'string' },
                    },
                    args: ['--name', 'test'],
                },
                []
            );
            expect(result.values.name).toBe('test');
        });
    });

    describe('help middleware', () => {
        let exitSpy;
        let consoleLogSpy;

        beforeEach(() => {
            exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
                throw new Error('process.exit called');
            });
            consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        });

        afterEach(() => {
            exitSpy.mockRestore();
            consoleLogSpy.mockRestore();
        });

        it('adds --help and --version options to config', () => {
            const transformed = help[0]({
                options: {
                    name: { type: 'string' },
                },
            });
            expect(transformed.options.help).toEqual({ type: 'boolean', short: 'h' });
            expect(transformed.options.version).toEqual({ type: 'boolean', short: 'v' });
            expect(transformed.options.name).toEqual({ type: 'string' });
        });

        it('preserves existing options when adding help', () => {
            const transformed = help[0]({
                options: {
                    name: { type: 'string' },
                    verbose: { type: 'boolean', short: 'V' },
                },
            });
            expect(transformed.options.name).toEqual({ type: 'string' });
            expect(transformed.options.verbose).toEqual({ type: 'boolean', short: 'V' });
            expect(transformed.options.help).toBeDefined();
            expect(transformed.options.version).toBeDefined();
        });

        it('removes help from result values when --help is not passed', () => {
            const result = parseArgsPlus(
                {
                    name: 'test-cli',
                    version: '1.0.0',
                    options: {
                        name: { type: 'string' },
                    },
                    args: ['--name', 'test'],
                },
                [help]
            );

            expect(result.values.name).toBe('test');
            expect(result.values).not.toHaveProperty('help');
        });

        it('prints help and exits when --help is passed', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {
                            name: { type: 'string', description: 'Your name' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            expect(exitSpy).toHaveBeenCalledWith(0);
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('prints help and exits when -h is passed', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {
                            name: { type: 'string', description: 'Your name' },
                        },
                        args: ['-h'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            expect(exitSpy).toHaveBeenCalledWith(0);
        });

        it('displays option descriptions in help output', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {
                            name: { type: 'string', description: 'Your name' },
                            verbose: { type: 'boolean', short: 'V', description: 'Enable verbose mode' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('Your name');
            expect(output).toContain('Enable verbose mode');
            expect(output).toContain('--name');
            expect(output).toContain('--verbose');
            expect(output).toContain('-V');
        });

        it('displays --help itself in the help output', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {
                            name: { type: 'string', description: 'Your name' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('--help');
            expect(output).toContain('-h');
            expect(output).toContain('Show this help message');
        });

        it('displays <value> suffix for string type options', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {
                            output: { type: 'string', description: 'Output file' },
                            debug: { type: 'boolean', description: 'Debug mode' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('--output <value>');
            expect(output).not.toContain('--debug <value>');
        });

        it('shows auto-generated usage line with program name', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        options: {
                            name: { type: 'string' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('Usage:');
            expect(output).toContain('my-cli [options]');
        });

        it('shows [arguments] in usage line when allowPositionals is true', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        options: {
                            name: { type: 'string' },
                        },
                        allowPositionals: true,
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('my-cli v1.0.0');
            expect(output).toContain('Usage:');
            expect(output).toContain('my-cli [options] [arguments]');
        });

        it('shows version in header line', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.2.3',
                        options: {
                            name: { type: 'string' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('my-cli v1.2.3');
            expect(output).toContain('Usage:');
            expect(output).toContain('my-cli [options]');
        });

        it('shows description in help output when config has description', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        description: 'A fantastic CLI tool',
                        options: {
                            name: { type: 'string' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');
            expect(output).toContain('A fantastic CLI tool');
        });

        it('prints version and exits when --version is passed', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '2.0.0',
                        options: {
                            name: { type: 'string' },
                        },
                        args: ['--version'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            expect(exitSpy).toHaveBeenCalledWith(0);
            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('2.0.0');
        });

        it('prints version and exits when -v is passed', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '3.1.0',
                        options: {
                            name: { type: 'string' },
                        },
                        args: ['-v'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            expect(exitSpy).toHaveBeenCalledWith(0);
            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('3.1.0');
        });

        it('always adds --version flag to config', () => {
            const transformed = help[0]({
                options: {
                    name: { type: 'string' },
                },
            });
            expect(transformed.options).toHaveProperty('help');
            expect(transformed.options).toHaveProperty('version');
            expect(transformed.options.version.type).toBe('boolean');
            expect(transformed.options.version.short).toBe('v');
        });

        it('displays --version in help output', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        options: {
                            name: { type: 'string', description: 'Your name' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('--version');
            expect(output).toContain('-v');
            expect(output).toContain('Show version number');
        });

        it('works with no options in config', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain(whiteBright('Options:'));
            expect(output).toContain('--help');
            expect(output).toContain('--version');
        });

        it('options without description are still listed', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {
                            silent: { type: 'boolean' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('--silent');
        });

        it('help is a valid middleware tuple', () => {
            expect(help).toBeDefined();
            expect(Array.isArray(help)).toBe(true);
            expect(help).toHaveLength(2);
            expect(typeof help[0]).toBe('function');
            expect(typeof help[1]).toBe('function');
        });

        it('does not interfere with other options when help is not passed', () => {
            const result = parseArgsPlus(
                {
                    name: 'test-cli',
                    version: '1.0.0',
                    options: {
                        name: { type: 'string', default: 'world', description: 'Your name' },
                        verbose: { type: 'boolean', description: 'Enable verbose output' },
                    },
                    args: ['--name', 'Alice', '--verbose'],
                },
                [help]
            );

            expect(result.values.name).toBe('Alice');
            expect(result.values.verbose).toBe(true);
            expect(result.values).not.toHaveProperty('help');
            expect(exitSpy).not.toHaveBeenCalled();
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('works alongside other middlewares', () => {
            const loggingMiddleware = [
                config => config,
                result => ({
                    ...result,
                    values: { ...result.values, _logged: true },
                }),
            ];

            const result = parseArgsPlus(
                {
                    name: 'test-cli',
                    version: '1.0.0',
                    options: {
                        name: { type: 'string' },
                    },
                    args: ['--name', 'test'],
                },
                [help, loggingMiddleware]
            );

            expect(result.values.name).toBe('test');
            expect(result.values._logged).toBe(true);
            expect(result.values).not.toHaveProperty('help');
        });

        it('displays custom helpSections in help output', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {
                            name: { type: 'string', description: 'Your name' },
                        },
                        helpSections: {
                            examples: { title: 'Examples', text: 'test-cli --name foo' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain(whiteBright('Examples:'));
            expect(output).toContain('test-cli --name foo');
        });

        it('displays custom helpSections with array text', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {},
                        helpSections: {
                            examples: { title: 'Examples', text: ['test-cli --name foo', 'test-cli --name bar'] },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('test-cli --name foo');
            expect(output).toContain('test-cli --name bar');
        });

        it('allows overriding the usage section title', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {},
                        helpSections: {
                            usage: { title: 'How to use' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain(whiteBright('How to use:'));
            expect(output).not.toContain(whiteBright('Usage:'));
            // Default usage text should still be generated
            expect(output).toContain('test-cli [options]');
        });

        it('allows overriding the options section title', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {
                            name: { type: 'string', description: 'Your name' },
                        },
                        helpSections: {
                            options: { title: 'Flags' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain(whiteBright('Flags:'));
            expect(output).not.toContain(whiteBright('Options:'));
            // Default options text should still be generated
            expect(output).toContain('--name');
        });

        it('allows overriding the usage section text', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {},
                        helpSections: {
                            usage: { title: 'Usage', text: 'test-cli <command> [flags]' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('test-cli <command> [flags]');
            expect(output).not.toContain('test-cli [options]');
        });

        it('respects order for custom helpSections', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {},
                        helpSections: {
                            examples: { title: 'Examples', text: 'example text', order: -1 },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            const examplesIndex = output.indexOf('Examples:');
            const usageIndex = output.indexOf('Usage:');
            expect(examplesIndex).toBeLessThan(usageIndex);
        });

        it('places custom helpSections after options by default', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {},
                        helpSections: {
                            notes: { title: 'Notes', text: 'Some notes' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            const notesIndex = output.indexOf('Notes:');
            const optionsIndex = output.indexOf('Options:');
            expect(notesIndex).toBeGreaterThan(optionsIndex);
        });

        it('displays custom helpSection with title only and no text', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {},
                        helpSections: {
                            sep: { title: 'Additional Info' },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain(whiteBright('Additional Info:'));
        });

        it('allows reordering built-in sections via helpSections order', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {},
                        helpSections: {
                            options: { title: 'Options', order: -1 },
                            usage: { title: 'Usage', order: 1 },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            const optionsIndex = output.indexOf('Options:');
            const usageIndex = output.indexOf('Usage:');
            expect(optionsIndex).toBeLessThan(usageIndex);
        });

        it('supports multiple custom helpSections with ordering', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {},
                        helpSections: {
                            examples: { title: 'Examples', text: 'example 1', order: 3 },
                            environment: { title: 'Environment', text: 'ENV_VAR=value', order: 2 },
                        },
                        args: ['--help'],
                    },
                    [help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            const envIndex = output.indexOf('Environment:');
            const examplesIndex = output.indexOf('Examples:');
            const optionsIndex = output.indexOf('Options:');
            expect(optionsIndex).toBeLessThan(envIndex);
            expect(envIndex).toBeLessThan(examplesIndex);
        });
    });

    describe('middleware ordering', () => {
        it('sorts middlewares by order before executing transformConfig', () => {
            const order = [];
            const mw1 = Object.assign(
                [
                    config => {
                        order.push('mw1-config');
                        return config;
                    },
                    result => {
                        order.push('mw1-result');
                        return result;
                    },
                ],
                { order: 10 }
            );
            const mw2 = Object.assign(
                [
                    config => {
                        order.push('mw2-config');
                        return config;
                    },
                    result => {
                        order.push('mw2-result');
                        return result;
                    },
                ],
                { order: -10 }
            );

            parseArgsPlus({ args: [], strict: false }, [mw1, mw2]);

            // mw2 (order -10) config runs first, mw1 (order 10) config runs second
            // mw1 (order 10) result runs first (reverse), mw2 (order -10) result runs second
            expect(order).toEqual(['mw2-config', 'mw1-config', 'mw1-result', 'mw2-result']);
        });

        it('preserves insertion order for equal order values', () => {
            const order = [];
            const mw1 = [
                config => {
                    order.push('mw1-config');
                    return config;
                },
                result => {
                    order.push('mw1-result');
                    return result;
                },
            ];
            const mw2 = [
                config => {
                    order.push('mw2-config');
                    return config;
                },
                result => {
                    order.push('mw2-result');
                    return result;
                },
            ];

            parseArgsPlus({ args: [], strict: false }, [mw1, mw2]);

            expect(order).toEqual(['mw1-config', 'mw2-config', 'mw2-result', 'mw1-result']);
        });

        it('treats undefined order as 0', () => {
            const order = [];
            const mwNeg = Object.assign(
                [
                    config => {
                        order.push('neg');
                        return config;
                    },
                    result => result,
                ],
                { order: -1 }
            );
            const mwDefault = [
                config => {
                    order.push('default');
                    return config;
                },
                result => result,
            ];
            const mwPos = Object.assign(
                [
                    config => {
                        order.push('pos');
                        return config;
                    },
                    result => result,
                ],
                { order: 1 }
            );

            parseArgsPlus({ args: [], strict: false }, [mwPos, mwDefault, mwNeg]);

            expect(order).toEqual(['neg', 'default', 'pos']);
        });
    });

    describe('commands middleware', () => {
        it('parses a basic command with its own options', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        verbose: { type: 'boolean' },
                    },
                    commands: {
                        install: {
                            options: {
                                'save-dev': { type: 'boolean' },
                            },
                            allowPositionals: true,
                        },
                    },
                    args: ['install', '--save-dev', 'lodash'],
                },
                [commands]
            );

            expect(result.command).toBe('install');
            expect(result.values['save-dev']).toBe(true);
            expect(result.positionals).toEqual(['lodash']);
        });

        it('parses global flags before the command', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        verbose: { type: 'boolean', short: 'V' },
                    },
                    commands: {
                        build: {
                            options: {
                                watch: { type: 'boolean' },
                            },
                        },
                    },
                    args: ['--verbose', 'build', '--watch'],
                },
                [commands]
            );

            expect(result.command).toBe('build');
            expect(result.values.verbose).toBe(true);
            expect(result.values.watch).toBe(true);
        });

        it('parses global flags after the command', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        verbose: { type: 'boolean' },
                    },
                    commands: {
                        install: {
                            options: {
                                'save-dev': { type: 'boolean' },
                            },
                        },
                    },
                    args: ['install', '--verbose', '--save-dev'],
                },
                [commands]
            );

            expect(result.command).toBe('install');
            expect(result.values.verbose).toBe(true);
            expect(result.values['save-dev']).toBe(true);
        });

        it('parses global string options before the command', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        config: { type: 'string' },
                    },
                    commands: {
                        build: {
                            options: {
                                outdir: { type: 'string' },
                            },
                        },
                    },
                    args: ['--config', 'my.json', 'build', '--outdir', 'dist'],
                },
                [commands]
            );

            expect(result.command).toBe('build');
            expect(result.values.config).toBe('my.json');
            expect(result.values.outdir).toBe('dist');
        });

        it('parses global string options after the command', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        config: { type: 'string' },
                    },
                    commands: {
                        build: {
                            options: {
                                outdir: { type: 'string' },
                            },
                        },
                    },
                    args: ['build', '--config', 'my.json', '--outdir', 'dist'],
                },
                [commands]
            );

            expect(result.command).toBe('build');
            expect(result.values.config).toBe('my.json');
            expect(result.values.outdir).toBe('dist');
        });

        it('uses defaultCommand when no command is given', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        verbose: { type: 'boolean' },
                    },
                    commands: {
                        run: {
                            options: {},
                            allowPositionals: true,
                        },
                    },
                    defaultCommand: 'run',
                    args: ['--verbose'],
                },
                [commands]
            );

            expect(result.command).toBe('run');
            expect(result.values.verbose).toBe(true);
        });

        it('uses defaultCommand when first positional is not a known command', () => {
            const result = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        run: {
                            options: {},
                            allowPositionals: true,
                        },
                    },
                    defaultCommand: 'run',
                    args: ['somefile.txt'],
                },
                [commands]
            );

            expect(result.command).toBe('run');
            expect(result.positionals).toEqual(['somefile.txt']);
        });

        it('throws on unknown command when no defaultCommand is set', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        options: {},
                        commands: {
                            install: { options: {} },
                            build: { options: {} },
                        },
                        args: ['deploy'],
                    },
                    [commands]
                )
            ).toThrow("Unknown command 'deploy'. Available commands: install, build");
        });

        it('returns no command field when no positionals and no defaultCommand', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        verbose: { type: 'boolean' },
                    },
                    commands: {
                        install: { options: {} },
                    },
                    args: ['--verbose'],
                },
                [commands]
            );

            expect(result.command).toBeUndefined();
            expect(result.values.verbose).toBe(true);
        });

        it('validates option type collisions between global and command', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        options: {
                            output: { type: 'boolean' },
                        },
                        commands: {
                            build: {
                                options: {
                                    output: { type: 'string' },
                                },
                            },
                        },
                        args: ['build'],
                    },
                    [commands]
                )
            ).toThrow(
                "Option '--output' has type 'boolean' globally but type 'string' in command 'build'. Use different option names to avoid conflicts."
            );
        });

        it('allows same option name with same type in global and command', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        output: { type: 'string' },
                    },
                    commands: {
                        build: {
                            options: {
                                output: { type: 'string' },
                            },
                        },
                    },
                    args: ['build', '--output', 'dist'],
                },
                [commands]
            );

            expect(result.command).toBe('build');
            expect(result.values.output).toBe('dist');
        });

        it('supports commands with no options', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        verbose: { type: 'boolean' },
                    },
                    commands: {
                        clean: {
                            description: 'Clean build output',
                        },
                    },
                    args: ['--verbose', 'clean'],
                },
                [commands]
            );

            expect(result.command).toBe('clean');
            expect(result.values.verbose).toBe(true);
        });

        it('supports commands with allowPositionals', () => {
            const result = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        install: {
                            options: {
                                'save-dev': { type: 'boolean', short: 'D' },
                            },
                            allowPositionals: true,
                        },
                    },
                    args: ['install', 'lodash', 'express', '-D'],
                },
                [commands]
            );

            expect(result.command).toBe('install');
            expect(result.positionals).toEqual(['lodash', 'express']);
            expect(result.values['save-dev']).toBe(true);
        });

        it('rejects positionals for commands with allowPositionals: false', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        options: {},
                        commands: {
                            build: {
                                options: {},
                                allowPositionals: false,
                            },
                        },
                        args: ['build', 'unexpected'],
                    },
                    [commands]
                )
            ).toThrow();
        });

        it('rejects unknown flags in command scope with strict mode', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        options: {},
                        commands: {
                            build: {
                                options: {
                                    watch: { type: 'boolean' },
                                },
                            },
                        },
                        args: ['build', '--unknown'],
                    },
                    [commands]
                )
            ).toThrow();
        });

        it('supports different option types across different commands', () => {
            const r1 = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        check: {
                            options: {
                                output: { type: 'boolean' },
                            },
                        },
                        build: {
                            options: {
                                output: { type: 'string' },
                            },
                        },
                    },
                    args: ['check', '--output'],
                },
                [commands]
            );
            expect(r1.command).toBe('check');
            expect(r1.values.output).toBe(true);

            const r2 = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        check: {
                            options: {
                                output: { type: 'boolean' },
                            },
                        },
                        build: {
                            options: {
                                output: { type: 'string' },
                            },
                        },
                    },
                    args: ['build', '--output', 'dist/'],
                },
                [commands]
            );
            expect(r2.command).toBe('build');
            expect(r2.values.output).toBe('dist/');
        });

        it('passes through without commands config', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        verbose: { type: 'boolean' },
                    },
                    args: ['--verbose'],
                },
                [commands]
            );

            expect(result.values.verbose).toBe(true);
            expect(result.command).toBeUndefined();
        });

        it('has order -10', () => {
            expect(commands.order).toBe(-10);
        });

        it('is a valid middleware tuple', () => {
            expect(Array.isArray(commands)).toBe(true);
            expect(commands).toHaveLength(2);
            expect(typeof commands[0]).toBe('function');
            expect(typeof commands[1]).toBe('function');
        });

        it('handles multiple commands selecting the correct one', () => {
            const result = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        install: {
                            options: { 'save-dev': { type: 'boolean' } },
                        },
                        build: {
                            options: { watch: { type: 'boolean' } },
                        },
                        test: {
                            options: { coverage: { type: 'boolean' } },
                        },
                    },
                    args: ['test', '--coverage'],
                },
                [commands]
            );

            expect(result.command).toBe('test');
            expect(result.values.coverage).toBe(true);
        });

        it('handles short flags for command options', () => {
            const result = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        install: {
                            options: {
                                'save-dev': { type: 'boolean', short: 'D' },
                                registry: { type: 'string', short: 'r' },
                            },
                            allowPositionals: true,
                        },
                    },
                    args: ['install', '-D', '-r', 'http://my-registry', 'lodash'],
                },
                [commands]
            );

            expect(result.command).toBe('install');
            expect(result.values['save-dev']).toBe(true);
            expect(result.values.registry).toBe('http://my-registry');
            expect(result.positionals).toEqual(['lodash']);
        });

        it('handles option-terminator in command args', () => {
            const result = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        run: {
                            options: {},
                            allowPositionals: true,
                        },
                    },
                    args: ['run', '--', '--not-a-flag'],
                },
                [commands]
            );

            expect(result.command).toBe('run');
            expect(result.positionals).toEqual(['--not-a-flag']);
        });

        it('uses default values for command options', () => {
            const result = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        build: {
                            options: {
                                outdir: { type: 'string', default: 'dist' },
                                watch: { type: 'boolean', default: false },
                            },
                        },
                    },
                    args: ['build'],
                },
                [commands]
            );

            expect(result.command).toBe('build');
            expect(result.values.outdir).toBe('dist');
            expect(result.values.watch).toBe(false);
        });
    });

    describe('commands + help middleware cooperation', () => {
        let exitSpy;
        let consoleLogSpy;

        beforeEach(() => {
            exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
                throw new Error('process.exit called');
            });
            consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        });

        afterEach(() => {
            exitSpy.mockRestore();
            consoleLogSpy.mockRestore();
        });

        it('shows global help with command list when --help is passed without a command', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        description: 'A test CLI',
                        options: {
                            verbose: { type: 'boolean', description: 'Enable verbose output' },
                        },
                        commands: {
                            install: { description: 'Install packages' },
                            build: { description: 'Build the project' },
                        },
                        args: ['--help'],
                    },
                    [commands, help]
                )
            ).toThrow('process.exit called');

            expect(exitSpy).toHaveBeenCalledWith(0);
            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('my-cli v1.0.0');
            expect(output).toContain('A test CLI');
            expect(output).toContain(whiteBright('Commands:'));
            expect(output).toContain('install');
            expect(output).toContain('Install packages');
            expect(output).toContain('build');
            expect(output).toContain('Build the project');
            expect(output).toContain(whiteBright('Global Options:'));
        });

        it('shows command-specific help when --help is passed after a command', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        options: {
                            verbose: { type: 'boolean', description: 'Verbose output' },
                        },
                        commands: {
                            install: {
                                description: 'Install packages',
                                options: {
                                    'save-dev': { type: 'boolean', description: 'Save as dev dependency' },
                                    registry: { type: 'string', description: 'Registry URL' },
                                },
                                allowPositionals: true,
                            },
                        },
                        args: ['install', '--help'],
                    },
                    [commands, help]
                )
            ).toThrow('process.exit called');

            expect(exitSpy).toHaveBeenCalledWith(0);
            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('my-cli install');
            expect(output).toContain('Install packages');
            expect(output).toContain('--save-dev');
            expect(output).toContain('Save as dev dependency');
            expect(output).toContain('--registry');
            expect(output).toContain('Registry URL');
            expect(output).toContain(whiteBright('Global Options:'));
            expect(output).toContain('--verbose');
        });

        it('works with [help, commands] order (order-independent)', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        options: {},
                        commands: {
                            build: {
                                description: 'Build things',
                                options: {
                                    watch: { type: 'boolean', description: 'Watch mode' },
                                },
                            },
                        },
                        args: ['build', '--help'],
                    },
                    [help, commands]
                )
            ).toThrow('process.exit called');

            expect(exitSpy).toHaveBeenCalledWith(0);
            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('my-cli build');
            expect(output).toContain('Build things');
            expect(output).toContain('--watch');
        });

        it('works with [commands, help] order', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        options: {},
                        commands: {
                            build: {
                                description: 'Build things',
                                options: {
                                    watch: { type: 'boolean', description: 'Watch mode' },
                                },
                            },
                        },
                        args: ['build', '--help'],
                    },
                    [commands, help]
                )
            ).toThrow('process.exit called');

            expect(exitSpy).toHaveBeenCalledWith(0);
            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('my-cli build');
            expect(output).toContain('Build things');
            expect(output).toContain('--watch');
        });

        it('shows usage line with [arguments] when command allows positionals', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        options: {},
                        commands: {
                            install: {
                                description: 'Install packages',
                                options: {},
                                allowPositionals: true,
                            },
                        },
                        args: ['install', '--help'],
                    },
                    [commands, help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('my-cli install [options] [arguments]');
        });

        it('shows usage line without [arguments] when command disallows positionals', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        options: {},
                        commands: {
                            build: {
                                description: 'Build project',
                                options: {},
                            },
                        },
                        args: ['build', '--help'],
                    },
                    [commands, help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('my-cli build [options]');
            expect(output).not.toContain('[arguments]');
        });

        it('shows global help with command usage line when no command', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        options: {},
                        commands: {
                            install: { description: 'Install' },
                            build: { description: 'Build' },
                        },
                        args: ['--help'],
                    },
                    [commands, help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('my-cli [options] <command> [command-options]');
        });

        it('prints version when --version is passed with commands', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '2.5.0',
                        options: {},
                        commands: {
                            build: { options: {} },
                        },
                        args: ['--version'],
                    },
                    [commands, help]
                )
            ).toThrow('process.exit called');

            expect(exitSpy).toHaveBeenCalledWith(0);
            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('2.5.0');
        });

        it('does not interfere when --help is not passed', () => {
            const result = parseArgsPlus(
                {
                    name: 'my-cli',
                    version: '1.0.0',
                    options: {
                        verbose: { type: 'boolean' },
                    },
                    commands: {
                        install: {
                            options: {
                                'save-dev': { type: 'boolean' },
                            },
                            allowPositionals: true,
                        },
                    },
                    args: ['install', '--save-dev', 'lodash'],
                },
                [commands, help]
            );

            expect(exitSpy).not.toHaveBeenCalled();
            expect(result.command).toBe('install');
            expect(result.values['save-dev']).toBe(true);
            expect(result.positionals).toEqual(['lodash']);
        });

        it('help has order 10', () => {
            expect(help.order).toBe(10);
        });
    });
});
