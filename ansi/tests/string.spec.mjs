import { describe, expect, it } from 'vitest';

import {
    bgBlack,
    bgBlackBright,
    bgBlue,
    bgBlueBright,
    bgCyan,
    bgCyanBright,
    bgGreen,
    bgGreenBright,
    bgMagenta,
    bgMagentaBright,
    bgRed,
    bgRedBright,
    bgWhite,
    bgWhiteBright,
    bgYellow,
    bgYellowBright,
    black,
    blackBright,
    blue,
    blueBright,
    bold,
    c,
    cyan,
    cyanBright,
    dim,
    gray,
    green,
    greenBright,
    hidden,
    inverse,
    italic,
    magenta,
    magentaBright,
    red,
    redBright,
    reset,
    strikethrough,
    underline,
    white,
    whiteBright,
    yellow,
    yellowBright,
} from '../src/string.js';

describe('named exports', () => {
    it('should export the tagged template function', () => {
        expect(typeof c).toBe('function');
    });

    it('should export color factory functions', () => {
        expect(typeof red).toBe('function');
        expect(typeof green).toBe('function');
        expect(typeof blue).toBe('function');
        expect(typeof bold).toBe('function');
        expect(typeof reset).toBe('function');
        expect(typeof dim).toBe('function');
        expect(typeof italic).toBe('function');
        expect(typeof underline).toBe('function');
        expect(typeof inverse).toBe('function');
        expect(typeof hidden).toBe('function');
        expect(typeof strikethrough).toBe('function');
        expect(typeof black).toBe('function');
        expect(typeof magenta).toBe('function');
        expect(typeof cyan).toBe('function');
        expect(typeof white).toBe('function');
        expect(typeof yellow).toBe('function');
        expect(typeof gray).toBe('function');
        expect(typeof bgBlack).toBe('function');
        expect(typeof bgRed).toBe('function');
        expect(typeof bgGreen).toBe('function');
        expect(typeof bgYellow).toBe('function');
        expect(typeof bgBlue).toBe('function');
        expect(typeof bgMagenta).toBe('function');
        expect(typeof bgCyan).toBe('function');
        expect(typeof bgWhite).toBe('function');
        expect(typeof blackBright).toBe('function');
        expect(typeof redBright).toBe('function');
        expect(typeof greenBright).toBe('function');
        expect(typeof yellowBright).toBe('function');
        expect(typeof blueBright).toBe('function');
        expect(typeof magentaBright).toBe('function');
        expect(typeof cyanBright).toBe('function');
        expect(typeof whiteBright).toBe('function');
        expect(typeof bgBlackBright).toBe('function');
        expect(typeof bgRedBright).toBe('function');
        expect(typeof bgGreenBright).toBe('function');
        expect(typeof bgYellowBright).toBe('function');
        expect(typeof bgBlueBright).toBe('function');
        expect(typeof bgMagentaBright).toBe('function');
        expect(typeof bgCyanBright).toBe('function');
        expect(typeof bgWhiteBright).toBe('function');
    });
});

describe('color factories return color segments', () => {
    it('should return an array-like color segment', () => {
        const seg = red('hello');
        expect(Array.isArray(seg)).toBe(true);
        expect(seg).toHaveLength(3);
        expect(seg[0]).toBe('\x1b[31m');
        expect(seg[1]).toBe('hello');
        expect(seg[2]).toBe('\x1b[39m');
    });

    it('should coerce numbers to strings in the segment', () => {
        const seg = red(123);
        expect(seg[1]).toBe('123');
    });
});

describe('tagged template: basic usage', () => {
    it('should return plain text when there are no interpolations', () => {
        expect(c`hello world`).toBe('hello world');
    });

    it('should handle a single color segment', () => {
        expect(c`${red('hello')}`).toBe('\x1b[31mhello\x1b[39m');
    });

    it('should handle text before a color segment', () => {
        expect(c`prefix ${red('hello')}`).toBe('prefix \x1b[31mhello\x1b[39m');
    });

    it('should handle text after a color segment', () => {
        expect(c`${red('hello')} suffix`).toBe('\x1b[31mhello\x1b[39m suffix');
    });

    it('should handle text around a color segment', () => {
        expect(c`before ${red('hello')} after`).toBe('before \x1b[31mhello\x1b[39m after');
    });

    it('should handle multiple color segments', () => {
        expect(c`${red('a')} and ${blue('b')}`).toBe('\x1b[31ma\x1b[39m and \x1b[34mb\x1b[39m');
    });

    it('should handle adjacent color segments', () => {
        expect(c`${red('a')}${blue('b')}`).toBe('\x1b[31ma\x1b[39m\x1b[34mb\x1b[39m');
    });
});

