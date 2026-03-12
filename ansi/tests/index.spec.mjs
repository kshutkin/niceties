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
    cyan,
    cyanBright,
    dim,
    gray,
    green,
    greenBright,
    hidden,
    inverse,
    isColorSupported,
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
} from '../src/index.js';

describe('named exports', () => {
    it('should export isColorSupported as a boolean', () => {
        expect(typeof isColorSupported).toBe('boolean');
    });

    it('should export formatter functions', () => {
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
    });
});

describe('foreground colors', () => {
    it('should wrap text with ANSI codes', () => {
        expect(red('hello')).toContain('hello');
        expect(green('hello')).toContain('hello');
        expect(yellow('hello')).toContain('hello');
        expect(blue('hello')).toContain('hello');
        expect(magenta('hello')).toContain('hello');
        expect(cyan('hello')).toContain('hello');
        expect(white('hello')).toContain('hello');
        expect(black('hello')).toContain('hello');
        expect(gray('hello')).toContain('hello');
    });

    it('should produce correct ANSI sequences when color is supported', () => {
        if (!isColorSupported) return;
        expect(red('hello')).toBe('\x1b[31mhello\x1b[39m');
        expect(green('hello')).toBe('\x1b[32mhello\x1b[39m');
        expect(yellow('hello')).toBe('\x1b[33mhello\x1b[39m');
        expect(blue('hello')).toBe('\x1b[34mhello\x1b[39m');
        expect(magenta('hello')).toBe('\x1b[35mhello\x1b[39m');
        expect(cyan('hello')).toBe('\x1b[36mhello\x1b[39m');
        expect(white('hello')).toBe('\x1b[37mhello\x1b[39m');
        expect(black('hello')).toBe('\x1b[30mhello\x1b[39m');
        expect(gray('hello')).toBe('\x1b[90mhello\x1b[39m');
    });
});

describe('modifiers', () => {
    it('should wrap text with ANSI codes when color is supported', () => {
        if (!isColorSupported) return;
        expect(bold('hello')).toBe('\x1b[1mhello\x1b[22m');
        expect(dim('hello')).toBe('\x1b[2mhello\x1b[22m');
        expect(italic('hello')).toBe('\x1b[3mhello\x1b[23m');
        expect(underline('hello')).toBe('\x1b[4mhello\x1b[24m');
        expect(inverse('hello')).toBe('\x1b[7mhello\x1b[27m');
        expect(hidden('hello')).toBe('\x1b[8mhello\x1b[28m');
        expect(strikethrough('hello')).toBe('\x1b[9mhello\x1b[29m');
        expect(reset('hello')).toBe('\x1b[0mhello\x1b[0m');
    });
});

describe('background colors', () => {
    it('should wrap text with ANSI codes when color is supported', () => {
        if (!isColorSupported) return;
        expect(bgRed('hello')).toBe('\x1b[41mhello\x1b[49m');
        expect(bgGreen('hello')).toBe('\x1b[42mhello\x1b[49m');
        expect(bgYellow('hello')).toBe('\x1b[43mhello\x1b[49m');
        expect(bgBlue('hello')).toBe('\x1b[44mhello\x1b[49m');
        expect(bgMagenta('hello')).toBe('\x1b[45mhello\x1b[49m');
        expect(bgCyan('hello')).toBe('\x1b[46mhello\x1b[49m');
        expect(bgWhite('hello')).toBe('\x1b[47mhello\x1b[49m');
        expect(bgBlack('hello')).toBe('\x1b[40mhello\x1b[49m');
    });
});

describe('bright foreground colors', () => {
    it('should wrap text with ANSI codes when color is supported', () => {
        if (!isColorSupported) return;
        expect(blackBright('hello')).toBe('\x1b[90mhello\x1b[39m');
        expect(redBright('hello')).toBe('\x1b[91mhello\x1b[39m');
        expect(greenBright('hello')).toBe('\x1b[92mhello\x1b[39m');
        expect(yellowBright('hello')).toBe('\x1b[93mhello\x1b[39m');
        expect(blueBright('hello')).toBe('\x1b[94mhello\x1b[39m');
        expect(magentaBright('hello')).toBe('\x1b[95mhello\x1b[39m');
        expect(cyanBright('hello')).toBe('\x1b[96mhello\x1b[39m');
        expect(whiteBright('hello')).toBe('\x1b[97mhello\x1b[39m');
    });
});

