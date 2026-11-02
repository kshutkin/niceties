[![.github/workflows/main.yml](https://github.com/kshutkin/niceties/actions/workflows/main.yml/badge.svg)](https://github.com/kshutkin/niceties/actions/workflows/main.yml)

# niceties

A collection of small, focused packages for Node.js and web development - covering terminal output, logging, ANSI colors, and CLI argument parsing.

All packages are **ESM-first**, **tree-shakeable**, and designed to work well together while remaining independent.

## Packages

| Package | Version | Coverage | Description |
| --- | --- | --- | --- |
| [@niceties/logger](./logger/README.md) | [![npm](https://img.shields.io/npm/v/@niceties/logger)](https://www.npmjs.com/package/@niceties/logger) | [![Branch coverage](https://raw.githubusercontent.com/kshutkin/niceties/coverage/logger/badge.svg)](https://github.com/kshutkin/niceties/tree/coverage/logger/coverage) | A modular logger for async tasks with pluggable appenders |
| [@niceties/draftlog-appender](./draftlog-appender/README.md) | [![npm](https://img.shields.io/npm/v/@niceties/draftlog-appender)](https://www.npmjs.com/package/@niceties/draftlog-appender) | [![Branch coverage](https://raw.githubusercontent.com/kshutkin/niceties/coverage/draftlog-appender/badge.svg)](https://github.com/kshutkin/niceties/tree/coverage/draftlog-appender/coverage) | Animated terminal appender for `@niceties/logger` using draftlog |
| [@niceties/draftlog](./draftlog/README.md) | [![npm](https://img.shields.io/npm/v/@niceties/draftlog)](https://www.npmjs.com/package/@niceties/draftlog) | [![Branch coverage](https://raw.githubusercontent.com/kshutkin/niceties/coverage/draftlog/badge.svg)](https://github.com/kshutkin/niceties/tree/coverage/draftlog/coverage) | Create mutable (in-place updatable) log lines in the terminal |
| [@niceties/ansi](./ansi/README.md) | [![npm](https://img.shields.io/npm/v/@niceties/ansi)](https://www.npmjs.com/package/@niceties/ansi) | [![Branch coverage](https://raw.githubusercontent.com/kshutkin/niceties/coverage/ansi/badge.svg)](https://github.com/kshutkin/niceties/tree/coverage/ansi/coverage) | Minimalistic, tree-shakeable ANSI colors and terminal hyperlinks library |
| [@niceties/node-parseargs-plus](./node-parseargs-plus/README.md) | [![npm](https://img.shields.io/npm/v/@niceties/node-parseargs-plus)](https://www.npmjs.com/package/@niceties/node-parseargs-plus) | [![Branch coverage](https://raw.githubusercontent.com/kshutkin/niceties/coverage/node-parseargs-plus/badge.svg)](https://github.com/kshutkin/niceties/tree/coverage/node-parseargs-plus/coverage) | Enhanced middleware-based wrapper around Node.js `util.parseArgs` |

## License

[MIT](./LICENSE)
