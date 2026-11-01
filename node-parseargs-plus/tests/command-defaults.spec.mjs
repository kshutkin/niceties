import { describe, expect, it } from 'vitest';

import { commands } from '../src/commands.js';
import { parseArgsPlus } from '../src/index.js';

describe('command defaults and explicit values', () => {
    it.each([
        [['--config', 'prod.json', 'build'], 'prod.json'],
        [['build', '--config', 'prod.json'], 'prod.json'],
        [['--config', 'prod.json', 'build', '--config', 'local.json'], 'local.json'],
        [['build'], 'dev.json'],
    ])('keeps explicit flags ahead of defaults: %j', (args, expected) => {
        const result = parseArgsPlus({ args, options: { config: { type: 'string', default: 'dev.json' } }, commands: { build: {} } }, [
            commands,
        ]);
        expect(result.values.config).toBe(expected);
        expect(result).not.toHaveProperty('tokens');
    });

    it.each([
        [['--config', 'dev.json', 'build'], 'dev.json'],
        [['build'], 'command.json'],
    ])('uses command defaults only when no explicit value was supplied: %j', (args, expected) => {
        const result = parseArgsPlus(
            {
                args,
                options: { config: { type: 'string', default: 'dev.json' } },
                commands: { build: { options: { config: { type: 'string', default: 'command.json' } } } },
            },
            [commands]
        );
        expect(result.values.config).toBe(expected);
    });

    it('preserves negated booleans and repeated short options before the command', () => {
        const result = parseArgsPlus(
            {
                args: ['--no-color', '-I', 'src', '-I', 'lib', 'build'],
                allowNegative: true,
                options: {
                    color: { type: 'boolean', default: true },
                    include: { type: 'string', short: 'I', multiple: true, default: ['default'] },
                },
                commands: { build: {} },
            },
            [commands]
        );
        expect(result.values).toEqual({ color: false, include: ['src', 'lib'] });
    });
});
