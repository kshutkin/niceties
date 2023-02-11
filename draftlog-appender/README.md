# Draftlog Appender

Appender for [`'@niceites/logger'`](../logger/README.md) implemented using draftlog package.

- Uses animation in the console to display log messages

- Small size

- Doesn't hold your event loop on exit

- Creates maximum one active interval (timer) at a time

- Supports multilevel spinners

![Example](./example.gif "In terminal")
![Example](./cmdexe.gif "In windows terminal")

### [Changlelog](./CHANGELOG.md)

# Installation

```
yarn add @niceties/draftlog-appender
```

or

```
npm install --save @niceties/draftlog-appender
```

No umd packages published because draftlog appender does not exists in umd format.

# Example

To install appender use next import:

```javascript
import "@niceties/draftlog-appender";
```

It is better to do it before other imports so default appender in `'@niceites/logger'` not installed.

## Subpackages

Default subpackage `'@niceties/draftlog-appender'` exports nothing.

Subpackage `'@niceties/draftlog-appender/core'` exports `createDraftlogAppender()` factory.

Subpackage `'@niceties/draftlog-appender/spinners'` exports spinners definitions used in default config.

## Prior art

- [draftlog](https://github.com/ivanseidel/node-draftlog)
- [dreidels](https://github.com/SweetMNM/dreidels)
- [ora](https://github.com/sindresorhus/ora)
- [Spinnies](https://github.com/jcarpanelli/spinnies)

# License

[MIT](https://github.com/kshutkin/niceties/blob/main/LICENSE)