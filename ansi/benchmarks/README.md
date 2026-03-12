# @niceties/ansi benchmarks

Benchmarks comparing `@niceties/ansi` against popular terminal color libraries.

## Setup

Install benchmark dependencies:

```sh
cd benchmarks
pnpm install
```

## Running benchmarks

### Simple — single color application

```sh
node simple.mjs
```

### Complex — multiple nested and combined colors

```sh
node complex.mjs
```

### Recursion — nested color with repeated strings

```sh
node recursion.mjs
```

### Loading time — how fast each library initializes

```sh
node loading.mjs
```

### Bundle size — minified bundle size of each library

```sh
node size.mjs
```

## Competitors

- [@niceties/ansi](https://github.com/kshutkin/niceties/tree/main/ansi)
- [picocolors](https://github.com/alexeyraspopov/picocolors)
- [kleur](https://github.com/lukeed/kleur)
- [kleur/colors](https://github.com/lukeed/kleur)
- [colorette](https://github.com/jorgebucaran/colorette)
- [nanocolors](https://github.com/nicedoc/nanocolors)
- [chalk](https://github.com/chalk/chalk) (v4)
- [ansi-colors](https://github.com/doowb/ansi-colors)
- [yoctocolors](https://github.com/sindresorhus/yoctocolors)
- [cli-color](https://github.com/medikoo/cli-color)