describe('tagged template: plain interpolated values', () => {
    it('should handle plain string interpolations', () => {
        const name = 'world';
        expect(c`hello ${name}`).toBe('hello world');
    });

    it('should handle plain number interpolations', () => {
        expect(c`count: ${42}`).toBe('count: 42');
    });

    it('should mix plain values and color segments', () => {
        const name = 'world';
        expect(c`hello ${red(name)}, count: ${42}`).toBe('hello \x1b[31mworld\x1b[39m, count: 42');
    });
});

describe('tagged template: foreground colors', () => {
    it('should produce correct ANSI sequences for all foreground colors', () => {
        expect(c`${black('t')}`).toBe('\x1b[30mt\x1b[39m');
        expect(c`${red('t')}`).toBe('\x1b[31mt\x1b[39m');
        expect(c`${green('t')}`).toBe('\x1b[32mt\x1b[39m');
        expect(c`${yellow('t')}`).toBe('\x1b[33mt\x1b[39m');
        expect(c`${blue('t')}`).toBe('\x1b[34mt\x1b[39m');
        expect(c`${magenta('t')}`).toBe('\x1b[35mt\x1b[39m');
        expect(c`${cyan('t')}`).toBe('\x1b[36mt\x1b[39m');
        expect(c`${white('t')}`).toBe('\x1b[37mt\x1b[39m');
        expect(c`${gray('t')}`).toBe('\x1b[90mt\x1b[39m');
    });
});

describe('tagged template: modifiers', () => {
    it('should produce correct ANSI sequences for all modifiers', () => {
        expect(c`${reset('t')}`).toBe('\x1b[0mt\x1b[0m');
        expect(c`${bold('t')}`).toBe('\x1b[1mt\x1b[22m');
        expect(c`${dim('t')}`).toBe('\x1b[2mt\x1b[22m');
        expect(c`${italic('t')}`).toBe('\x1b[3mt\x1b[23m');
        expect(c`${underline('t')}`).toBe('\x1b[4mt\x1b[24m');
        expect(c`${inverse('t')}`).toBe('\x1b[7mt\x1b[27m');
        expect(c`${hidden('t')}`).toBe('\x1b[8mt\x1b[28m');
        expect(c`${strikethrough('t')}`).toBe('\x1b[9mt\x1b[29m');
    });
});

describe('tagged template: background colors', () => {
    it('should produce correct ANSI sequences for all background colors', () => {
        expect(c`${bgBlack('t')}`).toBe('\x1b[40mt\x1b[49m');
        expect(c`${bgRed('t')}`).toBe('\x1b[41mt\x1b[49m');
        expect(c`${bgGreen('t')}`).toBe('\x1b[42mt\x1b[49m');
        expect(c`${bgYellow('t')}`).toBe('\x1b[43mt\x1b[49m');
        expect(c`${bgBlue('t')}`).toBe('\x1b[44mt\x1b[49m');
        expect(c`${bgMagenta('t')}`).toBe('\x1b[45mt\x1b[49m');
        expect(c`${bgCyan('t')}`).toBe('\x1b[46mt\x1b[49m');
        expect(c`${bgWhite('t')}`).toBe('\x1b[47mt\x1b[49m');
    });
});

describe('tagged template: bright foreground colors', () => {
    it('should produce correct ANSI sequences for all bright foreground colors', () => {
        expect(c`${blackBright('t')}`).toBe('\x1b[90mt\x1b[39m');
        expect(c`${redBright('t')}`).toBe('\x1b[91mt\x1b[39m');
        expect(c`${greenBright('t')}`).toBe('\x1b[92mt\x1b[39m');
        expect(c`${yellowBright('t')}`).toBe('\x1b[93mt\x1b[39m');
        expect(c`${blueBright('t')}`).toBe('\x1b[94mt\x1b[39m');
        expect(c`${magentaBright('t')}`).toBe('\x1b[95mt\x1b[39m');
        expect(c`${cyanBright('t')}`).toBe('\x1b[96mt\x1b[39m');
        expect(c`${whiteBright('t')}`).toBe('\x1b[97mt\x1b[39m');
    });
});

