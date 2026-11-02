import { stripVTControlCharacters } from 'node:util';

import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
    process.stdout.hasColors = () => true;
});

import * as browser from '../src/browser.js';
import * as node from '../src/index.js';

describe.each([
    ['node', node],
    ['browser', browser],
])('%s: hyperlinks', (_name, { link, red, bold }) => {
    it('should wrap anchor text in OSC 8 sequences terminated with ST', () => {
        expect(link('docs', 'https://example.com')).toBe('\x1b]8;;https://example.com\x1b\\docs\x1b]8;;\x1b\\');
    });

    it.each(['https://example.com/path%20name?q=a;b&other=value#section', 'file://localhost/tmp/file.txt', 'mailto:hello@example.com'])(
        'should preserve the URI-encoded target %s',
        url => {
            expect(link('open', url)).toBe(`\x1b]8;;${url}\x1b\\open\x1b]8;;\x1b\\`);
        }
    );

    it('should leave only anchor text when control sequences are ignored', () => {
        const output = `${link('documentation', 'https://example.com')} after`;
        expect(stripVTControlCharacters(output)).toBe('documentation after');
    });

    it.each(['', 0, 123, 'first\nsecond', '文档'])('should preserve anchor text %j', input => {
        expect(link(input, 'https://example.com')).toBe(`\x1b]8;;https://example.com\x1b\\${input}\x1b]8;;\x1b\\`);
    });

    it('should compose with colors and modifiers in either order', () => {
        expect(link(bold(red('docs')), 'https://example.com')).toBe(
            '\x1b]8;;https://example.com\x1b\\\x1b[1m\x1b[31mdocs\x1b[39m\x1b[22m\x1b]8;;\x1b\\'
        );
        expect(red(link('docs', 'https://example.com'))).toBe('\x1b[31m\x1b]8;;https://example.com\x1b\\docs\x1b]8;;\x1b\\\x1b[39m');
    });

    it('should close adjacent links before the following text', () => {
        expect(`${link('a', 'https://a.test')}${link('b', 'https://b.test')} after`).toBe(
            '\x1b]8;;https://a.test\x1b\\a\x1b]8;;\x1b\\\x1b]8;;https://b.test\x1b\\b\x1b]8;;\x1b\\ after'
        );
    });

    it('should restore the outer target after nested links with shorter targets', () => {
        const url = 'https://example.com/a/long/outer/target';
        expect(link(`${link('a', 'https://a.test')} after`, url)).toBe(
            `\x1b]8;;${url}\x1b\\\x1b]8;;https://a.test\x1b\\a\x1b]8;;${url}\x1b\\ after\x1b]8;;\x1b\\`
        );
    });

    it('should preserve replacement patterns in an outer target when restoring it', () => {
        const url = 'https://example.com/$&/$$';
        expect(link(`${link('a', 'https://a.test')} after`, url)).toBe(
            `\x1b]8;;${url}\x1b\\\x1b]8;;https://a.test\x1b\\a\x1b]8;;${url}\x1b\\ after\x1b]8;;\x1b\\`
        );
    });
});
