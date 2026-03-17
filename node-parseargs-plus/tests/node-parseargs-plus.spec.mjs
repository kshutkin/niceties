import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { whiteBright } from '@niceties/ansi';

import { camelCase } from '../src/camel-case.js';
import { commands } from '../src/commands.js';
import { customValue } from '../src/custom-value.js';
import { help } from '../src/help.js';
import { parseArgsPlus } from '../src/index.js';
import { optionalValue } from '../src/optional-value.js';
import { parameters } from '../src/parameters.js';

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

        it('calls transformResult on each middleware in resultOrder (insertion order when equal)', () => {
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

            // Both have default resultOrder 0, so insertion order is preserved
            expect(order).toEqual(['mw1', 'mw2']);
        });

        it('passes transformed config to transformResult', () => {
            const originalConfig = {
                options: {
                    name: { type: 'string' },
                },
                args: ['--name', 'test'],
            };

            let receivedConfig;
            const transformResult = vi.fn((result, config) => {
                receivedConfig = config;
                return result;
            });
            const addExtra = config => ({ ...config, extra: true });
            const middleware = [addExtra, transformResult];

            parseArgsPlus(originalConfig, [middleware]);

            expect(transformResult).toHaveBeenCalledOnce();
            expect(receivedConfig).not.toBe(originalConfig);
            expect(receivedConfig.extra).toBe(true);
            expect(receivedConfig.options).toEqual(originalConfig.options);
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
        it('sorts middlewares by configOrder for transformConfig', () => {
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
                { configOrder: 10, resultOrder: -10 }
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
                { configOrder: -10, resultOrder: 10 }
            );

            parseArgsPlus({ args: [], strict: false }, [mw1, mw2]);

            // mw2 (configOrder -10) config runs first, mw1 (configOrder 10) config runs second
            // mw1 (resultOrder -10) result runs first, mw2 (resultOrder 10) result runs second
            expect(order).toEqual(['mw2-config', 'mw1-config', 'mw1-result', 'mw2-result']);
        });

        it('sorts middlewares by function-level order', () => {
            const order = [];
            function transformConfig1(config) {
                order.push('mw1-config');
                return config;
            }
            transformConfig1.order = 10;
            function transformResult1(result) {
                order.push('mw1-result');
                return result;
            }
            transformResult1.order = -10;
            function transformConfig2(config) {
                order.push('mw2-config');
                return config;
            }
            transformConfig2.order = -10;
            function transformResult2(result) {
                order.push('mw2-result');
                return result;
            }
            transformResult2.order = 10;

            const mw1 = [transformConfig1, transformResult1];
            const mw2 = [transformConfig2, transformResult2];

            parseArgsPlus({ args: [], strict: false }, [mw1, mw2]);

            // mw2 (config order -10) config runs first, mw1 (config order 10) config runs second
            // mw1 (result order -10) result runs first, mw2 (result order 10) result runs second
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

            // Both configOrder and resultOrder default to 0, so insertion order is preserved
            expect(order).toEqual(['mw1-config', 'mw2-config', 'mw1-result', 'mw2-result']);
        });

        it('treats undefined configOrder and resultOrder as 0', () => {
            const order = [];
            const mwNeg = Object.assign(
                [
                    config => {
                        order.push('neg');
                        return config;
                    },
                    result => result,
                ],
                { configOrder: -1 }
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
                { configOrder: 1 }
            );

            parseArgsPlus({ args: [], strict: false }, [mwPos, mwDefault, mwNeg]);

            expect(order).toEqual(['neg', 'default', 'pos']);
        });

        it('treats undefined function-level order as 0', () => {
            const order = [];
            function negConfig(config) {
                order.push('neg');
                return config;
            }
            negConfig.order = -1;
            const mwNeg = [negConfig, result => result];
            const mwDefault = [
                config => {
                    order.push('default');
                    return config;
                },
                result => result,
            ];
            function posConfig(config) {
                order.push('pos');
                return config;
            }
            posConfig.order = 1;
            const mwPos = [posConfig, result => result];

            parseArgsPlus({ args: [], strict: false }, [mwPos, mwDefault, mwNeg]);

            expect(order).toEqual(['neg', 'default', 'pos']);
        });

        it('sorts transformResult by resultOrder independently from configOrder', () => {
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
                { configOrder: -5, resultOrder: 5 }
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
                { configOrder: 5, resultOrder: -5 }
            );

            parseArgsPlus({ args: [], strict: false }, [mw1, mw2]);

            // mw1 config first (configOrder -5), mw2 config second (configOrder 5)
            // mw2 result first (resultOrder -5), mw1 result second (resultOrder 5)
            expect(order).toEqual(['mw1-config', 'mw2-config', 'mw2-result', 'mw1-result']);
        });

        it('function-level order takes precedence over tuple-level configOrder/resultOrder', () => {
            const order = [];
            function mw1Config(config) {
                order.push('mw1-config');
                return config;
            }
            mw1Config.order = -5;
            function mw1Result(result) {
                order.push('mw1-result');
                return result;
            }
            mw1Result.order = 5;
            const mw1 = Object.assign([mw1Config, mw1Result], { configOrder: 100, resultOrder: -100 });

            function mw2Config(config) {
                order.push('mw2-config');
                return config;
            }
            mw2Config.order = 5;
            function mw2Result(result) {
                order.push('mw2-result');
                return result;
            }
            mw2Result.order = -5;
            const mw2 = Object.assign([mw2Config, mw2Result], { configOrder: -100, resultOrder: 100 });

            parseArgsPlus({ args: [], strict: false }, [mw1, mw2]);

            // Function-level order wins: mw1 config (-5) before mw2 config (5)
            // Function-level order wins: mw2 result (-5) before mw1 result (5)
            expect(order).toEqual(['mw1-config', 'mw2-config', 'mw2-result', 'mw1-result']);
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

        it('has order 10 on both transform functions', () => {
            expect(commands[0].order).toBe(10);
            expect(commands[1].order).toBe(10);
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

        it('help has order -10 on transformConfig and 20 on transformResult', () => {
            expect(help[0].order).toBe(-10);
            expect(help[1].order).toBe(20);
        });

        it('shows command-specific help for command with no options defined', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '2.0.0',
                        options: {},
                        commands: {
                            clean: {
                                description: 'Clean build output',
                                allowPositionals: true,
                            },
                        },
                        args: ['clean', '--help'],
                    },
                    [commands, help]
                )
            ).toThrow('process.exit called');

            expect(exitSpy).toHaveBeenCalledWith(0);
            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('my-cli clean');
            expect(output).toContain('Clean build output');
            expect(output).toContain(whiteBright('Global Options:'));
            expect(output).toContain('--help');
            // Should not have a command-specific Options section since command has no options
            expect(output).not.toMatch(/^Options:/m);
        });

        it('shows command without description in global help command list', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        options: {},
                        commands: {
                            install: { description: 'Install packages' },
                            clean: {},
                        },
                        args: ['--help'],
                    },
                    [commands, help]
                )
            ).toThrow('process.exit called');

            expect(exitSpy).toHaveBeenCalledWith(0);
            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('install');
            expect(output).toContain('Install packages');
            expect(output).toContain('clean');
        });
    });

    describe('help text wrapping', () => {
        let exitSpy;
        let consoleLogSpy;
        let originalColumns;

        beforeEach(() => {
            exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
                throw new Error('process.exit called');
            });
            consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            originalColumns = process.stdout.columns;
        });

        afterEach(() => {
            exitSpy.mockRestore();
            consoleLogSpy.mockRestore();
            Object.defineProperty(process.stdout, 'columns', {
                value: originalColumns,
                writable: true,
                configurable: true,
            });
        });

        function setTerminalWidth(width) {
            Object.defineProperty(process.stdout, 'columns', {
                value: width,
                writable: true,
                configurable: true,
            });
        }

        function getHelpOutput() {
            return consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');
        }

        function triggerHelp(config) {
            expect(() => parseArgsPlus({ ...config, args: ['--help'] }, [help])).toThrow('process.exit called');
        }

        it('wraps long option descriptions to terminal width', () => {
            setTerminalWidth(60);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    output: {
                        type: 'string',
                        description: 'Path to an output file where the greeting will be written instead of stdout',
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            // Every line should fit within 60 columns
            for (const line of outputLines) {
                expect(line.length).toBeLessThanOrEqual(60);
            }
            // Content should still be present (check individual words since wrapping may split phrases)
            expect(output).toContain('Path');
            expect(output).toContain('output file');
            expect(output).toContain('greeting');
            expect(output).toContain('written');
            expect(output).toContain('stdout');
        });

        it('wraps continuation lines aligned to description column for options', () => {
            setTerminalWidth(50);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    name: {
                        type: 'string',
                        description: 'A very long description that should definitely wrap to the next line at this width',
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            // In narrow mode (< 80 cols), flags and description are on separate lines,
            // both indented: flags at 2 spaces, description at 4 spaces.
            // Find lines containing the description text (not flags lines)
            const descLines = outputLines.filter(l => l.includes('A very long') || (l.match(/^\s{4}\S/) && !l.includes('--')));
            // All description lines (including continuations) should be indented 4 spaces
            for (const line of descLines) {
                const leadingSpaces = line.match(/^(\s*)/)[1].length;
                expect(leadingSpaces).toBeGreaterThanOrEqual(4);
            }
        });

        it('wraps long description text in the header area', () => {
            setTerminalWidth(40);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                description: 'A feature-rich command-line tool for greeting people in various ways and formats',
                options: {},
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            for (const line of outputLines) {
                expect(line.length).toBeLessThanOrEqual(40);
            }
            expect(output).toContain('feature-rich');
            expect(output).toContain('formats');
        });

        it('wraps section text with 2-space indent', () => {
            setTerminalWidth(30);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {},
                helpSections: {
                    notes: {
                        title: 'Notes',
                        text: 'This is a rather long note that should wrap nicely at the terminal boundary',
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            for (const line of outputLines) {
                expect(line.length).toBeLessThanOrEqual(30);
            }
            expect(output).toContain('This is a rather');
            expect(output).toContain('terminal boundary');
        });

        it('does not wrap when terminal width is not available', () => {
            // Set columns to undefined to simulate piped output
            Object.defineProperty(process.stdout, 'columns', {
                value: undefined,
                writable: true,
                configurable: true,
            });
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    output: {
                        type: 'string',
                        description:
                            'A very long description that would normally be wrapped but should remain on a single line when there is no terminal width available',
                    },
                },
            });
            const output = getHelpOutput();
            // The full description should appear on one line (no wrapping)
            expect(output).toContain(
                'A very long description that would normally be wrapped but should remain on a single line when there is no terminal width available'
            );
        });

        it('wraps command descriptions in global help', () => {
            setTerminalWidth(50);
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {},
                        commands: {
                            install: {
                                description:
                                    'Install all required packages and dependencies from the registry into the local node_modules folder',
                            },
                        },
                        args: ['--help'],
                    },
                    [commands, help]
                )
            ).toThrow('process.exit called');
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            for (const line of outputLines) {
                expect(line.length).toBeLessThanOrEqual(50);
            }
            expect(output).toContain('Install all required');
            expect(output).toContain('node_modules folder');
        });

        it('handles single word longer than available width without breaking', () => {
            setTerminalWidth(30);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    x: {
                        type: 'boolean',
                        description: 'Supercalifragilisticexpialidocious effect',
                    },
                },
            });
            const output = getHelpOutput();
            // The long word should still appear intact (not broken mid-word)
            expect(output).toContain('Supercalifragilisticexpialidocious');
            expect(output).toContain('effect');
        });

        it('wraps array text in helpSections line by line', () => {
            setTerminalWidth(35);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {},
                helpSections: {
                    examples: {
                        title: 'Examples',
                        text: [
                            'Run the tool with default settings and see what happens next',
                            'Run with verbose output enabled for detailed diagnostics',
                        ],
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            for (const line of outputLines) {
                expect(line.length).toBeLessThanOrEqual(35);
            }
            // Check individual words since wrapping may split phrases across lines
            expect(output).toContain('default');
            expect(output).toContain('settings');
            expect(output).toContain('verbose');
            expect(output).toContain('diagnostics');
        });

        it('preserves all content when wrapping at narrow width', () => {
            setTerminalWidth(40);
            triggerHelp({
                name: 'my-cli',
                version: '1.2.3',
                description: 'A feature-rich command-line tool for greeting people in various ways',
                options: {
                    name: {
                        type: 'string',
                        description: 'The name of the person or entity to greet with a friendly message',
                    },
                    loud: {
                        type: 'boolean',
                        description: 'Convert the entire output to uppercase for maximum visibility',
                    },
                },
            });
            const output = getHelpOutput();
            // All meaningful words should still be present
            expect(output).toContain('feature-rich');
            expect(output).toContain('greeting');
            expect(output).toContain('person');
            expect(output).toContain('entity');
            expect(output).toContain('uppercase');
            expect(output).toContain('visibility');
            expect(output).toContain('--name');
            expect(output).toContain('--loud');
            expect(output).toContain('--help');
            expect(output).toContain('--version');
        });

        it('uses narrow layout with flags and description on separate lines when width < 80', () => {
            setTerminalWidth(60);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    output: {
                        type: 'string',
                        short: 'o',
                        description: 'Output file path',
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            // In narrow mode, flags are comma-separated on one line: "  -o, --output <value>"
            const flagsLine = outputLines.find(l => l.includes('-o, --output'));
            expect(flagsLine).toBeDefined();
            expect(flagsLine).toMatch(/^\s{2}-o, --output <value>$/);
            // Description should be on a separate line, indented 4 spaces
            const flagsIndex = outputLines.indexOf(flagsLine);
            const descLine = outputLines[flagsIndex + 1];
            expect(descLine).toMatch(/^\s{4}Output file path$/);
        });

        it('narrow layout does not use columnar alignment', () => {
            setTerminalWidth(50);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    name: {
                        type: 'string',
                        description: 'Your name',
                    },
                    verbose: {
                        type: 'boolean',
                        short: 'V',
                        description: 'Enable verbose output',
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            // Flags and descriptions should be on separate lines, not on the same line
            const nameFlagsLine = outputLines.find(l => l.includes('--name'));
            expect(nameFlagsLine).not.toContain('Your name');
            const verboseFlagsLine = outputLines.find(l => l.includes('--verbose'));
            expect(verboseFlagsLine).not.toContain('Enable verbose');
        });

        it('narrow layout wraps description text at terminal width', () => {
            setTerminalWidth(35);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    output: {
                        type: 'string',
                        description: 'Path to an output file where the greeting will be written',
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            for (const line of outputLines) {
                expect(line.length).toBeLessThanOrEqual(35);
            }
            expect(output).toContain('Path');
            expect(output).toContain('greeting');
            expect(output).toContain('written');
        });

        it('narrow layout options without description only show flags line', () => {
            setTerminalWidth(50);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    silent: {
                        type: 'boolean',
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            const flagsLine = outputLines.find(l => l.includes('--silent'));
            expect(flagsLine).toBeDefined();
            expect(flagsLine).toMatch(/^\s{2}--silent$/);
        });

        it('narrow layout shows short and long flags comma-separated', () => {
            setTerminalWidth(60);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {},
            });
            const output = getHelpOutput();
            // --help has short -h
            expect(output).toContain('  -h, --help');
            // --version has short -v
            expect(output).toContain('  -v, --version');
        });

        it('narrow layout adds extra blank line between options', () => {
            setTerminalWidth(60);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    name: {
                        type: 'string',
                        description: 'Your name',
                    },
                    verbose: {
                        type: 'boolean',
                        short: 'V',
                        description: 'Enable verbose output',
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            // Find the description line of --name option
            const nameDescIndex = outputLines.findIndex(l => l.includes('Your name'));
            expect(nameDescIndex).toBeGreaterThan(-1);
            // The next line should be blank (extra spacing between options)
            // printSection adds 2-space indent to plain lines, so blank separator is '  '
            expect(outputLines[nameDescIndex + 1].trim()).toBe('');
            // The line after the blank should be the next option's flags
            expect(outputLines[nameDescIndex + 2]).toMatch(/^\s{2}-V, --verbose$/);

            // Find the description line of --verbose option
            const verboseDescIndex = outputLines.findIndex(l => l.includes('Enable verbose output'));
            expect(verboseDescIndex).toBeGreaterThan(-1);
            // After --verbose description there should be a blank line before --help
            expect(outputLines[verboseDescIndex + 1].trim()).toBe('');
            expect(outputLines[verboseDescIndex + 2]).toMatch(/^\s{2}-h, --help$/);
        });

        it('narrow layout does not add trailing blank line after last option', () => {
            setTerminalWidth(60);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    name: {
                        type: 'string',
                        description: 'Your name',
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            // Find the last --version description line
            const versionDescIndex = outputLines.findIndex(l => l.includes('Show version number'));
            expect(versionDescIndex).toBeGreaterThan(-1);
            // The line after the last option's description should NOT be a blank line
            // from the options section (it should either be the next section title or end of output)
            if (versionDescIndex + 1 < outputLines.length) {
                // If there's content after, it should not be a dangling blank line from options
                // The options section should end cleanly without a trailing blank separator
                const nextLine = outputLines[versionDescIndex + 1];
                expect(nextLine === '' || !nextLine.match(/^\s*$/)).toBeTruthy();
            }
        });

        it('narrow layout adds blank line after option without description', () => {
            setTerminalWidth(60);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    silent: {
                        type: 'boolean',
                    },
                    output: {
                        type: 'string',
                        description: 'Output file path',
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            // Find the --silent flags line (no description follows)
            const silentIndex = outputLines.findIndex(l => l.includes('--silent'));
            expect(silentIndex).toBeGreaterThan(-1);
            // There should be a blank line after --silent before the next option
            expect(outputLines[silentIndex + 1].trim()).toBe('');
            // The next option's flags should follow
            expect(outputLines[silentIndex + 2]).toMatch(/^\s{2}--output/);
        });

        it('uses wide columnar layout when width is exactly 80', () => {
            setTerminalWidth(80);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    output: {
                        type: 'string',
                        description: 'Output file path',
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            // In wide mode, flags and description are on the same line
            const flagsLine = outputLines.find(l => l.includes('--output'));
            expect(flagsLine).toContain('Output file path');
        });

        it('narrow layout does not wrap when terminal width is under 30', () => {
            setTerminalWidth(20);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    output: {
                        type: 'string',
                        description: 'A very long description that would normally wrap but should not wrap here',
                    },
                },
            });
            const output = getHelpOutput();
            // Description should appear unbroken on one line (no wrapping for width < 30)
            expect(output).toContain('A very long description that would normally wrap but should not wrap here');
        });

        it('wide layout wraps long option descriptions to multiple continuation lines', () => {
            setTerminalWidth(80);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    output: {
                        type: 'string',
                        description:
                            'This is an extremely long description that is designed to exceed the available width in the wide columnar layout so that the text wraps onto a second continuation line aligned to the description column',
                    },
                },
            });
            const output = getHelpOutput();
            const outputLines = output.split('\n');
            // In wide layout (>= 80), continuation lines are indented to the description column.
            // Find lines in the Options section that are purely indented continuation text
            // (no -- flags, just spaces then words).
            const optionSectionLines = outputLines.filter(l => l.includes('--output') || (l.match(/^\s{10,}\S/) && !l.includes('--')));
            // There should be more than one line (the flags+first-part line plus continuations)
            expect(optionSectionLines.length).toBeGreaterThan(1);
            // Every line should fit within 80 columns
            for (const line of outputLines) {
                expect(line.length).toBeLessThanOrEqual(80);
            }
            // Content should still be fully present
            expect(output).toContain('extremely long description');
            expect(output).toContain('continuation');
        });

        it('wraps long flag names to continuation lines in narrow layout', () => {
            setTerminalWidth(40);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {
                    'this-is-a-very-long-option-name-that-will-wrap': {
                        type: 'string',
                        short: 'x',
                        description: 'Some description',
                    },
                },
            });
            const output = getHelpOutput();
            // The flags text itself should wrap in narrow mode because the flag name is very long.
            const flagWord = '--this-is-a-very-long-option-name-that-will-wrap';
            // The flag word is longer than 40 cols so it will be on its own line, but
            // the "-x, " prefix part causes wrapping of the flags line
            expect(output).toContain(flagWord);
            expect(output).toContain('Some description');
        });

        it('handles empty section text when terminal width is set', () => {
            setTerminalWidth(80);
            triggerHelp({
                name: 'test-cli',
                version: '1.0.0',
                options: {},
                helpSections: {
                    spacer: {
                        title: 'Note',
                        text: '',
                        order: 3,
                    },
                },
            });
            const output = getHelpOutput();
            // The section title should be present
            expect(output).toContain('Note:');
        });
    });

    describe('commands middleware edge cases', () => {
        it('parses command when global options is not provided', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        build: {
                            options: {
                                watch: { type: 'boolean' },
                            },
                        },
                    },
                    args: ['build', '--watch'],
                },
                [commands]
            );

            expect(result.command).toBe('build');
            expect(result.values.watch).toBe(true);
        });

        it('falls back to process.argv when args is not provided', () => {
            const originalArgv = process.argv;
            try {
                process.argv = ['node', 'test.js', 'build', '--watch'];
                const result = parseArgsPlus(
                    {
                        options: {},
                        commands: {
                            build: {
                                options: {
                                    watch: { type: 'boolean' },
                                },
                            },
                        },
                    },
                    [commands]
                );

                expect(result.command).toBe('build');
                expect(result.values.watch).toBe(true);
            } finally {
                process.argv = originalArgv;
            }
        });
    });

    describe('parameters middleware', () => {
        it('parses a single required parameter', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<version>'],
                    args: ['1.0.0'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ version: '1.0.0' });
        });

        it('parses multiple required parameters', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<name>', '<version>'],
                    args: ['my-pkg', '2.0.0'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ name: 'my-pkg', version: '2.0.0' });
        });

        it('parses a single optional parameter when provided', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['[name]'],
                    args: ['hello'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ name: 'hello' });
        });

        it('parses a single optional parameter when not provided', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['[name]'],
                    args: [],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ name: undefined });
        });

        it('parses required followed by optional parameter', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<name>', '[version]'],
                    args: ['my-pkg', '1.0.0'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ name: 'my-pkg', version: '1.0.0' });
        });

        it('parses required followed by optional parameter when optional is missing', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<name>', '[version]'],
                    args: ['my-pkg'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ name: 'my-pkg', version: undefined });
        });

        it('parses a required spread parameter', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<files...>'],
                    args: ['a.txt', 'b.txt', 'c.txt'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ files: ['a.txt', 'b.txt', 'c.txt'] });
        });

        it('parses an optional spread parameter when provided', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['[files...]'],
                    args: ['a.txt', 'b.txt'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ files: ['a.txt', 'b.txt'] });
        });

        it('parses an optional spread parameter when not provided', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['[files...]'],
                    args: [],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ files: undefined });
        });

        it('parses required parameter followed by required spread', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<name>', '<files...>'],
                    args: ['my-pkg', 'a.txt', 'b.txt'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ name: 'my-pkg', files: ['a.txt', 'b.txt'] });
        });

        it('parses required parameter followed by optional spread', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<name>', '[files...]'],
                    args: ['my-pkg', 'a.txt'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ name: 'my-pkg', files: ['a.txt'] });
        });

        it('parses required parameter followed by optional spread when spread is empty', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<name>', '[files...]'],
                    args: ['my-pkg'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ name: 'my-pkg', files: undefined });
        });

        it('converts space-separated parameter names to camelCase', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<package name>'],
                    args: ['my-pkg'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ packageName: 'my-pkg' });
        });

        it('converts hyphenated parameter names to camelCase', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<save-dev>'],
                    args: ['true'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ saveDev: 'true' });
        });

        it('converts multi-word spread parameter names to camelCase', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['[input files...]'],
                    args: ['a.txt', 'b.txt'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ inputFiles: ['a.txt', 'b.txt'] });
        });

        it('throws on missing required parameter', () => {
            expect(() => {
                parseArgsPlus(
                    {
                        parameters: ['<name>'],
                        args: [],
                    },
                    [parameters]
                );
            }).toThrow("Missing required parameter '<name>'.");
        });

        it('throws on missing required spread parameter', () => {
            expect(() => {
                parseArgsPlus(
                    {
                        parameters: ['<files...>'],
                        args: [],
                    },
                    [parameters]
                );
            }).toThrow("Missing required parameter '<files...>'.");
        });

        it('throws on required after optional at runtime', () => {
            expect(() => {
                parseArgsPlus(
                    {
                        parameters: ['[opt]', '<req>'],
                        args: ['a', 'b'],
                    },
                    [parameters]
                );
            }).toThrow("Required parameter '<req>' cannot appear after an optional parameter.");
        });

        it('throws on more than one spread parameter at runtime', () => {
            expect(() => {
                parseArgsPlus(
                    {
                        parameters: ['<a...>', '<b...>'],
                        args: ['x'],
                    },
                    [parameters]
                );
            }).toThrow('Spread parameter must be the last parameter.');
        });

        it('throws on spread parameter not at the end at runtime', () => {
            expect(() => {
                parseArgsPlus(
                    {
                        parameters: ['<files...>', '<name>'],
                        args: ['a', 'b'],
                    },
                    [parameters]
                );
            }).toThrow('Spread parameter must be the last parameter.');
        });

        it('throws on invalid parameter format', () => {
            expect(() => {
                parseArgsPlus(
                    {
                        parameters: ['name'],
                        args: ['hello'],
                    },
                    [parameters]
                );
            }).toThrow("Invalid parameter definition: 'name'.");
        });

        it('enables allowPositionals in config transform', () => {
            const transformConfig = parameters[0];
            const result = transformConfig({
                parameters: ['<name>'],
                args: ['hello'],
            });
            expect(result.allowPositionals).toBe(true);
        });

        it('passes through when no parameters config', () => {
            const result = parseArgsPlus(
                {
                    args: [],
                    strict: false,
                },
                [parameters]
            );
            expect(result.parameters).toBeUndefined();
        });

        it('passes through when parameters is empty array', () => {
            const result = parseArgsPlus(
                {
                    parameters: [],
                    args: [],
                },
                [parameters]
            );
            expect(result.parameters).toBeUndefined();
        });

        it('is a valid middleware tuple', () => {
            expect(Array.isArray(parameters)).toBe(true);
            expect(parameters).toHaveLength(2);
            expect(typeof parameters[0]).toBe('function');
            expect(typeof parameters[1]).toBe('function');
        });

        it('has resultOrder 15 on transformResult', () => {
            expect(parameters[1].order).toBe(15);
        });

        it('works with options alongside parameters', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        verbose: { type: 'boolean', short: 'v' },
                    },
                    parameters: ['<name>'],
                    args: ['-v', 'hello'],
                },
                [parameters]
            );
            expect(result.values.verbose).toBe(true);
            expect(result.parameters).toEqual({ name: 'hello' });
        });

        it('works with help middleware', () => {
            const result = parseArgsPlus(
                {
                    name: 'my-cli',
                    version: '1.0.0',
                    parameters: ['<name>', '[version]'],
                    options: {
                        verbose: { type: 'boolean' },
                    },
                    args: ['my-pkg', '2.0.0'],
                },
                [help, parameters]
            );
            expect(result.parameters).toEqual({ name: 'my-pkg', version: '2.0.0' });
        });

        it('handles required spread with single value', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<files...>'],
                    args: ['only-one.txt'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ files: ['only-one.txt'] });
        });

        it('handles complex scenario with required, optional, and spread', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<command>', '[targets...]'],
                    args: ['build', 'src', 'lib'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ command: 'build', targets: ['src', 'lib'] });
        });

        it('handles complex scenario with optional spread not provided', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<command>', '[targets...]'],
                    args: ['build'],
                },
                [parameters]
            );
            expect(result.parameters).toEqual({ command: 'build', targets: undefined });
        });
    });

    describe('commands + parameters middleware cooperation', () => {
        it('parses command-level parameters', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        install: {
                            parameters: ['<package>'],
                            description: 'Install a package',
                        },
                    },
                    args: ['install', 'lodash'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('install');
            expect(result.parameters).toEqual({ package: 'lodash' });
        });

        it('parses command-level parameters with multiple required params', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        copy: {
                            parameters: ['<source>', '<destination>'],
                            description: 'Copy files',
                        },
                    },
                    args: ['copy', 'src/file.txt', 'dist/file.txt'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('copy');
            expect(result.parameters).toEqual({ source: 'src/file.txt', destination: 'dist/file.txt' });
        });

        it('parses command-level optional parameters', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        greet: {
                            parameters: ['<name>', '[greeting]'],
                        },
                    },
                    args: ['greet', 'Alice'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('greet');
            expect(result.parameters).toEqual({ name: 'Alice', greeting: undefined });
        });

        it('parses command-level optional parameters when provided', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        greet: {
                            parameters: ['<name>', '[greeting]'],
                        },
                    },
                    args: ['greet', 'Alice', 'Hello'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('greet');
            expect(result.parameters).toEqual({ name: 'Alice', greeting: 'Hello' });
        });

        it('parses command-level spread parameters', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        install: {
                            parameters: ['<packages...>'],
                        },
                    },
                    args: ['install', 'lodash', 'express', 'chalk'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('install');
            expect(result.parameters).toEqual({ packages: ['lodash', 'express', 'chalk'] });
        });

        it('parses command-level required param followed by optional spread', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        deploy: {
                            parameters: ['<target>', '[files...]'],
                        },
                    },
                    args: ['deploy', 'production', 'app.js', 'config.json'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('deploy');
            expect(result.parameters).toEqual({ target: 'production', files: ['app.js', 'config.json'] });
        });

        it('parses command-level required param followed by optional spread when spread is empty', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        deploy: {
                            parameters: ['<target>', '[files...]'],
                        },
                    },
                    args: ['deploy', 'production'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('deploy');
            expect(result.parameters).toEqual({ target: 'production', files: undefined });
        });

        it('enables allowPositionals automatically when command has parameters', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        install: {
                            parameters: ['<package>'],
                        },
                    },
                    args: ['install', 'lodash'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('install');
            expect(result.parameters).toEqual({ package: 'lodash' });
            expect(result.positionals).toEqual(['lodash']);
        });

        it('does not add parameters when command has no parameters defined', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        build: {
                            options: {
                                watch: { type: 'boolean' },
                            },
                        },
                    },
                    args: ['build', '--watch'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('build');
            expect(result.parameters).toBeUndefined();
        });

        it('works with command options alongside command parameters', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        install: {
                            parameters: ['<package>'],
                            options: {
                                'save-dev': { type: 'boolean', short: 'D' },
                            },
                        },
                    },
                    args: ['install', '-D', 'lodash'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('install');
            expect(result.values['save-dev']).toBe(true);
            expect(result.parameters).toEqual({ package: 'lodash' });
        });

        it('works with global options alongside command parameters', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        verbose: { type: 'boolean', short: 'v' },
                    },
                    commands: {
                        install: {
                            parameters: ['<package>'],
                        },
                    },
                    args: ['-v', 'install', 'lodash'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('install');
            expect(result.values.verbose).toBe(true);
            expect(result.parameters).toEqual({ package: 'lodash' });
        });

        it('works with all three middlewares: help, commands, and parameters', () => {
            const result = parseArgsPlus(
                {
                    name: 'my-cli',
                    version: '1.0.0',
                    options: {
                        verbose: { type: 'boolean' },
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
            expect(result.command).toBe('install');
            expect(result.parameters).toEqual({ package: 'lodash', version: '4.17.21' });
        });

        it('different commands can have different parameters', () => {
            const r1 = parseArgsPlus(
                {
                    commands: {
                        install: {
                            parameters: ['<packages...>'],
                        },
                        copy: {
                            parameters: ['<source>', '<destination>'],
                        },
                    },
                    args: ['install', 'lodash', 'express'],
                },
                [commands, parameters]
            );
            expect(r1.command).toBe('install');
            expect(r1.parameters).toEqual({ packages: ['lodash', 'express'] });

            const r2 = parseArgsPlus(
                {
                    commands: {
                        install: {
                            parameters: ['<packages...>'],
                        },
                        copy: {
                            parameters: ['<source>', '<destination>'],
                        },
                    },
                    args: ['copy', 'a.txt', 'b.txt'],
                },
                [commands, parameters]
            );
            expect(r2.command).toBe('copy');
            expect(r2.parameters).toEqual({ source: 'a.txt', destination: 'b.txt' });
        });

        it('throws on missing required command parameter', () => {
            expect(() => {
                parseArgsPlus(
                    {
                        commands: {
                            install: {
                                parameters: ['<package>'],
                            },
                        },
                        args: ['install'],
                    },
                    [commands, parameters]
                );
            }).toThrow("Missing required parameter '<package>'.");
        });

        it('throws on missing required spread command parameter', () => {
            expect(() => {
                parseArgsPlus(
                    {
                        commands: {
                            install: {
                                parameters: ['<packages...>'],
                            },
                        },
                        args: ['install'],
                    },
                    [commands, parameters]
                );
            }).toThrow("Missing required parameter '<packages...>'.");
        });

        it('converts hyphenated command parameter names to camelCase', () => {
            const result = parseArgsPlus(
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
            expect(result.command).toBe('install');
            expect(result.parameters).toEqual({ packageName: '@scope/pkg' });
        });

        it('converts space-separated command parameter names to camelCase', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        install: {
                            parameters: ['<package name>'],
                        },
                    },
                    args: ['install', '@scope/pkg'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('install');
            expect(result.parameters).toEqual({ packageName: '@scope/pkg' });
        });

        it('uses top-level parameters when no commands config is present', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<name>'],
                    args: ['hello'],
                },
                [commands, parameters]
            );
            expect(result.parameters).toEqual({ name: 'hello' });
        });

        it('does not set allowPositionals on top-level config when commands are present', () => {
            const transformConfig = parameters[0];
            const result = transformConfig({
                parameters: ['<name>'],
                commands: { install: {} },
                args: ['install', 'hello'],
            });
            // Should NOT set allowPositionals because commands middleware handles it
            expect(result.allowPositionals).toBeUndefined();
        });

        it('ignores top-level parameters when command is resolved', () => {
            const result = parseArgsPlus(
                {
                    parameters: ['<top-level>'],
                    commands: {
                        install: {
                            parameters: ['<package>'],
                        },
                    },
                    args: ['install', 'lodash'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('install');
            expect(result.parameters).toEqual({ package: 'lodash' });
        });

        it('works with defaultCommand and command parameters', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        run: {
                            parameters: ['<script>'],
                        },
                    },
                    defaultCommand: 'run',
                    args: ['build'],
                },
                [commands, parameters]
            );
            expect(result.command).toBe('run');
            expect(result.parameters).toEqual({ script: 'build' });
        });

        it('middleware order does not matter (commands before parameters)', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        install: {
                            parameters: ['<package>'],
                        },
                    },
                    args: ['install', 'lodash'],
                },
                [commands, parameters]
            );
            expect(result.parameters).toEqual({ package: 'lodash' });
        });

        it('middleware order does not matter (parameters before commands)', () => {
            const result = parseArgsPlus(
                {
                    commands: {
                        install: {
                            parameters: ['<package>'],
                        },
                    },
                    args: ['install', 'lodash'],
                },
                [parameters, commands]
            );
            expect(result.parameters).toEqual({ package: 'lodash' });
        });
    });

    describe('parameters middleware - mismatched brackets', () => {
        it('throws on mismatched brackets <name]', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        parameters: ['<name]'],
                        args: ['hello'],
                    },
                    [parameters]
                )
            ).toThrow('Mismatched brackets');
        });

        it('throws on mismatched brackets [name>', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        parameters: ['[name>'],
                        args: ['hello'],
                    },
                    [parameters]
                )
            ).toThrow('Mismatched brackets');
        });
    });

    describe('parameters middleware - version flag bypass', () => {
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

        it('skips parameter extraction when --version is passed', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        parameters: ['<name>'],
                        args: ['--version'],
                    },
                    [help, parameters]
                )
            ).toThrow('process.exit called');
            expect(consoleLogSpy).toHaveBeenCalledWith('1.0.0');
        });
    });

    describe('help + parameters middleware cooperation', () => {
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

        it('shows parameters in usage line when --help is passed with parameters', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        parameters: ['<name>', '[version]'],
                        options: {},
                        args: ['--help'],
                    },
                    [help, parameters]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('<name> [version]');
        });

        it('shows help without parameter suffix when parameters is empty array', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        parameters: [],
                        options: {},
                        args: ['--help'],
                    },
                    [help, parameters]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('my-cli [options]');
            expect(output).not.toContain('<');
        });

        it('shows command parameters in usage line when --help is passed after command', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        options: {},
                        commands: {
                            install: {
                                description: 'Install a package',
                                parameters: ['<package>', '[version]'],
                            },
                        },
                        args: ['install', '--help'],
                    },
                    [help, commands, parameters]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('<package> [version]');
        });
    });

    describe('camelCase middleware', () => {
        it('converts camelCase option keys to kebab-case CLI flags', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        saveDev: { type: 'boolean' },
                    },
                    args: ['--save-dev'],
                },
                [camelCase]
            );
            expect(result.values.saveDev).toBe(true);
        });

        it('converts multi-word camelCase keys', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        outputDir: { type: 'string' },
                    },
                    args: ['--output-dir', './dist'],
                },
                [camelCase]
            );
            expect(result.values.outputDir).toBe('./dist');
        });

        it('leaves single-word keys unchanged', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        verbose: { type: 'boolean' },
                    },
                    args: ['--verbose'],
                },
                [camelCase]
            );
            expect(result.values.verbose).toBe(true);
        });

        it('handles acronyms in option keys (lossy roundtrip)', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        enableSsr: { type: 'boolean' },
                    },
                    args: ['--enable-ssr'],
                },
                [camelCase]
            );
            expect(result.values.enableSsr).toBe(true);
        });

        it('handles complex acronym patterns (lossy roundtrip)', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        useHttpsProxy: { type: 'boolean' },
                    },
                    args: ['--use-https-proxy'],
                },
                [camelCase]
            );
            expect(result.values.useHttpsProxy).toBe(true);
        });

        it('works with short aliases', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        saveDev: { type: 'boolean', short: 'D' },
                    },
                    args: ['-D'],
                },
                [camelCase]
            );
            expect(result.values.saveDev).toBe(true);
        });

        it('works with string type options', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        outputDir: { type: 'string' },
                        logLevel: { type: 'string' },
                    },
                    args: ['--output-dir', './dist', '--log-level', 'debug'],
                },
                [camelCase]
            );
            expect(result.values.outputDir).toBe('./dist');
            expect(result.values.logLevel).toBe('debug');
        });

        it('works with default values', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        outputDir: { type: 'string', default: './build' },
                    },
                    args: [],
                },
                [camelCase]
            );
            expect(result.values.outputDir).toBe('./build');
        });

        it('works with multiple option', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        includePath: { type: 'string', multiple: true },
                    },
                    args: ['--include-path', './src', '--include-path', './lib'],
                },
                [camelCase]
            );
            expect(result.values.includePath).toEqual(['./src', './lib']);
        });

        it('does not convert token names (low-level API)', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        saveDev: { type: 'boolean' },
                    },
                    tokens: true,
                    args: ['--save-dev'],
                },
                [camelCase]
            );
            expect(result.values.saveDev).toBe(true);
            const optionToken = result.tokens.find(t => t.kind === 'option');
            expect(optionToken.name).toBe('save-dev');
            expect(optionToken.rawName).toBe('--save-dev');
        });

        it('works with allowNegative', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        useColor: { type: 'boolean' },
                    },
                    allowNegative: true,
                    args: ['--no-use-color'],
                },
                [camelCase]
            );
            expect(result.values.useColor).toBe(false);
        });

        it('works with empty options', () => {
            const result = parseArgsPlus(
                {
                    options: {},
                    args: [],
                },
                [camelCase]
            );
            expect(result.values).toEqual({});
        });

        it('works without options in config', () => {
            const result = parseArgsPlus(
                {
                    args: [],
                    strict: false,
                },
                [camelCase]
            );
            expect(result.values).toEqual({});
        });

        it('is a valid middleware tuple', () => {
            expect(Array.isArray(camelCase)).toBe(true);
            expect(camelCase.length).toBe(2);
            expect(typeof camelCase[0]).toBe('function');
            expect(typeof camelCase[1]).toBe('function');
        });

        it('has order 5 on transformConfig and 15 on transformResult', () => {
            expect(camelCase[0].order).toBe(5);
            expect(camelCase[1].order).toBe(15);
        });

        it('converts multiple camelCase options in one call', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        saveDev: { type: 'boolean' },
                        outputDir: { type: 'string' },
                        logLevel: { type: 'string', default: 'info' },
                    },
                    args: ['--save-dev', '--output-dir', './dist'],
                },
                [camelCase]
            );
            expect(result.values.saveDev).toBe(true);
            expect(result.values.outputDir).toBe('./dist');
            expect(result.values.logLevel).toBe('info');
        });
    });

    describe('camelCase + help middleware cooperation', () => {
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

        it('shows kebab-case flags in help output', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '1.0.0',
                        options: {
                            saveDev: { type: 'boolean', description: 'Save as dev dependency' },
                            outputDir: { type: 'string', description: 'Output directory' },
                        },
                        args: ['--help'],
                    },
                    [camelCase, help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('--save-dev');
            expect(output).toContain('--output-dir');
            expect(output).toContain('Save as dev dependency');
            expect(output).toContain('Output directory');
        });

        it('does not interfere with help and version flags', () => {
            const result = parseArgsPlus(
                {
                    name: 'my-cli',
                    version: '1.0.0',
                    options: {
                        saveDev: { type: 'boolean' },
                    },
                    args: ['--save-dev'],
                },
                [camelCase, help]
            );
            expect(result.values.saveDev).toBe(true);
            expect(result.values.help).toBeUndefined();
            expect(result.values.version).toBeUndefined();
        });

        it('prints version correctly with camelCase middleware', () => {
            expect(() =>
                parseArgsPlus(
                    {
                        name: 'my-cli',
                        version: '2.0.0',
                        options: {
                            saveDev: { type: 'boolean' },
                        },
                        args: ['--version'],
                    },
                    [camelCase, help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('2.0.0');
        });
    });

    describe('camelCase + commands middleware cooperation', () => {
        it('converts command-level option keys', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        logLevel: { type: 'string' },
                    },
                    commands: {
                        install: {
                            options: {
                                saveDev: { type: 'boolean' },
                            },
                            allowPositionals: true,
                        },
                    },
                    args: ['install', '--save-dev', '--log-level', 'debug', 'my-package'],
                },
                [camelCase, commands]
            );
            expect(result.command).toBe('install');
            expect(result.values.saveDev).toBe(true);
            expect(result.values.logLevel).toBe('debug');
            expect(result.positionals).toEqual(['my-package']);
        });

        it('converts global option keys with commands', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        outputDir: { type: 'string' },
                    },
                    commands: {
                        build: {
                            options: {
                                watchMode: { type: 'boolean' },
                            },
                        },
                    },
                    args: ['--output-dir', './dist', 'build', '--watch-mode'],
                },
                [camelCase, commands]
            );
            expect(result.command).toBe('build');
            expect(result.values.outputDir).toBe('./dist');
            expect(result.values.watchMode).toBe(true);
        });

        it('does not convert command names', () => {
            const result = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        'run-script': {
                            options: {},
                            allowPositionals: true,
                        },
                    },
                    args: ['run-script', 'build'],
                },
                [camelCase, commands]
            );
            expect(result.command).toBe('run-script');
            expect(result.positionals).toEqual(['build']);
        });

        it('works with defaultCommand', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        watchMode: { type: 'boolean' },
                    },
                    commands: {
                        run: {
                            options: {},
                        },
                    },
                    defaultCommand: 'run',
                    args: ['--watch-mode'],
                },
                [camelCase, commands]
            );
            expect(result.command).toBe('run');
            expect(result.values.watchMode).toBe(true);
        });

        it('handles commands with no options', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        logLevel: { type: 'string' },
                    },
                    commands: {
                        clean: {
                            description: 'Clean build artifacts',
                        },
                    },
                    args: ['--log-level', 'info', 'clean'],
                },
                [camelCase, commands]
            );
            expect(result.command).toBe('clean');
            expect(result.values.logLevel).toBe('info');
        });
    });

    describe('camelCase + commands + help middleware cooperation', () => {
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

        it('shows kebab-case flags in command help', () => {
            expect(() =>
                parseArgsPlus(
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
                                    saveDev: { type: 'boolean', description: 'Save as dev dependency' },
                                },
                            },
                        },
                        args: ['install', '--help'],
                    },
                    [camelCase, commands, help]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('--save-dev');
            expect(output).toContain('Save as dev dependency');
            expect(output).toContain('--log-level');
            expect(output).toContain('Log level');
        });

        it('does not interfere with normal command parsing', () => {
            const result = parseArgsPlus(
                {
                    name: 'my-cli',
                    version: '1.0.0',
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
                    args: ['build', '--watch-mode', '--log-level', 'debug'],
                },
                [camelCase, commands, help]
            );
            expect(result.command).toBe('build');
            expect(result.values.watchMode).toBe(true);
            expect(result.values.logLevel).toBe('debug');
        });
    });

    describe('camelCase + parameters middleware cooperation', () => {
        it('works alongside parameters middleware', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        saveDev: { type: 'boolean', short: 'D' },
                    },
                    parameters: ['<package name>'],
                    args: ['-D', 'my-package'],
                },
                [camelCase, parameters]
            );
            expect(result.values.saveDev).toBe(true);
            expect(result.parameters.packageName).toBe('my-package');
        });

        it('works with all three middlewares', () => {
            const result = parseArgsPlus(
                {
                    name: 'my-cli',
                    version: '1.0.0',
                    options: {
                        saveDev: { type: 'boolean', description: 'Dev dependency' },
                    },
                    parameters: ['<package>'],
                    args: ['--save-dev', 'lodash'],
                },
                [camelCase, help, parameters]
            );
            expect(result.values.saveDev).toBe(true);
            expect(result.parameters.package).toBe('lodash');
        });
    });

    describe('camelCase + commands + parameters middleware cooperation', () => {
        it('converts option keys and maps parameters for commands', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        logLevel: { type: 'string' },
                    },
                    commands: {
                        install: {
                            options: {
                                saveDev: { type: 'boolean' },
                            },
                            parameters: ['<package name>'],
                        },
                    },
                    args: ['install', '--save-dev', '--log-level', 'debug', 'my-package'],
                },
                [camelCase, commands, parameters]
            );
            expect(result.command).toBe('install');
            expect(result.values.saveDev).toBe(true);
            expect(result.values.logLevel).toBe('debug');
            expect(result.parameters.packageName).toBe('my-package');
        });
    });

    describe('optional-value middleware', () => {
        it('allows a string option to be used bare (no value)', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                    },
                    args: ['--filter'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('');
        });

        it('allows a string option with a value', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                    },
                    args: ['--filter', 'pattern'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('pattern');
        });

        it('allows a string option with inline value (=)', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                    },
                    args: ['--filter=pattern'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('pattern');
        });

        it('allows a string option with inline empty value (--opt=)', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                    },
                    args: ['--filter='],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('');
        });

        it('allows multiple: true with bare usage', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', multiple: true, optionalValue: true },
                    },
                    args: ['--filter'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toEqual(['']);
        });

        it('allows multiple: true with mixed bare and valued usage', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', multiple: true, optionalValue: true },
                    },
                    args: ['--filter', 'a', '--filter'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toEqual(['a', '']);
        });

        it('allows multiple: true with multiple values', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', multiple: true, optionalValue: true },
                    },
                    args: ['--filter', 'a', '--filter', 'b'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toEqual(['a', 'b']);
        });

        it('allows multiple: true with bare followed by valued', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', multiple: true, optionalValue: true },
                    },
                    args: ['--filter', '--filter', 'b'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toEqual(['', 'b']);
        });

        it('handles bare option followed by another known option', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                        verbose: { type: 'boolean' },
                    },
                    args: ['--filter', '--verbose'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('');
            expect(result.values.verbose).toBe(true);
        });

        it('handles bare short option', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', short: 'f', optionalValue: true },
                    },
                    args: ['-f'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('');
        });

        it('handles short option with value', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', short: 'f', optionalValue: true },
                    },
                    args: ['-f', 'pattern'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('pattern');
        });

        it('handles bare short option followed by another flag', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', short: 'f', optionalValue: true },
                        verbose: { type: 'boolean', short: 'v' },
                    },
                    args: ['-f', '-v'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('');
            expect(result.values.verbose).toBe(true);
        });

        it('does not rewrite after option terminator (--)', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                    },
                    allowPositionals: true,
                    args: ['--filter', 'val', '--', '--filter'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('val');
            expect(result.positionals).toEqual(['--filter']);
        });

        it('does not affect boolean options', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        verbose: { type: 'boolean' },
                        filter: { type: 'string', optionalValue: true },
                    },
                    args: ['--verbose', '--filter'],
                },
                [optionalValue]
            );
            expect(result.values.verbose).toBe(true);
            expect(result.values.filter).toBe('');
        });

        it('does not affect string options without optionalValue', () => {
            expect(() => {
                parseArgsPlus(
                    {
                        options: {
                            name: { type: 'string' },
                        },
                        args: ['--name'],
                    },
                    [optionalValue]
                );
            }).toThrow();
        });

        it('passes through when no options have optionalValue', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        name: { type: 'string' },
                    },
                    args: ['--name', 'hello'],
                },
                [optionalValue]
            );
            expect(result.values.name).toBe('hello');
        });

        it('passes through when options is undefined', () => {
            const result = parseArgsPlus(
                {
                    args: [],
                    strict: false,
                },
                [optionalValue]
            );
            expect(result.values).toEqual({});
        });

        it('treats a single hyphen (-) as a value, not a flag', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                    },
                    args: ['--filter', '-'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('-');
        });

        it('is a valid middleware tuple', () => {
            expect(Array.isArray(optionalValue)).toBe(true);
            expect(optionalValue).toHaveLength(2);
            expect(typeof optionalValue[0]).toBe('function');
            expect(typeof optionalValue[1]).toBe('function');
        });

        it('has order 7 on transformConfig', () => {
            expect(optionalValue[0].order).toBe(7);
        });

        it('works with default values', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true, default: 'all' },
                    },
                    args: ['--filter'],
                },
                [optionalValue]
            );
            // Bare --filter gives explicit empty string, overriding default
            expect(result.values.filter).toBe('');
        });

        it('returns default when option not passed at all', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true, default: 'all' },
                    },
                    args: [],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('all');
        });

        it('handles multiple optionalValue options', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                        format: { type: 'string', optionalValue: true },
                    },
                    args: ['--filter', '--format', 'json'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('');
            expect(result.values.format).toBe('json');
        });

        it('handles multiple optionalValue options both bare', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                        format: { type: 'string', optionalValue: true },
                    },
                    args: ['--filter', '--format'],
                },
                [optionalValue]
            );
            expect(result.values.filter).toBe('');
            expect(result.values.format).toBe('');
        });
    });

    describe('optional-value + help middleware cooperation', () => {
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

        it('shows [<value>] suffix for options with optionalValue: true', () => {
            try {
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {
                            filter: { type: 'string', optionalValue: true, description: 'Filter results' },
                        },
                        args: ['--help'],
                    },
                    [optionalValue, help]
                );
            } catch {}

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('[<value>]');
            expect(output).toContain('--filter [<value>]');
        });

        it('shows <value> for regular string options alongside [<value>] for optionalValue', () => {
            try {
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {
                            name: { type: 'string', description: 'Your name' },
                            filter: { type: 'string', optionalValue: true, description: 'Filter results' },
                        },
                        args: ['--help'],
                    },
                    [optionalValue, help]
                );
            } catch {}

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('--name <value>');
            expect(output).toContain('--filter [<value>]');
        });

        it('does not interfere with help when option has a value', () => {
            const result = parseArgsPlus(
                {
                    name: 'test-cli',
                    version: '1.0.0',
                    options: {
                        filter: { type: 'string', optionalValue: true, description: 'Filter' },
                    },
                    args: ['--filter', 'pattern'],
                },
                [optionalValue, help]
            );
            expect(result.values.filter).toBe('pattern');
        });
    });

    describe('optional-value + commands middleware cooperation', () => {
        it('handles optionalValue on global options bare before command', () => {
            const result = parseArgsPlus(
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
                    args: ['build', '--filter', '--watch'],
                },
                [optionalValue, commands]
            );
            expect(result.values.filter).toBe('');
            expect(result.command).toBe('build');
            expect(result.values.watch).toBe(true);
        });

        it('handles optionalValue on global options with value before command', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                    },
                    commands: {
                        build: {
                            options: {},
                        },
                    },
                    args: ['--filter', 'pattern', 'build'],
                },
                [optionalValue, commands]
            );
            expect(result.values.filter).toBe('pattern');
            expect(result.command).toBe('build');
        });

        it('handles optionalValue on command-level options', () => {
            const result = parseArgsPlus(
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
            expect(result.command).toBe('build');
            expect(result.values.mode).toBe('');
        });

        it('handles optionalValue on command-level options with value', () => {
            const result = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        build: {
                            options: {
                                mode: { type: 'string', optionalValue: true },
                            },
                        },
                    },
                    args: ['build', '--mode', 'production'],
                },
                [optionalValue, commands]
            );
            expect(result.command).toBe('build');
            expect(result.values.mode).toBe('production');
        });
    });

    describe('optional-value + camelCase middleware cooperation', () => {
        it('works with camelCase option keys bare', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        logLevel: { type: 'string', optionalValue: true },
                    },
                    args: ['--log-level'],
                },
                [camelCase, optionalValue]
            );
            expect(result.values.logLevel).toBe('');
        });

        it('works with camelCase option keys with value', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        logLevel: { type: 'string', optionalValue: true },
                    },
                    args: ['--log-level', 'debug'],
                },
                [camelCase, optionalValue]
            );
            expect(result.values.logLevel).toBe('debug');
        });

        it('works with camelCase short option bare', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        logLevel: { type: 'string', short: 'l', optionalValue: true },
                    },
                    args: ['-l'],
                },
                [camelCase, optionalValue]
            );
            expect(result.values.logLevel).toBe('');
        });
    });

    describe('optional-value + parameters middleware cooperation', () => {
        it('works alongside parameters middleware with bare option', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                    },
                    parameters: ['<name>'],
                    args: ['--filter', '--', 'hello'],
                },
                [optionalValue, parameters]
            );
            expect(result.values.filter).toBe('');
            expect(result.parameters.name).toBe('hello');
        });

        it('works alongside parameters with option before positional', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                    },
                    parameters: ['<name>'],
                    args: ['hello', '--filter'],
                },
                [optionalValue, parameters]
            );
            expect(result.values.filter).toBe('');
            expect(result.parameters.name).toBe('hello');
        });

        it('works with optionalValue option taking a value alongside parameters', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                    },
                    parameters: ['<name>'],
                    args: ['--filter', 'pattern', 'hello'],
                },
                [optionalValue, parameters]
            );
            expect(result.values.filter).toBe('pattern');
            expect(result.parameters.name).toBe('hello');
        });
    });

    describe('optional-value + commands + help middleware cooperation', () => {
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

        it('shows [<value>] for command options with optionalValue in help', () => {
            try {
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {},
                        commands: {
                            build: {
                                description: 'Build the project',
                                options: {
                                    mode: { type: 'string', optionalValue: true, description: 'Build mode' },
                                },
                            },
                        },
                        args: ['build', '--help'],
                    },
                    [optionalValue, commands, help]
                );
            } catch {}

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('--mode [<value>]');
        });
    });

    describe('custom-value middleware', () => {
        it('transforms a string value using Number constructor', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: Number },
                    },
                    args: ['--port', '8080'],
                },
                [customValue]
            );
            expect(result.values.port).toBe(8080);
            expect(typeof result.values.port).toBe('number');
        });

        it('transforms a string value using a custom function', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        tags: { type: v => v.split(',') },
                    },
                    args: ['--tags', 'a,b,c'],
                },
                [customValue]
            );
            expect(result.values.tags).toEqual(['a', 'b', 'c']);
        });

        it('transforms a string value using JSON.parse', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        data: { type: JSON.parse },
                    },
                    args: ['--data', '{"a":1}'],
                },
                [customValue]
            );
            expect(result.values.data).toEqual({ a: 1 });
        });

        it('leaves regular string options untouched', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        name: { type: 'string' },
                        port: { type: Number },
                    },
                    args: ['--name', 'hello', '--port', '3000'],
                },
                [customValue]
            );
            expect(result.values.name).toBe('hello');
            expect(result.values.port).toBe(3000);
        });

        it('leaves regular boolean options untouched', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        verbose: { type: 'boolean' },
                        port: { type: Number },
                    },
                    args: ['--verbose', '--port', '42'],
                },
                [customValue]
            );
            expect(result.values.verbose).toBe(true);
            expect(result.values.port).toBe(42);
        });

        it('handles multiple: true by passing the whole array to the factory', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: values => values.map(Number), multiple: true },
                    },
                    args: ['--port', '80', '--port', '443'],
                },
                [customValue]
            );
            expect(result.values.port).toEqual([80, 443]);
        });

        it('does not transform undefined values (option not passed)', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: Number },
                    },
                    args: [],
                    strict: false,
                },
                [customValue]
            );
            expect(result.values.port).toBeUndefined();
        });

        it('transforms default values (defaults are indistinguishable from CLI input)', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: Number, default: '3000' },
                    },
                    args: [],
                },
                [customValue]
            );
            // parseArgs puts default '3000' into values as a string,
            // the middleware transforms it just like a CLI-provided value
            expect(result.values.port).toBe(3000);
        });

        it('transforms value when option is passed, even with default', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: Number, default: '3000' },
                    },
                    args: ['--port', '8080'],
                },
                [customValue]
            );
            expect(result.values.port).toBe(8080);
        });

        it('works with short aliases', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: Number, short: 'p' },
                    },
                    args: ['-p', '9090'],
                },
                [customValue]
            );
            expect(result.values.port).toBe(9090);
        });

        it('passes through when no options have function types', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        name: { type: 'string' },
                        verbose: { type: 'boolean' },
                    },
                    args: ['--name', 'test', '--verbose'],
                },
                [customValue]
            );
            expect(result.values.name).toBe('test');
            expect(result.values.verbose).toBe(true);
        });

        it('passes through when options is undefined', () => {
            const result = parseArgsPlus(
                {
                    args: [],
                    strict: false,
                },
                [customValue]
            );
            expect(result.values).toEqual({});
        });

        it('is a valid middleware tuple', () => {
            expect(customValue).toHaveLength(2);
            expect(typeof customValue[0]).toBe('function');
            expect(typeof customValue[1]).toBe('function');
        });

        it('has order 6 on transformConfig and 12 on transformResult', () => {
            expect(customValue[0].order).toBe(6);
            expect(customValue[1].order).toBe(12);
        });

        it('handles multiple function-typed options', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: Number },
                        count: { type: Number },
                    },
                    args: ['--port', '80', '--count', '5'],
                },
                [customValue]
            );
            expect(result.values.port).toBe(80);
            expect(result.values.count).toBe(5);
        });

        it('transforms inline value (=)', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: Number },
                    },
                    args: ['--port=8080'],
                },
                [customValue]
            );
            expect(result.values.port).toBe(8080);
        });
    });

    describe('custom-value + commands middleware cooperation', () => {
        it('transforms command-level function-typed options', () => {
            const result = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        serve: {
                            options: {
                                port: { type: Number },
                            },
                        },
                    },
                    args: ['serve', '--port', '3000'],
                },
                [customValue, commands]
            );
            expect(result.values.port).toBe(3000);
        });

        it('transforms global function-typed options with commands', () => {
            const result = parseArgsPlus(
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
                    args: ['--timeout', '30', 'serve', '--port', '8080'],
                },
                [customValue, commands]
            );
            expect(result.values.timeout).toBe(30);
            expect(result.values.port).toBe(8080);
        });

        it('leaves string command options untouched', () => {
            const result = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        build: {
                            options: {
                                outdir: { type: 'string' },
                                port: { type: Number },
                            },
                        },
                    },
                    args: ['build', '--outdir', 'dist', '--port', '5000'],
                },
                [customValue, commands]
            );
            expect(result.values.outdir).toBe('dist');
            expect(result.values.port).toBe(5000);
        });
    });

    describe('custom-value + camelCase middleware cooperation', () => {
        it('transforms camelCase options with function types', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        serverPort: { type: Number },
                    },
                    args: ['--server-port', '4000'],
                },
                [customValue, camelCase]
            );
            expect(result.values.serverPort).toBe(4000);
        });

        it('transforms multiple camelCase options with function types', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        serverPort: { type: Number },
                        maxRetries: { type: Number },
                    },
                    args: ['--server-port', '4000', '--max-retries', '3'],
                },
                [customValue, camelCase]
            );
            expect(result.values.serverPort).toBe(4000);
            expect(result.values.maxRetries).toBe(3);
        });
    });

    describe('custom-value + camelCase + commands middleware cooperation', () => {
        it('transforms camelCase command-level function-typed options', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        logLevel: { type: 'string' },
                    },
                    commands: {
                        serve: {
                            options: {
                                serverPort: { type: Number },
                            },
                        },
                    },
                    args: ['--log-level', 'debug', 'serve', '--server-port', '3000'],
                },
                [customValue, camelCase, commands]
            );
            expect(result.values.logLevel).toBe('debug');
            expect(result.values.serverPort).toBe(3000);
        });
    });

    describe('custom-value + optionalValue middleware cooperation', () => {
        it('transforms a string optionalValue option post-parse via custom function', () => {
            // customValue (order 6) converts type: Number → type: 'string',
            // then optionalValue (order 7) sees type: 'string' + optionalValue: true
            // and can rewrite bare options. Both middlewares coexist on separate
            // or the same options.
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                        port: { type: Number },
                    },
                    args: ['--filter', '--port', '8080'],
                },
                [customValue, optionalValue]
            );
            // optionalValue rewrites bare --filter to --filter= (empty string)
            expect(result.values.filter).toBe('');
            // customValue transforms --port value
            expect(result.values.port).toBe(8080);
        });

        it('both middlewares work side by side on different options', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                        port: { type: Number },
                    },
                    args: ['--filter', 'pattern', '--port', '3000'],
                },
                [customValue, optionalValue]
            );
            expect(result.values.filter).toBe('pattern');
            expect(result.values.port).toBe(3000);
        });

        it('supports optionalValue on an option with function type (bare usage)', () => {
            // customValue (order 6) replaces type: Number with type: 'string',
            // then optionalValue (order 7) sees type: 'string' + optionalValue: true
            // and rewrites bare --port to --port= (empty string).
            // Finally customValue result transform calls Number('') → 0.
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: Number, optionalValue: true },
                    },
                    args: ['--port'],
                },
                [customValue, optionalValue]
            );
            expect(result.values.port).toBe(0);
        });

        it('supports optionalValue on an option with function type (with value)', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: Number, optionalValue: true },
                    },
                    args: ['--port', '8080'],
                },
                [customValue, optionalValue]
            );
            expect(result.values.port).toBe(8080);
        });

        it('supports optionalValue on an option with function type (inline value)', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: Number, optionalValue: true },
                    },
                    args: ['--port=3000'],
                },
                [customValue, optionalValue]
            );
            expect(result.values.port).toBe(3000);
        });

        it('supports optionalValue + function type with short alias bare', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: Number, optionalValue: true, short: 'p' },
                    },
                    args: ['-p'],
                },
                [customValue, optionalValue]
            );
            expect(result.values.port).toBe(0);
        });

        it('supports optionalValue + function type with short alias and value', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        port: { type: Number, optionalValue: true, short: 'p' },
                    },
                    args: ['-p', '443'],
                },
                [customValue, optionalValue]
            );
            expect(result.values.port).toBe(443);
        });

        it('supports optionalValue + function type + camelCase', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        serverPort: { type: Number, optionalValue: true },
                    },
                    args: ['--server-port'],
                },
                [camelCase, customValue, optionalValue]
            );
            expect(result.values.serverPort).toBe(0);
        });

        it('supports optionalValue + function type + camelCase with value', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        serverPort: { type: Number, optionalValue: true },
                    },
                    args: ['--server-port', '9090'],
                },
                [camelCase, customValue, optionalValue]
            );
            expect(result.values.serverPort).toBe(9090);
        });
    });

    describe('custom-value + help middleware cooperation', () => {
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

        it('does not interfere with help when function-typed options are present', () => {
            const result = parseArgsPlus(
                {
                    name: 'test-cli',
                    version: '1.0.0',
                    options: {
                        port: { type: Number, description: 'Port number' },
                        name: { type: 'string' },
                    },
                    args: ['--port', '3000', '--name', 'test'],
                },
                [customValue, help]
            );
            expect(result.values.port).toBe(3000);
            expect(result.values.name).toBe('test');
        });

        it('shows help without error when function-typed options exist', () => {
            try {
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {
                            port: { type: Number, description: 'Port number' },
                        },
                        args: ['--help'],
                    },
                    [customValue, help]
                );
            } catch {}

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('--port');
        });
    });

    describe('optional-value negation form (--no-) handling', () => {
        it('passes through --no-name negation form without rewriting', () => {
            const result = parseArgsPlus(
                {
                    options: {
                        filter: { type: 'string', optionalValue: true },
                    },
                    strict: false,
                    args: ['--no-filter'],
                },
                [optionalValue]
            );
            // With strict:false, --no-filter is treated as an unknown flag
            // The important thing is rewriteArgs did NOT rewrite it to --no-filter=
            expect(result.values['no-filter']).toBe(true);
        });
    });

    describe('custom-value command with no function-typed options', () => {
        it('leaves commands with only regular options unchanged', () => {
            const result = parseArgsPlus(
                {
                    options: {},
                    commands: {
                        serve: {
                            options: {
                                port: { type: Number },
                            },
                        },
                        build: {
                            options: {
                                outdir: { type: 'string' },
                            },
                        },
                    },
                    args: ['build', '--outdir', 'dist'],
                },
                [customValue, commands]
            );
            expect(result.values.outdir).toBe('dist');
        });
    });

    describe('custom-value non-string value passthrough', () => {
        it('passes through non-string values without transforming', () => {
            // Use commands middleware to produce a boolean value for a key
            // that is in the customValue transform map. Global option has
            // type: Number (function), command option has type: 'boolean'.
            // Commands middleware merges pass2 boolean value over pass1,
            // and customValue sees a boolean for a mapped key.
            const result = parseArgsPlus(
                {
                    options: {
                        debug: { type: Number },
                    },
                    commands: {
                        build: {
                            options: {
                                debug: { type: 'boolean' },
                            },
                        },
                    },
                    args: ['build', '--debug'],
                },
                [customValue, commands]
            );
            // The boolean value from command parse passes through untransformed
            expect(result.values.debug).toBe(true);
        });
    });

    describe('help narrow layout with optionalValue', () => {
        let exitSpy;
        let consoleLogSpy;
        let originalColumns;

        beforeEach(() => {
            exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
                throw new Error('process.exit called');
            });
            consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            originalColumns = process.stdout.columns;
        });

        afterEach(() => {
            exitSpy.mockRestore();
            consoleLogSpy.mockRestore();
            Object.defineProperty(process.stdout, 'columns', {
                value: originalColumns,
                writable: true,
                configurable: true,
            });
        });

        it('shows [<value>] suffix for optionalValue options in narrow layout', () => {
            Object.defineProperty(process.stdout, 'columns', {
                value: 60,
                writable: true,
                configurable: true,
            });
            try {
                parseArgsPlus(
                    {
                        name: 'test-cli',
                        version: '1.0.0',
                        options: {
                            filter: { type: 'string', optionalValue: true, description: 'Filter results' },
                        },
                        args: ['--help'],
                    },
                    [optionalValue, help]
                );
            } catch {}

            const output = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');
            expect(output).toContain('--filter [<value>]');
        });
    });

    describe('optional-value fallback to process.argv', () => {
        it('falls back to process.argv when args is not provided', () => {
            const originalArgv = process.argv;
            try {
                process.argv = ['node', 'test', '--filter'];
                const result = parseArgsPlus(
                    {
                        options: {
                            filter: { type: 'string', optionalValue: true },
                        },
                    },
                    [optionalValue]
                );
                expect(result.values.filter).toBe('');
            } finally {
                process.argv = originalArgv;
            }
        });
    });

    describe('custom-value multiple receives the whole array', () => {
        it('factory function receives the full string array for multiple: true', () => {
            const received = [];
            const result = parseArgsPlus(
                {
                    options: {
                        port: {
                            type: values => {
                                received.push(values);
                                return values.map(Number);
                            },
                            multiple: true,
                        },
                    },
                    args: ['--port', '8080', '--port', '3000'],
                },
                [customValue]
            );
            // Factory received the whole array at once
            expect(received).toEqual([['8080', '3000']]);
            expect(result.values.port).toEqual([8080, 3000]);
        });
    });

    describe('readPackageJson', () => {
        let readPackageJson;

        beforeEach(async () => {
            ({ readPackageJson } = await import('../src/package-info.js'));
        });

        it('reads the nearest package.json from import.meta.url', async () => {
            const pkg = await readPackageJson(import.meta.url);
            // This test file lives inside the node-parseargs-plus package,
            // so it should find that package.json
            expect(pkg.name).toBe('@niceties/node-parseargs-plus');
            expect(typeof pkg.version).toBe('string');
        });

        it('returns name, version, and description fields', async () => {
            const pkg = await readPackageJson(import.meta.url);
            expect(pkg).toHaveProperty('name');
            expect(pkg).toHaveProperty('version');
            // description is optional but should be present in this package
            expect(typeof pkg.description).toBe('string');
        });

        it('accepts a URL string (file:// protocol)', async () => {
            const pkg = await readPackageJson(import.meta.url);
            expect(pkg.name).toBe('@niceties/node-parseargs-plus');
        });

        it('accepts a URL object', async () => {
            const pkg = await readPackageJson(new URL(import.meta.url));
            expect(pkg.name).toBe('@niceties/node-parseargs-plus');
        });

        it('walks up directories to find package.json', async () => {
            // import.meta.url points to tests/ directory, so it must walk up
            // to find the package.json in the parent directory
            const pkg = await readPackageJson(import.meta.url);
            expect(pkg.name).toBe('@niceties/node-parseargs-plus');
        });

        it('returns a full package.json object with all fields', async () => {
            const pkg = await readPackageJson(import.meta.url);
            // Verify it's a complete package.json, not just selected fields
            expect(pkg).toHaveProperty('exports');
            expect(pkg).toHaveProperty('license');
        });

        it('returns an empty object when no package.json is found', async () => {
            // Use the filesystem root — no package.json should exist there
            const pkg = await readPackageJson('file:///package-info-test-nonexistent.js');
            expect(pkg).toEqual({});
        });
    });
});