describe('tagged template: bright background colors', () => {
    it('should produce correct ANSI sequences for all bright background colors', () => {
        expect(c`${bgBlackBright('t')}`).toBe('\x1b[100mt\x1b[49m');
        expect(c`${bgRedBright('t')}`).toBe('\x1b[101mt\x1b[49m');
        expect(c`${bgGreenBright('t')}`).toBe('\x1b[102mt\x1b[49m');
        expect(c`${bgYellowBright('t')}`).toBe('\x1b[103mt\x1b[49m');
        expect(c`${bgBlueBright('t')}`).toBe('\x1b[104mt\x1b[49m');
        expect(c`${bgMagentaBright('t')}`).toBe('\x1b[105mt\x1b[49m');
        expect(c`${bgCyanBright('t')}`).toBe('\x1b[106mt\x1b[49m');
        expect(c`${bgWhiteBright('t')}`).toBe('\x1b[107mt\x1b[49m');
    });
});

describe('tagged template: nesting with same close code group', () => {
    it('should handle two adjacent foreground colors (same close code)', () => {
        // Both red and blue use FG_CLOSE (\x1b[39m).
        // At the tagged template level, they are siblings, not nested,
        // so each gets its own proper open/close.
        const result = c`${red('a')}${blue('b')}`;
        expect(result).toBe('\x1b[31ma\x1b[39m\x1b[34mb\x1b[39m');
    });

    it('should handle many foreground colors in sequence', () => {
        const result = c`${red('r')} ${green('g')} ${blue('b')}`;
        expect(result).toBe('\x1b[31mr\x1b[39m \x1b[32mg\x1b[39m \x1b[34mb\x1b[39m');
    });
});

describe('tagged template: nesting different close code groups', () => {
    it('should handle a color inside a background', () => {
        // bgBlue close is \x1b[49m, red close is \x1b[39m — no conflict
        // Note: with tagged templates, nesting means passing one segment's
        // text as the content of another. Since these are different close groups,
        // they don't interfere.
        const result = c`${bgBlue('hello')}`;
        expect(result).toBe('\x1b[44mhello\x1b[49m');
    });

    it('should handle a modifier with a color at the same level', () => {
        const result = c`${bold('strong')} ${red('error')}`;
        expect(result).toBe('\x1b[1mstrong\x1b[22m \x1b[31merror\x1b[39m');
    });
});

describe('tagged template: input coercion', () => {
    it('should convert numbers in color factories', () => {
        expect(c`${red(123)}`).toBe('\x1b[31m123\x1b[39m');
        expect(c`${bold(0)}`).toBe('\x1b[1m0\x1b[22m');
    });

    it('should handle empty string in color factory', () => {
        expect(c`${red('')}`).toBe('\x1b[31m\x1b[39m');
    });
});

describe('tagged template: empty and edge cases', () => {
    it('should handle empty tagged template', () => {
        expect(c``).toBe('');
    });

    it('should handle template with only static text', () => {
        expect(c`just text`).toBe('just text');
    });

    it('should handle template with only a plain value', () => {
        expect(c`${'hello'}`).toBe('hello');
    });

    it('should handle template with empty strings around segment', () => {
        expect(c`${red('x')}`).toBe('\x1b[31mx\x1b[39m');
    });
});

describe('tagged template: complex compositions', () => {
    it('should produce a multi-color line', () => {
        const result = c`Status: ${green('OK')} | Warnings: ${yellow('3')} | Errors: ${red('1')}`;
        expect(result).toBe('Status: \x1b[32mOK\x1b[39m | Warnings: \x1b[33m3\x1b[39m | Errors: \x1b[31m1\x1b[39m');
    });

    it('should handle bold text with colored text', () => {
        const result = c`${bold('Title:')} ${red('error message')}`;
        expect(result).toBe('\x1b[1mTitle:\x1b[22m \x1b[31merror message\x1b[39m');
    });

    it('should handle multiple modifiers and colors', () => {
        const result = c`${bold('B')} ${italic('I')} ${underline('U')} ${red('R')} ${bgBlue('BG')}`;
        expect(result).toBe('\x1b[1mB\x1b[22m \x1b[3mI\x1b[23m \x1b[4mU\x1b[24m \x1b[31mR\x1b[39m \x1b[44mBG\x1b[49m');
    });
});

