import { describe, expect, it } from 'vitest';

import { commands } from '../src/commands.js';
import { parseArgsPlus } from '../src/index.js';
import { parameters } from '../src/parameters.js';

describe('implicit default command options', () => {
    it.each([['--port', '3000'], ['--port=3000'], ['-p', '3000'], ['-p3000'], ['--verbose', '--port', '3000']])(
        'parses default-command flags with the merged schema: %j',
        (...args) => {
            const result = parseArgsPlus(
                {
                    args,
                    defaultCommand: 'serve',
                    options: { verbose: { type: 'boolean' } },
                    commands: { serve: { options: { port: { type: 'string', short: 'p' } } } },
                },
                [commands]
            );
            expect(result.command).toBe('serve');
            expect(result.values.port).toBe('3000');
            if (args.includes('--verbose')) expect(result.values.verbose).toBe(true);
        }
    );

    it('parses command flags before positional parameters and honors command-level negation', () => {
        const result = parseArgsPlus(
            {
                args: ['--port', '3000', '--no-color', 'index.js'],
                defaultCommand: 'serve',
                commands: {
                    serve: {
                        options: { port: { type: 'string' }, color: { type: 'boolean', default: true } },
                        parameters: ['<file>'],
                        allowNegative: true,
                    },
                },
            },
            [commands, parameters]
        );
        expect(result.values).toEqual({ port: '3000', color: false });
        expect(result.parameters).toEqual({ file: 'index.js' });
    });

    it('keeps the option terminator and default-command positionals', () => {
        const result = parseArgsPlus(
            {
                args: ['--port', '3000', '--', '--literal'],
                defaultCommand: 'serve',
                commands: { serve: { options: { port: { type: 'string' } }, allowPositionals: true } },
            },
            [commands]
        );
        expect(result.positionals).toEqual(['--literal']);
        expect(result.values.port).toBe('3000');
    });

    it('retains command defaults when invoked without arguments', () => {
        const result = parseArgsPlus(
            { args: [], defaultCommand: 'serve', commands: { serve: { options: { port: { type: 'string', default: '8080' } } } } },
            [commands]
        );
        expect(result.values.port).toBe('8080');
    });
});
