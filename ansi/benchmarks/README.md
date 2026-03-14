# @niceties/ansi benchmarks

Benchmarks comparing `@niceties/ansi` against popular terminal color libraries.

## Setup

Install benchmark dependencies:

```sh
cd benchmarks
npm install
```

## Running benchmarks

### Simple - single color application

```sh
node simple.mjs
```

### Complex - multiple nested and combined colors

```sh
node complex.mjs
```

### Recursion - nested color with repeated strings

```sh
node recursion.mjs
```

Each benchmark includes `@niceties/ansi/string` — the tagged template variant that uses `c` to assemble color-coded strings in a single pass instead of nested function calls and string concatenation.

## Competitors

- [@niceties/ansi](https://github.com/kshutkin/niceties/tree/main/ansi)
- [@niceties/ansi/string](https://github.com/kshutkin/niceties/tree/main/ansi) (tagged template variant)
- [picocolors](https://github.com/alexeyraspopov/picocolors)
- [kleur](https://github.com/lukeed/kleur)
- [kleur/colors](https://github.com/lukeed/kleur)
- [colorette](https://github.com/jorgebucaran/colorette)
- [nanocolors](https://github.com/nicedoc/nanocolors)
- [chalk](https://github.com/chalk/chalk) (v4)
- [ansi-colors](https://github.com/doowb/ansi-colors)
- [yoctocolors](https://github.com/sindresorhus/yoctocolors)
- [cli-color](https://github.com/medikoo/cli-color)
