# @niceties/ansi

[![Branch coverage](https://raw.githubusercontent.com/kshutkin/niceties/coverage/ansi/badge.svg)](https://github.com/kshutkin/niceties/tree/coverage/ansi/coverage)

Minimalistic ANSI colors and hyperlinks library for terminal output.

## Why & Acknowledgments

I've been using [kleur](https://github.com/lukeed/kleur) for many years until I found that there are no bright colors that I wanted for some functionality. I tried to replace it with [picocolors](https://github.com/alexeyraspopov/picocolors) but there is no ESM packaging, and I was not happy with color support detection, and I want it to be tree-shakable during bundling. So in the end I built this package, which mostly started with picocolors' idea but I use slower (but more memory friendly) replaceAll instead of fast custom replace.

It is not the fastest library!

## Features

- **Tree-shakeable** - only the formatters you import end up in your bundle
- **Correct nesting** - inner close codes are replaced so outer colors restore properly
- **Auto-detection** - colors and hyperlinks are enabled or disabled based on `process.stdout.hasColors()`
- **Browser entry point** - colors and hyperlinks are always enabled via the `browser` export condition
- **Terminal hyperlinks** - OSC 8 links with custom anchor text, without separate hyperlink detection

## Installation

```
npm install @niceties/ansi
```

## Usage

Every formatter is a named export - import only what you need:

```js
import { red, bold, bgWhite } from "@niceties/ansi";

console.log(red("Error!"));
console.log(bold(red("Bold error!")));
console.log(bgWhite(red("Red on white")));
```

Compose formatters by nesting calls. The library correctly handles ANSI close-code collisions so colors restore as expected:

```js
import { red, blue, green } from "@niceties/ansi";

// Inner close codes are replaced with the outer color's open code
console.log(red("Hello " + blue("world") + "!"));
// => \x1b[31mHello \x1b[34mworld\x1b[31m!\x1b[39m
```

When colors are not supported, color and modifier formatters become identity functions that convert input to a string without adding any escape codes. Hyperlinks return only the anchor text, converted to a string.

## API

### Modifiers

| Export          | Effect                         |
| --------------- | ------------------------------ |
| `reset`         | Reset all attributes           |
| `bold`          | **Bold** text                  |
| `dim`           | Dimmed text                    |
| `italic`        | _Italic_ text                  |
| `underline`     | Underlined text                |
| `inverse`       | Swap foreground and background |
| `hidden`        | Hidden text                    |
| `strikethrough` | ~~Strikethrough~~ text         |

### Foreground colors

`black` · `red` · `green` · `yellow` · `blue` · `magenta` · `cyan` · `white` · `gray`

### Bright foreground colors

`blackBright` · `redBright` · `greenBright` · `yellowBright` · `blueBright` · `magentaBright` · `cyanBright` · `whiteBright`

### Background colors

`bgBlack` · `bgRed` · `bgGreen` · `bgYellow` · `bgBlue` · `bgMagenta` · `bgCyan` · `bgWhite`

### Bright background colors

`bgBlackBright` · `bgRedBright` · `bgGreenBright` · `bgYellowBright` · `bgBlueBright` · `bgMagentaBright` · `bgCyanBright` · `bgWhiteBright`

Every color and modifier formatter has the signature:

```ts
(input: string | number) => string;
```

Numbers are automatically converted to strings.

### Hyperlinks

```ts
link(text: string | number, url: string): string;
```

Wrap anchor text in [OSC 8 hyperlink sequences](https://iterm2.com/feature-reporting/Hyperlinks_in_Terminal_Emulators.html):

```js
import { link, underline, blue } from "@niceties/ansi";

console.log(link("Documentation", "https://example.com/docs"));
console.log(link(underline(blue("Documentation")), "https://example.com/docs"));
```

Links work only in terminals that support OSC 8 hyperlinks. Other terminals display the anchor text without a clickable link. The library does not separately detect hyperlink support: `link` follows the same color detection as modifiers such as `underline`. When colors are disabled, it returns only the anchor text without escape sequences.

Pass a URI-encoded target, including its scheme (such as `https://`, `file://`, or `mailto:`). The target is used as supplied. Colors and modifiers can wrap a link or its anchor text, and nested links restore the outer target after each inner link.

## Color detection

Color support is determined at import time by calling [`process.stdout.hasColors()`](https://nodejs.org/api/tty.html#writestreamhascolorscount-env). Node.js internally evaluates environment variables such as `NO_COLOR`, `NODE_DISABLE_COLORS`, `FORCE_COLOR`, and the `TERM` setting, as well as whether stdout is a TTY. Refer to the [Node.js documentation](https://nodejs.org/api/tty.html#writestreamhascolorscount-env) for the full set of rules.

This requires Node.js ≥ 10.16.0 and only recently fixed in Deno.

## Browser support

The package exposes a `browser` export condition in `package.json`. Bundlers that respect this condition (Vite, webpack, esbuild, Rollup, etc.) will resolve to the browser entry point where all formatters and hyperlinks always emit escape sequences. This is useful for browser-based terminals and consoles that render ANSI escape sequences.

## Benchmarks

See [benchmarks/README.md](benchmarks/README.md) for the full list of benchmark scripts and competitors.

## License

[MIT](https://github.com/kshutkin/niceties/blob/main/LICENSE)
