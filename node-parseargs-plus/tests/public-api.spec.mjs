import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { parseArgsPlus } from '@niceties/node-parseargs-plus';
import { commands } from '@niceties/node-parseargs-plus/commands';
import { customValue } from '@niceties/node-parseargs-plus/custom-value';
import { readPackageJson } from '@niceties/node-parseargs-plus/package-info';

describe('public argument parsing API gaps', () => {
    it('applies global converters to a command with no options record', () => {
        const result = parseArgsPlus({ args: ['build', '--port', '42'], options: { port: { type: Number } }, commands: { build: {} } }, [
            commands,
            customValue,
        ]);
        expect(result.command).toBe('build');
        expect(result.values).toEqual({ port: 42 });
    });

    it('preserves values already converted by earlier result middleware', () => {
        const converter = vi.fn(Number);
        const typedValues = [config => config, result => ({ ...result, values: { ...result.values, port: Number(result.values.port) } })];
        const result = parseArgsPlus({ args: ['--port', '42'], options: { port: { type: converter } } }, [customValue, typedValues]);
        expect(result.values).toEqual({ port: 42 });
        expect(converter).not.toHaveBeenCalled();
    });

    it.each([false, true])('accepts result middleware returning only values and positionals (tokens: %s)', tokens => {
        const valuesAndPositionals = [config => config, ({ values, positionals }) => ({ values, positionals })];
        const result = parseArgsPlus(
            { args: ['build', '--port', '42'], tokens, commands: { build: { options: { port: { type: 'string' } } } } },
            [commands, valuesAndPositionals]
        );
        expect(result.command).toBe('build');
        expect(result.values).toEqual({ port: '42' });
        expect(result.positionals).toEqual([]);
        if (tokens) {
            expect(result.tokens).toEqual([
                { kind: 'positional', index: 0, value: 'build' },
                { kind: 'option', index: 1, name: 'port', rawName: '--port', value: '42', inlineValue: false },
            ]);
        } else {
            expect(result).not.toHaveProperty('tokens');
        }
    });

    it('returns metadata defaults for malformed JSON in the nearest package.json', async () => {
        const directory = await mkdtemp(join(tmpdir(), 'niceties-package-info-'));
        try {
            await writeFile(join(directory, 'package.json'), '{ invalid json');
            expect(await readPackageJson(pathToFileURL(join(directory, 'entry.js')))).toEqual({
                name: '',
                version: '<unknown>',
                description: '',
            });
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });
});
