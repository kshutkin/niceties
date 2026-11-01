import { afterEach, describe, expect, it } from 'vitest';

import { commands } from '../src/commands.js';
import { parseArgsPlus } from '../src/index.js';
import { optionalValue } from '../src/optional-value.js';

describe('argument normalization before middleware', () => {
    const argvDescriptor = Object.getOwnPropertyDescriptor(process, 'argv');
    afterEach(() => Object.defineProperty(process, 'argv', argvDescriptor));

    it.each([
        {},
        { args: undefined },
    ])('supplies default CLI args to the first middleware without changing the caller config: %j', config => {
        process.argv = ['node', 'cli.js', '--name', 'original'];
        const original = Object.freeze({ ...config, options: { name: { type: 'string' } } });
        let received;
        const middleware = [
            config => {
                received = config;
                // Later middleware and native parsing must use the snapshot,
                // even if the process arguments change during transformation.
                process.argv = ['node', 'cli.js', '--name', 'changed'];
                return config;
            },
            result => result,
        ];
        const result = parseArgsPlus(original, [middleware]);
        expect(received.args).toEqual(['--name', 'original']);
        expect(result.values.name).toBe('original');
        expect(original.args).toBeUndefined();
    });

    it('normalizes defaults once for combined command and optional-value middleware', () => {
        let reads = 0;
        Object.defineProperty(process, 'argv', {
            configurable: true,
            get() {
                if (++reads > 1) throw new Error('argv read more than once');
                return ['node', 'cli.js', 'run', '-f', '--verbose'];
            },
        });
        const result = parseArgsPlus(
            {
                tokens: true,
                options: { verbose: { type: 'boolean' } },
                commands: { run: { options: { filter: { type: 'string', short: 'f', optionalValue: true } } } },
            },
            [commands, optionalValue]
        );
        Object.defineProperty(process, 'argv', argvDescriptor);
        expect(reads).toBe(1);
        expect(result.command).toBe('run');
        expect(result.values).toEqual({ filter: '', verbose: true });
        expect(result.tokens.map(token => token.index)).toEqual([0, 1, 2]);
    });

    it.each([[], ['--name', 'explicit']])('honors supplied args without reading argv: %j', (...args) => {
        Object.defineProperty(process, 'argv', {
            configurable: true,
            get() {
                throw new Error('explicit args must bypass argv');
            },
        });
        const result = parseArgsPlus({ args, options: { name: { type: 'string' } } });
        Object.defineProperty(process, 'argv', argvDescriptor);
        expect(result.values.name).toBe(args.length ? 'explicit' : undefined);
    });
});