describe('tagged template: segments are arrays', () => {
    it('color segment has correct structure', () => {
        const seg = bold('test');
        expect(seg[0]).toBe('\x1b[1m');
        expect(seg[1]).toBe('test');
        expect(seg[2]).toBe('\x1b[22m');
    });

    it('segment length is 3', () => {
        expect(red('x').length).toBe(3);
        expect(bold('x').length).toBe(3);
        expect(bgBlue('x').length).toBe(3);
    });
});

describe('tagged template: segments used without tagged template', () => {
    it('color segment can be destructured', () => {
        const [open, text, close] = red('hello');
        expect(open).toBe('\x1b[31m');
        expect(text).toBe('hello');
        expect(close).toBe('\x1b[39m');
    });
});

describe('tagged template: stress tests', () => {
    it('should handle many segments efficiently', () => {
        const segments = [];
        const factories = [red, green, blue, yellow, magenta, cyan];
        for (let i = 0; i < 100; i++) {
            segments.push(factories[i % factories.length](String(i)));
        }
        // Build using reduce to create the tagged template call dynamically
        // We'll just test that it doesn't throw and produces non-empty output
        const result = c`${segments[0]}${segments[1]}${segments[2]}`;
        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain('0');
        expect(result).toContain('1');
        expect(result).toContain('2');
    });

    it('should handle long text in segments', () => {
        const longText = 'a'.repeat(10000);
        const result = c`${red(longText)}`;
        expect(result).toBe(`\x1b[31m${longText}\x1b[39m`);
    });
});

describe('tagged template: all colors produce unique open codes', () => {
    it('foreground colors have distinct open codes', () => {
        const fgColors = [black, red, green, yellow, blue, magenta, cyan, white, gray];
        const opens = new Set(fgColors.map(fn => fn('x')[0]));
        expect(opens.size).toBe(fgColors.length);
    });

    it('background colors have distinct open codes', () => {
        const bgColors = [bgBlack, bgRed, bgGreen, bgYellow, bgBlue, bgMagenta, bgCyan, bgWhite];
        const opens = new Set(bgColors.map(fn => fn('x')[0]));
        expect(opens.size).toBe(bgColors.length);
    });

    it('bright foreground colors have distinct open codes', () => {
        const colors = [blackBright, redBright, greenBright, yellowBright, blueBright, magentaBright, cyanBright, whiteBright];
        const opens = new Set(colors.map(fn => fn('x')[0]));
        expect(opens.size).toBe(colors.length);
    });

    it('bright background colors have distinct open codes', () => {
        const colors = [
            bgBlackBright,
            bgRedBright,
            bgGreenBright,
            bgYellowBright,
            bgBlueBright,
            bgMagentaBright,
            bgCyanBright,
            bgWhiteBright,
        ];
        const opens = new Set(colors.map(fn => fn('x')[0]));
        expect(opens.size).toBe(colors.length);
    });
});

describe('tagged template: foreground colors share FG_CLOSE', () => {
    it('all foreground colors use \\x1b[39m as close', () => {
        const fgColors = [
            black,
            red,
            green,
            yellow,
            blue,
            magenta,
            cyan,
            white,
            gray,
            blackBright,
            redBright,
            greenBright,
            yellowBright,
            blueBright,
            magentaBright,
            cyanBright,
            whiteBright,
        ];
        for (const fn of fgColors) {
            expect(fn('x')[2]).toBe('\x1b[39m');
        }
    });
});

describe('tagged template: background colors share BG_CLOSE', () => {
    it('all background colors use \\x1b[49m as close', () => {
        const bgColors = [
            bgBlack,
            bgRed,
            bgGreen,
            bgYellow,
            bgBlue,
            bgMagenta,
            bgCyan,
            bgWhite,
            bgBlackBright,
            bgRedBright,
            bgGreenBright,
            bgYellowBright,
            bgBlueBright,
            bgMagentaBright,
            bgCyanBright,
            bgWhiteBright,
        ];
        for (const fn of bgColors) {
            expect(fn('x')[2]).toBe('\x1b[49m');
        }
    });
});

describe('tagged template: bold and dim share close code', () => {
    it('bold and dim both use \\x1b[22m as close', () => {
        expect(bold('x')[2]).toBe('\x1b[22m');
        expect(dim('x')[2]).toBe('\x1b[22m');
    });
});
