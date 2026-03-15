import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
    process.stdout.hasColors = () => false;
});

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
} from '../src/index.js';

describe('no-color mode (hasColors returns false)', () => {
    it('should return plain strings without ANSI codes for modifiers', () => {
        expect(reset('hello')).toBe('hello');
        expect(bold('hello')).toBe('hello');
        expect(dim('hello')).toBe('hello');
        expect(italic('hello')).toBe('hello');
        expect(underline('hello')).toBe('hello');
        expect(inverse('hello')).toBe('hello');
        expect(hidden('hello')).toBe('hello');
        expect(strikethrough('hello')).toBe('hello');
    });

    it('should return plain strings without ANSI codes for foreground colors', () => {
        expect(black('hello')).toBe('hello');
        expect(red('hello')).toBe('hello');
        expect(green('hello')).toBe('hello');
        expect(yellow('hello')).toBe('hello');
        expect(blue('hello')).toBe('hello');
        expect(magenta('hello')).toBe('hello');
        expect(cyan('hello')).toBe('hello');
        expect(white('hello')).toBe('hello');
        expect(gray('hello')).toBe('hello');
    });

    it('should return plain strings without ANSI codes for background colors', () => {
        expect(bgBlack('hello')).toBe('hello');
        expect(bgRed('hello')).toBe('hello');
        expect(bgGreen('hello')).toBe('hello');
        expect(bgYellow('hello')).toBe('hello');
        expect(bgBlue('hello')).toBe('hello');
        expect(bgMagenta('hello')).toBe('hello');
        expect(bgCyan('hello')).toBe('hello');
        expect(bgWhite('hello')).toBe('hello');
    });

    it('should return plain strings without ANSI codes for bright foreground colors', () => {
        expect(blackBright('hello')).toBe('hello');
        expect(redBright('hello')).toBe('hello');
        expect(greenBright('hello')).toBe('hello');
        expect(yellowBright('hello')).toBe('hello');
        expect(blueBright('hello')).toBe('hello');
        expect(magentaBright('hello')).toBe('hello');
        expect(cyanBright('hello')).toBe('hello');
        expect(whiteBright('hello')).toBe('hello');
    });

    it('should return plain strings without ANSI codes for bright background colors', () => {
        expect(bgBlackBright('hello')).toBe('hello');
        expect(bgRedBright('hello')).toBe('hello');
        expect(bgGreenBright('hello')).toBe('hello');
        expect(bgYellowBright('hello')).toBe('hello');
        expect(bgBlueBright('hello')).toBe('hello');
        expect(bgMagentaBright('hello')).toBe('hello');
        expect(bgCyanBright('hello')).toBe('hello');
        expect(bgWhiteBright('hello')).toBe('hello');
    });

    it('should coerce numbers to strings', () => {
        expect(red(123)).toBe('123');
        expect(bold(0)).toBe('0');
    });

    it('should handle empty string', () => {
        expect(red('')).toBe('');
    });
});
