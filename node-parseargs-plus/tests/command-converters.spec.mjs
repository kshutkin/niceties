import { describe, expect, it, vi } from 'vitest';

import { camelCase } from '../src/camel-case.js';
import { commands } from '../src/commands.js';
import { customValue } from '../src/custom-value.js';
import { parseArgsPlus } from '../src/index.js';

describe('command-scoped custom converters', () => {
    it.each([false, true])('selects the converter independently of command declaration order (reverse: %s)', reverse => {
        const entries = [
            ['number', { options: { port: { type: Number } } }],
            ['text', { options: { port: { type: value => `text:${value}` } } }],
        ];
        const commandMap = Object.fromEntries(reverse ? entries.reverse() : entries);
        for (const [command, expected] of [
            ['number', 42],
            ['text', 'text:42'],
        ]) {
            const result = parseArgsPlus({ args: [command, '--port', '42'], commands: commandMap }, [commands, customValue]);
            expect(result.values.port).toBe(expected);
        }
    });

    it('does not invoke converters from an inactive command or without a selected command', () => {
        const inactive = vi.fn(() => {
            throw new Error('inactive converter called');
        });
        const commandMap = { plain: { options: { port: { type: 'string' } } }, inactive: { options: { port: { type: inactive } } } };
        expect(parseArgsPlus({ args: ['plain', '--port', 'text'], commands: commandMap }, [commands, customValue]).values.port).toBe(
            'text'
        );
        expect(
            parseArgsPlus({ args: ['--port', 'text'], options: { port: { type: 'string' } }, commands: commandMap }, [
                commands,
                customValue,
            ]).values.port
        ).toBe('text');
        expect(inactive).not.toHaveBeenCalled();
    });

    it('lets a plain command option override a global converter while retaining other global converters', () => {
        const result = parseArgsPlus(
            {
                args: ['plain', '--port', 'text', '--timeout', '10'],
                options: { port: { type: Number }, timeout: { type: Number } },
                commands: { plain: { options: { port: { type: 'string' } } } },
            },
            [commands, customValue]
        );
        expect(result.values).toEqual({ port: 'text', timeout: 10 });
    });

    it('uses the selected array converter for a default command', () => {
        const result = parseArgsPlus(
            {
                args: ['--port', '80', '--port', '443'],
                defaultCommand: 'number',
                commands: {
                    number: { options: { port: { type: values => values.map(Number), multiple: true } } },
                    text: { options: { port: { type: values => values.join(','), multiple: true } } },
                },
            },
            [commands, customValue]
        );
        expect(result.values.port).toEqual([80, 443]);
    });

    it('scopes converters after camelCase normalization, including defaults', () => {
        const result = parseArgsPlus(
            {
                args: ['number'],
                commands: {
                    number: { options: { serverPort: { type: Number, default: '42' } } },
                    text: { options: { serverPort: { type: value => `text:${value}` } } },
                },
            },
            [commands, customValue, camelCase]
        );
        expect(result.values.serverPort).toBe(42);
    });
});
