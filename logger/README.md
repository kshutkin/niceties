# Logger

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

```typescript
const enum LogLevel {
    verbose, // for debugging logs, not for displaying on screen in normal cases
    info, // should be printed to user but not an error
    warn, // something is probably wrong, but we can continue
    error, // operation completely failed
}
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

const enum Action {
    start,
    update,
    finish,
    log,
}

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
