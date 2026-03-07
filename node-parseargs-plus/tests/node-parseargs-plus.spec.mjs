import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { helpMiddleware, parseArgsPlus } from '../src/index.js';

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
            const middleware = {
                transformConfig: vi.fn(config => ({
                    ...config,
                    options: {
                        ...config.options,
                        extra: { type: 'boolean' },
                    },
                })),
                transformResult: vi.fn(result => result),
            };

            parseArgsPlus(
                {
                    options: {
                        name: { type: 'string' },
                    },
                    args: ['--name', 'test'],
                },
                [middleware]
            );

            expect(middleware.transformConfig).toHaveBeenCalledOnce();
        });

        it('calls transformResult on each middleware in reverse order', () => {
            const order = [];
            const middleware1 = {
                transformConfig: config => config,
                transformResult: result => {
                    order.push('mw1');
                    return result;
                },
            };
            const middleware2 = {
                transformConfig: config => config,
                transformResult: result => {
                    order.push('mw2');
                    return result;
                },
            };

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

            const middleware = {
                transformConfig: config => config,
                transformResult: vi.fn((result, config) => {
                    expect(config).toBe(originalConfig);
                    return result;
                }),
            };

            parseArgsPlus(originalConfig, [middleware]);

            expect(middleware.transformResult).toHaveBeenCalledOnce();
        });

        it('allows middleware to modify the result', () => {
            const middleware = {
                transformConfig: config => config,
                transformResult: result => ({
                    ...result,
                    values: { ...result.values, injected: 'yes' },
                }),
            };

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
            const mw1 = {
                transformConfig: config => ({
                    ...config,
                    options: {
                        ...config.options,
                        flag1: { type: 'boolean' },
                    },
                }),
                transformResult: result => result,
            };
            const mw2 = {
                transformConfig: config => ({
                    ...config,
                    options: {
                        ...config.options,
                        flag2: { type: 'boolean' },
                    },
                }),
                transformResult: result => result,
            };

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

    describe('helpMiddleware', () => {
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
            const mw = helpMiddleware();
            const transformed = mw.transformConfig({
                options: {
                    name: { type: 'string' },
                },
            });
            expect(transformed.options.help).toEqual({ type: 'boolean', short: 'h' });
            expect(transformed.options.version).toEqual({ type: 'boolean', short: 'v' });
            expect(transformed.options.name).toEqual({ type: 'string' });
        });

        it('preserves existing options when adding help', () => {
            const mw = helpMiddleware();
            const transformed = mw.transformConfig({
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
                [helpMiddleware()]
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
                    [helpMiddleware()]
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
                    [helpMiddleware()]
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
                    [helpMiddleware()]
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
                    [helpMiddleware()]
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
                    [helpMiddleware()]
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
                    [helpMiddleware()]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('Usage: my-cli');
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
                    [helpMiddleware()]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('Usage: my-cli v1.0.0 [options] [arguments]');
        });

        it('shows version in usage line', () => {
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
                    [helpMiddleware()]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('Usage: my-cli v1.2.3 [options]');
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
                    [helpMiddleware()]
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
                    [helpMiddleware()]
                )
            ).toThrow('process.exit called');

            expect(exitSpy).toHaveBeenCalledWith(0);
            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('3.1.0');
        });

        it('always adds --version flag to config', () => {
            const mw = helpMiddleware();
            const transformed = mw.transformConfig({
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
                    [helpMiddleware()]
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
                    [helpMiddleware()]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('Options:');
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
                    [helpMiddleware()]
                )
            ).toThrow('process.exit called');

            const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
            expect(output).toContain('--silent');
        });

        it('works with helpMiddleware with no config argument', () => {
            const mw = helpMiddleware();
            expect(mw).toBeDefined();
            expect(typeof mw.transformConfig).toBe('function');
            expect(typeof mw.transformResult).toBe('function');
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
                [helpMiddleware()]
            );

            expect(result.values.name).toBe('Alice');
            expect(result.values.verbose).toBe(true);
            expect(result.values).not.toHaveProperty('help');
            expect(exitSpy).not.toHaveBeenCalled();
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('works alongside other middlewares', () => {
            const loggingMiddleware = {
                transformConfig: config => config,
                transformResult: result => ({
                    ...result,
                    values: { ...result.values, _logged: true },
                }),
            };

            const result = parseArgsPlus(
                {
                    name: 'test-cli',
                    version: '1.0.0',
                    options: {
                        name: { type: 'string' },
                    },
                    args: ['--name', 'test'],
                },
                [helpMiddleware(), loggingMiddleware]
            );

            expect(result.values.name).toBe('test');
            expect(result.values._logged).toBe(true);
            expect(result.values).not.toHaveProperty('help');
        });
    });
});
