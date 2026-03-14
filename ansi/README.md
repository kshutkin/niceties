# @niceties/ansi

Minimalistic ANSI colors library for terminal output.

## Why & Acknowlegments

I've been using [kleur](https://github.com/lukeed/kleur) for many years until I found that there are no bright colors that I wanted for some functionality. I tried to replace it with [picocolors](https://github.com/alexeyraspopov/picocolors) but there is no ESM packaging and I want it to be tree-shakable during bundling. So in the end I build this package which is mostly started with picocolors' idea but uses slightly optimized replace function giving better results for bigger strings but it is slower for medium complexity use cases and the same or faster for simple use cases.

## Features

- **Tree-shakeable** - only the formatters you import end up in your bundle
- **Correct nesting** - inner close codes are replaced so outer colors restore properly
- **Auto-detection** - colors are enabled or disabled based on `process.stdout.hasColors()`
- **Browser entry point** - colors are always enabled via the `browser` export condition

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

When colors are not supported, every formatter becomes an identity function that converts input to a string without adding any escape codes.

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

Every formatter has the signature:

```ts
(input: string | number) => string;
```

Numbers are automatically converted to strings.

## Color detection

Color support is determined at import time by calling [`process.stdout.hasColors()`](https://nodejs.org/api/tty.html#writestreamhascolorscount-env). Node.js internally evaluates environment variables such as `NO_COLOR`, `NODE_DISABLE_COLORS`, `FORCE_COLOR`, and the `TERM` setting, as well as whether stdout is a TTY. Refer to the [Node.js documentation](https://nodejs.org/api/tty.html#writestreamhascolorscount-env) for the full set of rules.

This requires Node.js ≥ 10.16.0 and only recently fixed in Deno.

## Browser support

The package exposes a `browser` export condition in `package.json`. Bundlers that respect this condition (Vite, webpack, esbuild, Rollup, etc.) will resolve to the browser entry point where all formatters always emit ANSI codes. This is useful for browser-based terminals and consoles that render ANSI escape sequences.

## Benchmarks

See [benchmarks/README.md](benchmarks/README.md) for the full list of benchmark scripts and competitors.

## License

[MIT](https://github.com/kshutkin/niceties/blob/main/LICENSE)
