# @niceties/draftlog-appender

[![Branch coverage](https://raw.githubusercontent.com/kshutkin/niceties/coverage/draftlog-appender/badge.svg)](https://github.com/kshutkin/niceties/tree/coverage/draftlog-appender/coverage)

Appender for [`@niceties/logger`](../logger/README.md) implemented using the @niceties/draftlog package.

- Uses animation in the console to display log messages

- Small size

- Doesn't hold your event loop on exit

- Creates at most one active interval (timer) at a time

- Supports multilevel spinners

![Example](./example.gif "In terminal")
![Example](./cmdexe.gif "In windows terminal")

### [Changelog](./CHANGELOG.md)

# Installation

```
npm install @niceties/draftlog-appender
```

# Example

To install the appender, use the following import:

```javascript
import "@niceties/draftlog-appender";
```

It is better to do it before other imports so that the default appender in `'@niceties/logger'` is not installed.

## Custom formatting

The formatter passed to `createDraftlogAppender()` follows the [logger formatter contract](../logger/README.md#formatter-api). It receives the complete message and an indentation count in spaces, and must preserve literal string prefixes, including whitespace.

Each item uses one draft updater. The formatter adds a prefix only on the first row; draftlog handles explicit newlines and terminal wrapping. In a TTY, subsequent rows receive an absolute margin of `indentation + 2` spaces, matching the built-in one-column prefix and its separator. Tags and custom prefix widths do not change this margin. If nesting changes, both the formatted text and continuation margin are updated. Non-TTY output leaves subsequent rows as supplied.

## Sub-packages

Default sub-package `'@niceties/draftlog-appender'` exports nothing.

Sub-package `'@niceties/draftlog-appender/core'` exports `createDraftlogAppender()` factory.

Sub-package `'@niceties/draftlog-appender/spinners'` exports spinner definitions used in the default config.

## Prior art

- [draftlog](https://github.com/ivanseidel/node-draftlog)
- [dreidels](https://github.com/SweetMNM/dreidels)
- [ora](https://github.com/sindresorhus/ora)
- [Spinnies](https://github.com/jcarpanelli/spinnies)

# License

[MIT](https://github.com/kshutkin/niceties/blob/main/LICENSE)
