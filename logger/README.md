# Logger

Experimental logger/reporter for async tasks.

- Provides API for reporting async events that can be later handled by custom appender.

- Provides default appender that uses console for output.

- Modular and configurable

- Small size

# Installation

```
yarn add @niceties/logger
```

or

```
npm install --save @niceties/logger
```

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
function createLogger<ErrorContext = Error>(...args: [] | [string | Identity] | [string, Identity]): ((message: string, loglevel?: LogLevel, context?: ErrorContext | undefined) => void) & {
    start(message: string, loglevel?: LogLevel | undefined): void;
    update(message: string, loglevel?: LogLevel | undefined): void;
    finish(message: string, loglevel?: LogLevel | undefined): void;
    withAppender(appender: Appender<ErrorContext>): ((message: string, loglevel?: LogLevel, context?: ErrorContext | undefined) => void) & any;
};
```

Will return a logger instance that can be viewed as an entry for a single async task.

```typescript
const logger = createLogger('tag');
const logger2 = createLogger(logger);
const logger3 = createLogger('tag2', logger);
```

`tag` can be used to distinguish between async tasks (will be provided to appender).
logger can be used as parent of another logger (will be provided as parentId to appender).

```typescript
const log = createLogger();

try {
    // some code
    log('some message');
} catch (e) {
    log('some message', 1, e);
}
```

Logger can be used as a function that logs message or error with context. Context type can be defined during creation of the logger (only in typescript).

```typescript
const log = createLogger<Context>();

try {
    // some code
    log('some message');
} catch (e: Context) {
    log('some message', LogLevel.info, e);
}
```

```typescript
start(message: string, loglevel?: LogLevel | undefined): void;
```

Emits start event inside a logger. If loglevel provided it will be remembered and used as default loglevel in subsequent events in the same logger instance. Default loglevel (if argument is not provided) is `info`.

```typescript
update(message: string, loglevel?: LogLevel | undefined): void;
```

Emits update event. Can be used to inform user that we are doing something else in the same async task. loglevel used to redefine default loglevel.

```typescript
finish(message: string, loglevel?: LogLevel | undefined): void;
```

Emits finish event. Can be used to inform user that task finished. loglevel is optional and equals initial loglevel if omitted.

```typescript
const log = createLogger()
                .withAppender(someFancyAppender);
```

Adds new appender for the specific inctance of logger. It is not mandatory to use the return value because no new instance of logger created and appender added to the existing instance.

```typescript
const log = createLogger()
                .withFilter(predicate);
```

Install filter on previosly installed appenders. It is not mandatory to use the return value because no new instance of logger created and filter added to the existing instance.

## Log levels

```typescript
const enum LogLevel {
    verbose, // for debugging logs, not for displaying on screen in normal cases
    info, // should be printed to user but not an error
    warn, // something is probably wrong, but we can continue
    error // operation completely failed
}
```

## Setting another appender

User or another library can set another appender by calling:

```typescript
function appender<ErrorContext = Error>(appender?: Appender<ErrorContext>): Appender<any>;
```

where appender is a function with following type

```typescript
(message: LogMessage<ErrorContext>) => void;

const enum Action {
    start,
    update,
    success,
    fail
}

type LogMessage<ErrorContext = Error> = {
    inputId: number;
    loglevel: LogLevel;
    message: string;
    action: Action.start | Action.update | Action.finish;
    tag?: string;
    parentId?: string;
    ref: WeakRef<never>;
} | {
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

Same appender function without arguments can be used to get current appender.

# FAQ

## Can I use more than 4 log levels

Despite the fact loglevel defined as an enum it is just a number. Logger does not make assumptions about loglevels besides defining default loglevel as 1 (LogLevel.info).

It is generally safe to expand loglevels into both positive and negative range (finer debug messages) as far as appender takes them into account.

As an example:

```typescript
const log = createLogger();

log('some message', -1);
```

will send a log message with finer loglevel than verbose through appender but default appender will ignore it.

## Can I use multiple appenders?

It is possible using combuneAppenders and appender functions:

```javascript
import { createLogger, appender } from "@niceties/logger";
import { combineAppenders } from "@niceties/logger/appender-utils";

appender(combineAppenders(appender(), appender2));
```

## Can I set filter for certain loglevel

It is possible using filterMessages and appender functions:

```javascript
import { filterMessages } from "@niceties/logger/appender-utils";

let desiredLoglevel = 0;

appender(filterMessages((msg) => msg.loglevel >= desiredLoglevel, appender()));

function setLoglevel(loglevel) {
    desiredLoglevel = loglevel;
}
```

# Subpackages

Default subpackage `'@niceties/logger'` exports types, `createLogger()` factory and `appender()` function.

Subpackage `'@niceties/logger/default-formatting'` exports formatting constants that is part of default configuration of the console appender.

Subpackage `'@niceties/logger/core'` exports `createLogger()` factory and `appender()` function.

Subpackage `'@niceties/logger/console-appender'` exports `createConsoleAppender()` factory.

Subpackage `'@niceties/logger/format-utils'` exports `createFormatter()` and `terminalSupportsUnicode()` functions.

Subpackage `'@niceties/logger/appender-utils'` exports `filterMessages()` and `combineAppenders()` functions.

# Prior art

- [loglevel](https://github.com/pimterry/loglevel)

# License

[MIT](./LICENSE)