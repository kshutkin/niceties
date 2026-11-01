# Changelog

## 0.6.1

### Patch Changes

- 7324d5f: Resolve omitted CLI arguments once in `parseArgsPlus` before running middleware. Command and optional-value middleware now use the prepared argument list rather than providing their own process argv fallback.
- 33a7a93: Return requested tokens for global flags, the explicit command positional, and command arguments. Preserve original indexes and inline-value spelling across command slicing and optional-value rewriting, while keeping token values unconverted.
- fc9c7cc: Parse an implicit default command's complete argument list with its merged global and command option schema, so command options before positional arguments are accepted.
- 3e33ec3: Preserve explicit global option values before a command instead of replacing them with defaults from the command parse. Explicit flags after the command retain precedence over earlier flags.
- 9fd4bf4: Keep custom value converters scoped to their command. Apply global converters plus the selected command's overrides, without invoking converters from inactive commands.
- 6119f99: Scope optional-value argument rewriting to global options before a command and the selected command's merged options afterward. Required options and aliases are no longer made optional by inactive commands or shadowed global rules.

## 0.6.0

### Minor Changes

- 4b5be29: support allowNegative on command level

## 0.5.1

### Patch Changes

- 2cff0e7: fix helpSections inference issue

## 0.5.0

### Minor Changes

- b1abc60: fix customValue and optionalValue cooperation

  minor change because of order swap

- e9c28b0: change package info design

## 0.4.0

### Minor Changes

- 5485fb4: change customValue design

## 0.3.0

### Minor Changes

- ee4674e: added package info helper

## 0.2.1

### Patch Changes

- a1b63da: fix readme

## 0.2.0

### Minor Changes

- 9a05816: optional value middleware
- 5d73e11: support camelCase options
- 7856392: custom value middleware

## 0.1.2

### Patch Changes

- 9e1b454: remove sourcemaps

## 0.1.1

### Patch Changes

- 8fe5bd6: fix packaging

## 0.1.0

### Minor Changes

- fb8159d: initial release

### Patch Changes

- Updated dependencies [fb8159d]
  - @niceties/ansi@1.0.0
