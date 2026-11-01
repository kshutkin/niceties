import { describe, expect, it } from 'vitest';

import { commands } from '../src/commands.js';
import { customValue } from '../src/custom-value.js';
import { parseArgsPlus } from '../src/index.js';
import { optionalValue } from '../src/optional-value.js';

describe('command-scoped optional values', () => {
    const commandMap = {
        required: { options: { port: { type: 'string', short: 'p' } } },
        optional: { options: { port: { type: 'string', short: 'p', optionalValue: true } }, allowPositionals: true },
    };

    it.each(['--port', '-p'])('rejects a missing required value despite another command marking it optional: %s', flag => {
        expect(() => parseArgsPlus({ args: ['required', flag], commands: commandMap }, [commands, optionalValue])).toThrow(
            /argument missing/i
        );
    });

    it.each(['--port', '-p'])('accepts a bare optional value for the selected command: %s', flag => {
        expect(parseArgsPlus({ args: ['optional', flag], commands: commandMap }, [commands, optionalValue]).values.port).toBe('');
    });

    it('lets a required command option shadow a global optional-value rule', () => {
        expect(() =>
            parseArgsPlus(
                { args: ['required', '--port'], options: { port: { type: 'string', optionalValue: true } }, commands: commandMap },
                [commands, optionalValue]
            )
        ).toThrow(/argument missing/i);
    });

    it('lets an optional command option shadow a globally required value', () => {
        const result = parseArgsPlus({ args: ['optional', '--port'], options: { port: { type: 'string' } }, commands: commandMap }, [
            commands,
            optionalValue,
        ]);
        expect(result.values.port).toBe('');
    });

    it('still rejects missing global values before the command', () => {
        expect(() =>
            parseArgsPlus(
                {
                    args: ['--port', '--verbose', 'required'],
                    options: { port: { type: 'string' }, verbose: { type: 'boolean' } },
                    commands: commandMap,
                },
                [commands, optionalValue]
            )
        ).toThrow();
    });

    it('respects a command short alias that shadows a different global optional option', () => {
        expect(() =>
            parseArgsPlus(
                {
                    args: ['required', '-p'],
                    options: { filter: { type: 'string', short: 'p', optionalValue: true } },
                    commands: commandMap,
                },
                [commands, optionalValue]
            )
        ).toThrow(/argument missing/i);
    });

    it.each(['--filter', '-f'])('rewrites global optional flags before the command without losing the command boundary: %s', flag => {
        const result = parseArgsPlus(
            {
                args: [flag, '--verbose', 'required', '--port', '42'],
                options: { filter: { type: 'string', short: 'f', optionalValue: true }, verbose: { type: 'boolean' } },
                commands: commandMap,
            },
            [commands, optionalValue]
        );
        expect(result.command).toBe('required');
        expect(result.values).toEqual({ filter: '', verbose: true, port: '42' });
    });

    it('keeps global optional values working when no command is resolved', () => {
        const result = parseArgsPlus(
            { args: ['--filter'], options: { filter: { type: 'string', optionalValue: true } }, commands: commandMap },
            [commands, optionalValue]
        );
        expect(result.command).toBeUndefined();
        expect(result.values.filter).toBe('');
    });

    it('supports bare converted options on an implicit default command', () => {
        const result = parseArgsPlus(
            {
                args: ['--port'],
                defaultCommand: 'number',
                commands: {
                    number: { options: { port: { type: Number, optionalValue: true } } },
                    required: { options: { port: { type: 'string' } } },
                },
            },
            [commands, optionalValue, customValue]
        );
        expect(result.values.port).toBe(0);
    });

    it('does not rewrite positional text after the option terminator', () => {
        const result = parseArgsPlus({ args: ['optional', '--', '--port'], commands: commandMap }, [commands, optionalValue]);
        expect(result.positionals).toEqual(['--port']);
        expect(result.values).not.toHaveProperty('port');
    });
});
