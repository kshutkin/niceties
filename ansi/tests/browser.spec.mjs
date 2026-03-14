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
} from '../src/browser.js';

describe('browser: named exports', () => {
    it('should export formatter functions', () => {
        expect(typeof reset).toBe('function');
        expect(typeof bold).toBe('function');
        expect(typeof dim).toBe('function');
        expect(typeof italic).toBe('function');
        expect(typeof underline).toBe('function');
        expect(typeof inverse).toBe('function');
        expect(typeof hidden).toBe('function');
        expect(typeof strikethrough).toBe('function');
        expect(typeof black).toBe('function');
        expect(typeof red).toBe('function');
        expect(typeof green).toBe('function');
        expect(typeof yellow).toBe('function');
        expect(typeof blue).toBe('function');
        expect(typeof magenta).toBe('function');
        expect(typeof cyan).toBe('function');
        expect(typeof white).toBe('function');
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

describe('browser: modifiers', () => {
    it('should wrap text with ANSI codes', () => {
        expect(reset('hello')).toBe('\x1b[0mhello\x1b[0m');
        expect(bold('hello')).toBe('\x1b[1mhello\x1b[22m');
        expect(dim('hello')).toBe('\x1b[2mhello\x1b[22m');
        expect(italic('hello')).toBe('\x1b[3mhello\x1b[23m');
        expect(underline('hello')).toBe('\x1b[4mhello\x1b[24m');
        expect(inverse('hello')).toBe('\x1b[7mhello\x1b[27m');
        expect(hidden('hello')).toBe('\x1b[8mhello\x1b[28m');
        expect(strikethrough('hello')).toBe('\x1b[9mhello\x1b[29m');
    });
});

describe('browser: foreground colors', () => {
    it('should wrap text with correct ANSI sequences', () => {
        expect(black('hello')).toBe('\x1b[30mhello\x1b[39m');
        expect(red('hello')).toBe('\x1b[31mhello\x1b[39m');
        expect(green('hello')).toBe('\x1b[32mhello\x1b[39m');
        expect(yellow('hello')).toBe('\x1b[33mhello\x1b[39m');
        expect(blue('hello')).toBe('\x1b[34mhello\x1b[39m');
        expect(magenta('hello')).toBe('\x1b[35mhello\x1b[39m');
        expect(cyan('hello')).toBe('\x1b[36mhello\x1b[39m');
        expect(white('hello')).toBe('\x1b[37mhello\x1b[39m');
        expect(gray('hello')).toBe('\x1b[90mhello\x1b[39m');
    });
});

describe('browser: background colors', () => {
    it('should wrap text with correct ANSI sequences', () => {
        expect(bgBlack('hello')).toBe('\x1b[40mhello\x1b[49m');
        expect(bgRed('hello')).toBe('\x1b[41mhello\x1b[49m');
        expect(bgGreen('hello')).toBe('\x1b[42mhello\x1b[49m');
        expect(bgYellow('hello')).toBe('\x1b[43mhello\x1b[49m');
        expect(bgBlue('hello')).toBe('\x1b[44mhello\x1b[49m');
        expect(bgMagenta('hello')).toBe('\x1b[45mhello\x1b[49m');
        expect(bgCyan('hello')).toBe('\x1b[46mhello\x1b[49m');
        expect(bgWhite('hello')).toBe('\x1b[47mhello\x1b[49m');
    });
});

describe('browser: bright foreground colors', () => {
    it('should wrap text with correct ANSI sequences', () => {
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

describe('browser: bright background colors', () => {
    it('should wrap text with correct ANSI sequences', () => {
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

describe('browser: input coercion', () => {
    it('should convert numbers to strings', () => {
        expect(red(123)).toBe('\x1b[31m123\x1b[39m');
        expect(bold(0)).toBe('\x1b[1m0\x1b[22m');
    });

    it('should handle empty string', () => {
        expect(red('')).toBe('\x1b[31m\x1b[39m');
    });
});

describe('browser: nesting', () => {
    it('should handle nested colors with the same close code', () => {
        const result = red('Hello ' + blue('world') + ' !');
        expect(result).toBe('\x1b[31mHello \x1b[34mworld\x1b[31m !\x1b[39m');
    });

    it('should handle nested colors where inner close does not match outer close', () => {
        const result = red(bold('hello'));
        expect(result).toBe('\x1b[31m\x1b[1mhello\x1b[22m\x1b[39m');
    });

    it('should handle multiple nested segments with same close code', () => {
        const result = red(blue('a') + green('b') + yellow('c'));
        expect(result).toBe('\x1b[31m\x1b[34ma\x1b[31m\x1b[32mb\x1b[31m\x1b[33mc\x1b[31m\x1b[39m');
    });

    it('should handle bold inside dim correctly (shared close code)', () => {
        const result = dim(bold('hello'));
        expect(result).toBe('\x1b[2m\x1b[1mhello\x1b[22m\x1b[2m\x1b[22m');
    });

    it('should handle deeply nested colors', () => {
        const result = red(green(blue('deep')));
        expect(result).toBe('\x1b[31m\x1b[32m\x1b[34mdeep\x1b[32m\x1b[31m\x1b[39m');
    });

    it('should handle text around nested formatter', () => {
        const result = red('before ' + blue('middle') + ' after');
        expect(result).toBe('\x1b[31mbefore \x1b[34mmiddle\x1b[31m after\x1b[39m');
    });
});

describe('browser: replaceClose edge cases', () => {
    it('should not replace close code if it only appears at the end', () => {
        const result = red('simple');
        expect(result).toBe('\x1b[31msimple\x1b[39m');
    });

    it('should handle string that is exactly the close code', () => {
        const result = red('\x1b[39m');
        expect(result).toBe('\x1b[31m\x1b[39m\x1b[39m');
    });

    it('should handle input containing the close code multiple times', () => {
        const inner = blue('a') + 'b' + green('c');
        const result = red(inner);
        expect(result).toBe('\x1b[31m\x1b[34ma\x1b[31mb\x1b[32mc\x1b[31m\x1b[39m');
    });
});

describe('browser: composability', () => {
    it('should allow chaining by composing functions', () => {
        const boldRed = input => bold(red(input));
        expect(boldRed('hello')).toBe('\x1b[1m\x1b[31mhello\x1b[39m\x1b[22m');
    });

    it('should allow mixing modifiers and colors', () => {
        const result = bold(underline(red('hello')));
        expect(result).toBe('\x1b[1m\x1b[4m\x1b[31mhello\x1b[39m\x1b[24m\x1b[22m');
    });

    it('should handle color inside background', () => {
        const result = bgBlue(red('hello'));
        expect(result).toBe('\x1b[44m\x1b[31mhello\x1b[39m\x1b[49m');
    });
});
