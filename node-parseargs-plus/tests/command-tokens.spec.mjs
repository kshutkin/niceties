import { parseArgs } from 'node:util';

import { describe, expect, it } from 'vitest';

import { camelCase } from '../src/camel-case.js';
import { commands } from '../src/commands.js';
import { customValue } from '../src/custom-value.js';
import { parseArgsPlus } from '../src/index.js';
import { optionalValue } from '../src/optional-value.js';

describe('complete command tokens', () => {
    const options = {
        verbose: { type: 'boolean', short: 'v' },
        quiet: { type: 'boolean', short: 'q' },
        config: { type: 'string', default: 'dev.json' },
        name: { type: 'string', short: 'n' },
    };
    it.each([
        ['--verbose', 'build', '--name', 'test', 'file'],
        ['-vq', '--config=prod.json', 'build', '-ntest'],
        ['build', '--name', 'test', '--', '--literal'],
        ['--no-verbose', 'build', '--verbose'],
        ['build'],
    ])('matches native tokens, including the command positional and original indexes: %j', (...args) => {
        const result = parseArgsPlus(
            { args, tokens: true, allowNegative: true, options, commands: { build: { allowPositionals: true } } },
            [commands]
        );
        const native = parseArgs({ args, tokens: true, allowPositionals: true, allowNegative: true, options });
        expect(result.tokens).toEqual(native.tokens);
        expect(result.positionals).toEqual(native.positionals.slice(1));
    });

    it.each([['--name', 'test'], ['--verbose', 'file'], []])('does not invent a token for an implicit default command: %j', (...args) => {
        const result = parseArgsPlus(
            { args, tokens: true, options, defaultCommand: 'build', commands: { build: { allowPositionals: true } } },
            [commands]
        );
        expect(result.tokens).toEqual(parseArgs({ args, tokens: true, options, allowPositionals: true }).tokens);
    });

    it.each([false, undefined])('does not expose internal tokens when tokens is %s', tokens => {
        expect(parseArgsPlus({ args: ['build'], tokens, commands: { build: {} } }, [commands])).not.toHaveProperty('tokens');
    });

    it.each(['--filter', '-f'])('keeps raw flags and indexes across both optional-value scopes: %s', flag => {
        const port = flag === '-f' ? '-p' : '--port';
        const args = [flag, '--verbose', 'build', port, '--next'];
        const original = [...args];
        const result = parseArgsPlus(
            {
                args,
                tokens: true,
                options: { filter: { type: 'string', short: 'f', optionalValue: true }, verbose: { type: 'boolean' } },
                commands: { build: { options: { port: { type: 'string', short: 'p', optionalValue: true }, next: { type: 'boolean' } } } },
            },
            [commands, optionalValue]
        );
        expect(result.tokens).toEqual([
            { kind: 'option', name: 'filter', rawName: flag, index: 0, value: '', inlineValue: false },
            { kind: 'option', name: 'verbose', rawName: '--verbose', index: 1, value: undefined, inlineValue: undefined },
            { kind: 'positional', index: 2, value: 'build' },
            { kind: 'option', name: 'port', rawName: port, index: 3, value: '', inlineValue: false },
            { kind: 'option', name: 'next', rawName: '--next', index: 4, value: undefined, inlineValue: undefined },
        ]);
        expect(args).toEqual(original);
    });

    it('retains inline empty values as inline, and token values before custom conversion', () => {
        const result = parseArgsPlus(
            {
                args: ['build', '--server-port='],
                tokens: true,
                commands: { build: { options: { serverPort: { type: Number, optionalValue: true } } } },
            },
            [commands, customValue, optionalValue, camelCase]
        );
        expect(result.values.serverPort).toBe(0);
        expect(result.tokens).toContainEqual({
            kind: 'option',
            name: 'server-port',
            rawName: '--server-port',
            index: 1,
            value: '',
            inlineValue: true,
        });
    });

    it('remaps optional-value indexes when no command is resolved', () => {
        const result = parseArgsPlus(
            {
                args: ['-f', '--verbose'],
                tokens: true,
                options: { filter: { type: 'string', short: 'f', optionalValue: true }, verbose: { type: 'boolean' } },
                commands: { build: {} },
            },
            [commands, optionalValue]
        );
        expect(result.command).toBeUndefined();
        expect(result.tokens.map(token => token.index)).toEqual([0, 1]);
    });

    it('remaps optional-value indexes without the commands middleware', () => {
        const result = parseArgsPlus(
            {
                args: ['-f', '--verbose'],
                tokens: true,
                options: { filter: { type: 'string', short: 'f', optionalValue: true }, verbose: { type: 'boolean' } },
            },
            [optionalValue]
        );
        expect(result.tokens.map(token => token.index)).toEqual([0, 1]);
    });
});