describe('bright background colors', () => {
    it('should wrap text with ANSI codes when color is supported', () => {
        if (!isColorSupported) return;
        expect(bgBlackBright('hello')).toBe('\x1b[100mhello\x1b[49m');
        expect(bgRedBright('hello')).toBe('\x1b[101mhello\x1b[49m');
        expect(bgGreenBright('hello')).toBe('\x1b[102mhello\x1b[49m');
        expect(bgYellowBright('hello')).toBe('\x1b[103mhello\x1b[49m');
        expect(bgBlueBright('hello')).toBe('\x1b[104mhello\x1b[49m');
        expect(bgMagentaBright('hello')).toBe('\x1b[105mhello\x1b[49m');
        expect(bgCyanBright('hello')).toBe('\x1b[106mhello\x1b[49m');
        expect(bgWhiteBright('hello')).toBe('\x1b[107mhello\x1b[49m');
    });
});

describe('input coercion', () => {
    it('should convert numbers to strings', () => {
        expect(red(123)).toContain('123');
        expect(bold(0)).toContain('0');
    });

    it('should handle empty string', () => {
        const result = red('');
        expect(result).toContain('');
    });
});

describe('nesting', () => {
    it('should handle nested colors with the same close code', () => {
        if (!isColorSupported) return;
        // blue uses \x1b[39m as close, same as red
        // When red wraps blue("world"), the inner \x1b[39m should be replaced with \x1b[31m (red open)
        const result = red('Hello ' + blue('world') + ' !');
        expect(result).toBe('\x1b[31mHello \x1b[34mworld\x1b[31m !\x1b[39m');
    });

    it('should handle nested colors where inner close does not match outer close', () => {
        if (!isColorSupported) return;
        // bold close is \x1b[22m, red close is \x1b[39m — no conflict
        const result = red(bold('hello'));
        expect(result).toBe('\x1b[31m\x1b[1mhello\x1b[22m\x1b[39m');
    });

    it('should handle multiple nested segments with same close code', () => {
        if (!isColorSupported) return;
        const result = red(blue('a') + green('b') + yellow('c'));
        // Each inner \x1b[39m gets replaced with \x1b[31m (red's open code)
        expect(result).toBe('\x1b[31m\x1b[34ma\x1b[31m\x1b[32mb\x1b[31m\x1b[33mc\x1b[31m\x1b[39m');
    });

    it('should handle bold inside dim correctly (shared close code)', () => {
        if (!isColorSupported) return;
        // bold close: \x1b[22m, dim close: \x1b[22m — same close code
        const result = dim(bold('hello'));
        // Inner \x1b[22m from bold's close gets replaced with dim's replace: \x1b[22m\x1b[2m
        expect(result).toBe('\x1b[2m\x1b[1mhello\x1b[22m\x1b[2m\x1b[22m');
    });

    it('should handle deeply nested colors', () => {
        if (!isColorSupported) return;
        const result = red(green(blue('deep')));
        expect(result).toBe('\x1b[31m\x1b[32m\x1b[34mdeep\x1b[32m\x1b[31m\x1b[39m');
    });

    it('should handle text around nested formatter', () => {
        if (!isColorSupported) return;
        const result = red('before ' + blue('middle') + ' after');
        expect(result).toBe('\x1b[31mbefore \x1b[34mmiddle\x1b[31m after\x1b[39m');
    });
});

describe('replaceClose edge cases', () => {
    it('should not replace close code if it only appears at the end', () => {
        if (!isColorSupported) return;
        const result = red('simple');
        expect(result).toBe('\x1b[31msimple\x1b[39m');
    });

    it('should handle string that is exactly the close code', () => {
        if (!isColorSupported) return;
        const result = red('\x1b[39m');
        // \x1b[31m is 5 chars, search starts at index 5, input \x1b[39m is 4 chars -> not found
        expect(result).toBe('\x1b[31m\x1b[39m\x1b[39m');
    });

    it('should handle input containing the close code multiple times', () => {
        if (!isColorSupported) return;
        const inner = blue('a') + 'b' + green('c');
        // inner = \x1b[34ma\x1b[39mb\x1b[32mc\x1b[39m
        const result = red(inner);
        // Both \x1b[39m should be replaced with \x1b[31m
        expect(result).toBe('\x1b[31m\x1b[34ma\x1b[31mb\x1b[32mc\x1b[31m\x1b[39m');
    });
});

describe('composability', () => {
    it('should allow chaining by composing functions', () => {
        if (!isColorSupported) return;
        const boldRed = input => bold(red(input));
        expect(boldRed('hello')).toBe('\x1b[1m\x1b[31mhello\x1b[39m\x1b[22m');
    });

    it('should allow mixing modifiers and colors', () => {
        if (!isColorSupported) return;
        const result = bold(underline(red('hello')));
        expect(result).toBe('\x1b[1m\x1b[4m\x1b[31mhello\x1b[39m\x1b[24m\x1b[22m');
    });

    it('should handle color inside background', () => {
        if (!isColorSupported) return;
        const result = bgBlue(red('hello'));
        // bgBlue close is \x1b[49m, red close is \x1b[39m — no conflict
        expect(result).toBe('\x1b[44m\x1b[31mhello\x1b[39m\x1b[49m');
    });
});
