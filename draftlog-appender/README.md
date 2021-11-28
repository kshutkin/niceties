# Draftlog Appender

Appender for `'@niceites/logger'` implemented using draftlog package

# Installation

```
yarn add @niceties/draftlog-appender
```

or

```
npm install --save @niceties/draftlog-appender
```

# Example

To install appender use next import:

```javascript
import "@niceties/draftlog-appender";
```

It is better to do it before other imports so default appender in `'@niceites/logger'` not installed.

## Subpackages

Default subpackage `'@niceties/draftlog-appender'` exports nothing.

Subpackage `'@niceties/draftlog-appender/core'` exports `createDraftlogAppender()` factory.

Subpackage `'@niceties/draftlog-appender/spinners'` exports `spinners` const definition used in default config.

# License

[MIT](./LICENCE)