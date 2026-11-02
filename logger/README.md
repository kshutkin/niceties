# @niceties/logger

[![Branch coverage](https://raw.githubusercontent.com/kshutkin/niceties/coverage/logger/badge.svg)](https://github.com/kshutkin/niceties/tree/coverage/logger/coverage)

Logger that can handle async tasks.

- Provides a normal logging API: log level, tagged logger instance, custom log data

- Provides an API for reporting async events that can later be handled by a custom appender.

- Provides a default appender that uses the console for output.

- Modular and configurable

- Small size

# Installation

```
npm install @niceties/logger
```

### [Changelog](./CHANGELOG.md)

# Example

```javascript
import { createLogger } from '@niceties/logger';

const logger = createLogger();

try {
    logger.start('starting something');
    ...
    // some async code
    ...
    logger.finish('finished something');
} catch(e) {
    logger.finish('finished something', 3);
}
```

# API

Logger factory:

```typescript
function createLogger<ErrorContext = Error>(
    ...args: [] | [string | Identity | undefined] | [string, Identity]
): ((
    message: string,
    loglevel?: LogLevel,
    context?: ErrorContext | undefined,
) => void) & {
    start(
        message: string,
        loglevel?: LogLevel | undefined,
        context?: ErrorContext | undefined,
    ): void;
    update(
        message: string,
        loglevel?: LogLevel | undefined,
        context?: ErrorContext | undefined,
    ): void;
    finish(
        message: string,
        loglevel?: LogLevel | undefined,
        context?: ErrorContext | undefined,
    ): void;
    appender(
        appender?: Appender<ErrorContext> | undefined,
    ): (message: LogMessage<ErrorContext>) => void;
};
```

Returns a logger instance that can be viewed as an entry for a single async task.

```typescript
const logger = createLogger("tag");
const logger2 = createLogger(logger);
const logger3 = createLogger("tag2", logger);
```

`tag` can be used to distinguish between async tasks (will be provided to appender).
Logger can be used as a parent of another logger (will be provided as parentId to appender).

```typescript
const log = createLogger();

try {
    // some code
    log("some message");
} catch (e) {
    log("some message", 1 /* LogLevel.info */, e);
}
```

Logger can be used as a function that logs a message or error with context. Context type can be defined during creation of the logger (only in TypeScript).

```typescript
const log = createLogger<Context>();

try {
    // some code
    log("some message");
} catch (e: Context) {
    log("some message", LogLevel.info, e);
}
```

```typescript
start(message: string, loglevel?: LogLevel | undefined, context?: ErrorContext | undefined): void;
```

Emits a start event inside a logger. If a loglevel is provided, it will be remembered and used as the default loglevel in subsequent events in the same logger instance. Default loglevel (if the argument is not provided) is `info`.

```typescript
update(message: string, loglevel?: LogLevel | undefined, context?: ErrorContext | undefined): void;
```

Emits an update event. Can be used to inform a user that we are doing something else in the same async task. The loglevel parameter is used to redefine the default loglevel.

```typescript
finish(message: string, loglevel?: LogLevel | undefined, context?: ErrorContext | undefined): void;
```

Emits a finish event. Can be used to inform a user that the task finished. loglevel is optional and equals the initial loglevel if omitted.

```typescript
const logger = createLogger();
logger.appender(someFancyAppender);
```

Sets a different appender for the specific instance of the logger.

## Formatter API

Appenders use a formatter to turn a log message into a string:

```typescript
type Formatter<ErrorContext = Error> = (
    message: LogMessage<ErrorContext>,
    usePrefix?: string | boolean,
    indentation?: number,
) => string;
```

Return the formatted text without appending an output newline or writing to stdout. The appender owns output and rendering. A formatter can be called repeatedly for the same event, for example when a spinner advances to its next frame.

`indentation` is a count of leading **spaces before the prefix**, defaulting to `0`. It is not a nesting level and does not include the width of the prefix or tag. The draftlog appender calculates this count from the current nesting depth before calling the formatter.

Custom formatters should honor these prefix arguments:

| `usePrefix` | Meaning |
| --- | --- |
| A string | Use the supplied prefix literally, including any whitespace, followed by one separator space. |
| `true` | Choose a configured status prefix for the message's log level, followed by one separator space. |
| `false` or omitted | Use normal log-prefix selection: static messages (`Action.log`) can receive a log prefix; task messages receive no status prefix. |

Do not trim a supplied string prefix. The draftlog appender passes a spinner frame for a running task and formats each complete message before draftlog handles wrapping and continuation indentation. Appenders may invoke the formatter again when an item changes, its nesting changes, or a spinner advances.

The built-in `createFormatter(colors, prefixes, logPrefixes, tagFactory)` implements this contract. Its color, status-prefix, and log-prefix maps are indexed by log level. It includes the formatted tag for verbose static logs and appends non-null context after the message.

```javascript
import { createFormatter } from '@niceties/logger/format-utils';
import { Action, LogLevel } from '@niceties/logger/types';

const format = createFormatter({}, { 1: '✓' }, { 1: 'ℹ' }, tag => `[${tag}]`);
const message = { action: Action.log, loglevel: LogLevel.info, message: 'Building' };

format(message, '⠋', 2);  // '  ⠋ Building'
format(message, ' ', 2);  // '    Building'
format(message, true, 2); // '  ✓ Building'
format(message, false, 2); // '  ℹ Building'
```

With two leading spaces and a one-column prefix plus its separator, the message body starts four columns from the left. Prefixes and tags can have other visible widths; the formatter API does not require a fixed prefix width or return continuation-alignment metadata.

## Appender API

Appenders can expose additional methods to the logger instance via the `api` property. When an appender with an `api` property is set on a logger, the `api` object is installed into the logger's prototype chain. This means the methods are accessible directly on the logger instance:

```javascript
import { createLogger } from "@niceties/logger";
import { filterMessages } from "@niceties/logger/appender-utils";

let minLevel = 1;
const filtered = filterMessages(
    (msg) => msg.loglevel >= minLevel,
    someAppender,
);
filtered.api = {
    setMinLevel(level) {
        minLevel = level;
    },
};

const logger = createLogger();
logger.appender(filtered);

// Method is available directly on the logger:
logger.setMinLevel(0);
```

When the appender is swapped, old `api` methods are automatically cleaned up - they are removed from the logger and replaced with the new appender's `api` (if any).

```typescript
const logger = createLogger();
const appender = logger.appender();
```

Returns current appender for the specific instance of the logger.

## Log levels

```javascript
const LogLevel = {
    verbose: 0, // for debugging logs, not for displaying on screen in normal cases
    info: 1, // should be printed to user but not an error
    warn: 2, // something is probably wrong, but we can continue
    error: 3, // operation completely failed
};
```

## Setting another appender

User or another library can set another appender by calling:

```typescript
function appender<ErrorContext = Error>(
    appender?: Appender<ErrorContext>,
): Appender<any>;
```

If the appender has an `api` property, its methods are installed into the `appender` function's prototype chain, making them directly accessible:

```javascript
import { appender } from "@niceties/logger";
import { filterMessages } from "@niceties/logger/appender-utils";

let minLevel = 1;
const filtered = filterMessages(
    (msg) => msg.loglevel >= minLevel,
    someAppender,
);
filtered.api = {
    setMinLevel(level) {
        minLevel = level;
    },
};
appender(filtered);

// Method is available directly on the appender function:
appender.setMinLevel(0);
```

When a new global appender is set, old `api` methods are automatically cleaned up and replaced.

The appender is a function with the following type:

```typescript
type Appender<ErrorContext = Error> = ((
    message: LogMessage<ErrorContext>,
) => void) & {
    api?: object;
};

const Action = {
    start: 0,
    update: 1,
    finish: 2,
    log: 3,
};

type LogMessage<ErrorContext = Error> =
    | {
          inputId: number;
          loglevel: LogLevel;
          message: string;
          action: Action.start | Action.update | Action.finish;
          tag?: string;
          parentId?: string;
          ref: WeakRef<never>;
      }
    | {
          inputId?: number;
          loglevel: LogLevel;
          message: string;
          action: Action.log;
          tag?: string;
          parentId?: string;
          ref?: WeakRef<never>;
          context?: ErrorContext;
      };
```

Same appender function without arguments can be used to get the current appender.

# FAQ

## Can I use more than 4 log levels

Despite the fact that loglevel is defined as an enum, it is just a number. Logger does not make assumptions about loglevels besides defining the default loglevel as 1 (LogLevel.info).

It is generally safe to expand loglevels into both positive and negative range (finer debug messages) as far as appender takes them into account.

As an example:

```typescript
const log = createLogger();

log("some message", -1);
```

will send a log message with a finer loglevel than verbose through the appender, but the default appender will ignore it.

## Can I use multiple appenders?

It is possible using combineAppenders and appender functions:

```javascript
import { createLogger, appender } from "@niceties/logger";
import { combineAppenders } from "@niceties/logger/appender-utils";

appender(combineAppenders(appender(), appender2));
```

If any of the combined appenders have an `api` property, their methods are merged into the combined appender's `api`.

## Can I set a filter for a certain loglevel?

It is possible using filterMessages and appender functions:

```javascript
import { appender } from "@niceties/logger";
import { filterMessages } from "@niceties/logger/appender-utils";

let desiredLoglevel = 0;

const filtered = filterMessages(
    (msg) => msg.loglevel >= desiredLoglevel,
    appender(),
);
filtered.api = {
    setLoglevel(loglevel) {
        desiredLoglevel = loglevel;
    },
};
appender(filtered);

// Available directly on the appender function:
appender.setLoglevel(0);
```

## How does `filterMessages` handle the `api` property?

`filterMessages` automatically forwards the `api` property from the inner (wrapped) appender. If the inner appender has an `api`, the filtered appender will inherit it. You can extend it further by setting your own `api` on the result:

```javascript
const inner = createConsoleAppender(formatter);
inner.api = {
    someMethod() {
        /* ... */
    },
};

const filtered = filterMessages((msg) => msg.loglevel >= 1, inner);
// filtered.api === inner.api (forwarded automatically)

// To add more methods while preserving the inner api:
filtered.api = {
    ...filtered.api,
    anotherMethod() {
        /* ... */
    },
};
```

## Appender API: authoring guidelines

When an appender exposes an `api` object, the `api` is installed into the prototype chain of the logger instance or the global `appender` function. Because built-in logger methods (`start`, `update`, `finish`, `appender`) and properties (`id`) are own properties of the logger, they naturally take precedence over prototype properties. This means that even if an `api` object accidentally contains a property with the same name as a built-in, the built-in will not be overwritten.

However, appender authors should still avoid using built-in names in the `api` object, as the `api` methods would be silently shadowed and inaccessible.

# Sub-packages

Default sub-package `'@niceties/logger'` exports types, `createLogger()` factory and `appender()` function.

Sub-package `'@niceties/logger/default-formatting'` exports formatting constants that are part of default configuration of the console appender.

Sub-package `'@niceties/logger/core'` exports `createLogger()` factory.

Sub-package `'@niceties/logger/simple'` exports `createLogger()` factory.

Sub-package `'@niceties/logger/console-appender'` exports `createConsoleAppender()` factory.

Sub-package `'@niceties/logger/format-utils'` exports `createFormatter()` and `terminalSupportsUnicode()` functions.

Sub-package `'@niceties/logger/global-appender'` exports `appender()` and `globalAppender`.

Sub-package `'@niceties/logger/appender-utils'` exports `combineAppenders()` and `filterMessages()`.

# Prior art

- [loglevel](https://github.com/pimterry/loglevel)
- [winston](https://github.com/winstonjs/winston)
- [node-bunyan](https://github.com/trentm/node-bunyan)
- [log4js](https://github.com/log4js-node/log4js-node)
- [pino](https://github.com/pinojs/pino)

# License

[MIT](https://github.com/kshutkin/niceties/blob/main/LICENSE)
