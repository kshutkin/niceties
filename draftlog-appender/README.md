# Draftlog Appender

Appender for [`'@niceties/logger'`](../logger/README.md) implemented using the @niceties/draftlog package.

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
