// biome-ignore-all lint: test file

// Type tests for @niceties/logger
// This file is checked with `tsc --noEmit` and is not executed at runtime.

import {
    Action,
    type Appender,
    appender,
    type ColorFormatters,
    createLogger,
    type DefaultExtendedApi,
    type Formatter,
    type Identity,
    type Logger,
    LogLevel,
    type LogMessage,
    type LogMessageBase,
    type LogMessageLog,
    type LogMessageWithInput,
    type Prefixes,
} from '@niceties/logger';
import {
    type Appender as AppenderAU,
    combineAppenders,
    filterMessages,
    type LogMessage as LogMessageAU,
} from '@niceties/logger/appender-utils';
import {
    type Appender as AppenderCA,
    createConsoleAppender,
    type Formatter as FormatterCA,
    type LogMessage as LogMessageCA,
} from '@niceties/logger/console-appender';
import {
    type Appender as AppenderCore,
    createLogger as createLoggerCore,
    type Identity as IdentityCore,
    type LogMessage as LogMessageCore,
} from '@niceties/logger/core';
import {
    asciiPrefixes,
    type ColorFormatters as ColorFormatterDF,
    colors,
    type Prefixes as PrefixesDF,
    tagFactory,
    unicodePrefixes,
} from '@niceties/logger/default-formatting';
import {
    type ColorFormatters as ColorFormattersFU,
    createFormatter,
    type LogMessage as LogMessageFU,
    type Prefixes as PrefixesFU,
    terminalSupportsUnicode,
} from '@niceties/logger/format-utils';
import { type Appender as AppenderGA, globalAppender, appender as globalAppenderFn } from '@niceties/logger/global-appender';
import {
    type Appender as AppenderSimple,
    createLogger as createSimpleLogger,
    type LogMessage as LogMessageSimple,
} from '@niceties/logger/simple';
import {
    Action as ActionTypes,
    type Appender as AppenderTypes,
    type ColorFormatters as ColorFormattersTypes,
    type DefaultExtendedApi as DefaultExtendedApiTypes,
    type Formatter as FormatterTypes,
    type Identity as IdentityTypes,
    type Logger as LoggerTypes,
    LogLevel as LogLevelTypes,
    type LogMessageBase as LogMessageBaseTypes,
    type LogMessageLog as LogMessageLogTypes,
    type LogMessage as LogMessageTypes,
    type LogMessageWithInput as LogMessageWithInputTypes,
    type Prefixes as PrefixesTypes,
} from '@niceties/logger/types';

// ============================================================================
// @niceties/logger - main entry
// ============================================================================

// --- createLogger ---

// createLogger with no arguments
const logger = createLogger();
logger('hello');
logger('hello', LogLevel.info);
logger('hello', LogLevel.error, new Error('fail'));

// createLogger with tag
const taggedLogger = createLogger('my-tag');
taggedLogger('message');

// createLogger with Identity
const parent = createLogger('parent');
const childLogger = createLogger({ id: 1 });
childLogger.start('starting');

// createLogger with tag and Identity
const childLogger2 = createLogger('child', { id: parent.id });
childLogger2.start('starting child');

// createLogger with undefined
const loggerUndef = createLogger(undefined);
loggerUndef('msg');

// --- Logger methods ---

// start
logger.start('starting task');
logger.start('starting task', LogLevel.verbose);
logger.start('starting task', LogLevel.info, new Error('context'));

// update
logger.update('updating task');
logger.update('updating task', LogLevel.warn);
logger.update('updating task', LogLevel.error, new Error('context'));

// finish
logger.finish('done');
logger.finish('done', LogLevel.info);
logger.finish('done', LogLevel.error, new Error('oops'));

// --- Logger.id ---
const loggerId: number | undefined = logger.id;

// --- Logger.appender ---
const currentAppender = logger.appender();
const appenderFn: (message: LogMessage) => void = currentAppender;

const myAppender: Appender = msg => {
    console.log(msg.message);
};
logger.appender(myAppender);

// --- setMinLevel (DefaultExtendedApi) ---
logger.setMinLevel(LogLevel.verbose);
logger.setMinLevel(LogLevel.error);

// --- LogLevel ---
const verbose: number = LogLevel.verbose;
const info: number = LogLevel.info;
const warn: number = LogLevel.warn;
const error: number = LogLevel.error;

// --- Action ---
const actionStart: 0 = Action.start;
const actionUpdate: 1 = Action.update;
const actionFinish: 2 = Action.finish;
const actionLog: 3 = Action.log;

// --- global appender function ---
const prevAppender = appender();
appender(myAppender);

// --- LogMessage types ---
const logMsg: LogMessageLog = {
    loglevel: LogLevel.info,
    message: 'hello',
    action: 3,
};

const logMsgWithInput: LogMessageWithInput = {
    loglevel: LogLevel.info,
    message: 'hello',
    inputId: 1,
    action: 0,
    ref: new WeakRef<never>(null as never),
};

const logMessage: LogMessage = logMsg;
const logMessage2: LogMessage = logMsgWithInput;

// --- LogMessageBase ---
const baseMsg: LogMessageBase = {
    loglevel: LogLevel.info,
    message: 'test',
};
const baseMsgFull: LogMessageBase = {
    loglevel: LogLevel.info,
    message: 'test',
    tag: 'my-tag',
    parentId: 42,
    context: new Error('fail'),
};

// --- Identity ---
const identity: Identity = {};
const identityWithId: Identity = { id: 42 };

// --- Prefixes ---
const prefixes: Prefixes = { 0: '✓', 1: '✓', 2: '⚠', 3: '✕' };

// --- ColorFormatters ---
const colorFormatters: ColorFormatters = {
    0: undefined,
    1: undefined,
    2: (text: string) => `warn: ${text}`,
    3: (text: string) => `err: ${text}`,
};

// --- Formatter ---
const formatter: Formatter = (message, usePrefix, indentation) => {
    return message.message;
};

// --- Logger type ---
const typedLogger: Logger = createLogger();

// --- Custom ErrorContext generic ---
interface CustomError {
    code: number;
    detail: string;
}
const customLogger = createLogger<CustomError>();
customLogger('msg', LogLevel.info, { code: 1, detail: 'bad' });
customLogger.start('start', LogLevel.info, { code: 2, detail: 'very bad' });

// --- Appender with custom error context ---
const customAppender: Appender<CustomError> = msg => {
    const ctx: CustomError | undefined = msg.context;
};

// --- Custom Api generic ---
interface CustomApi {
    setFilter(enabled: boolean): void;
    getStats(): { count: number };
}

// createLogger with custom Api
const customApiLogger = createLogger<Error, CustomApi>();
customApiLogger('hello');
customApiLogger.start('starting');
customApiLogger.update('updating');
customApiLogger.finish('done');
customApiLogger.setFilter(true);
const stats: { count: number } = customApiLogger.getStats();

// Logger type with custom Api
const typedCustomApiLogger: Logger<Error, CustomApi> = customApiLogger;
typedCustomApiLogger.setFilter(false);
typedCustomApiLogger.getStats();

// Appender with custom Api
const customApiAppender: Appender<Error, CustomApi> = msg => {};
customApiAppender.api = {
    setFilter(_enabled: boolean) {},
    getStats() {
        return { count: 0 };
    },
};
customApiLogger.appender(customApiAppender);

// createLogger from core with custom Api
const coreCustomApiLogger = createLoggerCore<Error, CustomApi>();
coreCustomApiLogger.setFilter(true);
coreCustomApiLogger.getStats();

// createLogger from simple with custom Api
const simpleCustomApiLogger = createSimpleLogger<Error, CustomApi>();
simpleCustomApiLogger.setFilter(true);
simpleCustomApiLogger.getStats();

// Both custom ErrorContext and custom Api
const fullyCustomLogger = createLogger<CustomError, CustomApi>();
fullyCustomLogger('msg', LogLevel.info, { code: 1, detail: 'ok' });
fullyCustomLogger.setFilter(true);
const fullyCustomStats: { count: number } = fullyCustomLogger.getStats();

// filterMessages / combineAppenders with custom Api
const customApiFilterAppender: Appender<Error, CustomApi> = msg => {};
const filteredCustomApi = filterMessages<Error, CustomApi>(msg => msg.loglevel > 0, customApiFilterAppender);
const combinedCustomApi = combineAppenders<Error, CustomApi>(customApiFilterAppender, customApiFilterAppender);

// ============================================================================
// @niceties/logger/core
// ============================================================================

const coreLogger = createLoggerCore();
coreLogger('hello');
coreLogger.start('starting');
coreLogger.update('updating');
coreLogger.finish('finishing');
coreLogger.setMinLevel(LogLevel.verbose);
const coreId: number | undefined = coreLogger.id;
const coreAppenderResult = coreLogger.appender();

const coreLoggerWithTag = createLoggerCore('tag');
const coreLoggerWithIdentity = createLoggerCore({ id: 5 });
const coreLoggerWithBoth = createLoggerCore('tag', { id: 5 });
const coreLoggerWithUndefined = createLoggerCore(undefined);

// ============================================================================
// @niceties/logger/simple
// ============================================================================

const simpleLogger = createSimpleLogger();
simpleLogger('hello');
simpleLogger('hello', LogLevel.error);
simpleLogger('hello', LogLevel.error, new Error('oops'));
simpleLogger.setMinLevel(LogLevel.verbose);
const simpleAppenderResult = simpleLogger.appender();

const simpleLoggerWithTag = createSimpleLogger('tag');
simpleLoggerWithTag('msg');

// ============================================================================
// @niceties/logger/console-appender
// ============================================================================

const myFormatter: FormatterCA = (message, usePrefix, indentation) => message.message;
const consoleApp: AppenderCA = createConsoleAppender(myFormatter);
consoleApp({ loglevel: 0, message: 'test', action: 3 });

// ============================================================================
// @niceties/logger/format-utils
// ============================================================================

const fmtColors: ColorFormattersFU = { 2: (t: string) => t };
const fmtPrefixes: PrefixesFU = { 0: '+' };
const fmtTagFactory = (tag: string) => `[${tag}]`;
const fmtFormatter = createFormatter(fmtColors, fmtPrefixes, fmtTagFactory);
const formatted: string = fmtFormatter({ loglevel: 0, message: 'hi', action: 3 });
const formattedWithPrefix: string = fmtFormatter({ loglevel: 0, message: 'hi', action: 3 }, true);
const formattedWithIndent: string = fmtFormatter({ loglevel: 0, message: 'hi', action: 3 }, false, 4);
const supportsUnicode: boolean = terminalSupportsUnicode();

// ============================================================================
// @niceties/logger/global-appender
// ============================================================================

const ga: AppenderGA<unknown> | undefined = globalAppender;
const prevGa = globalAppenderFn();
const gaAppender: AppenderGA = msg => {};
globalAppenderFn(gaAppender);

// ============================================================================
// @niceties/logger/appender-utils
// ============================================================================

const baseAppender: AppenderAU = msg => {};
const filtered = filterMessages(msg => msg.loglevel >= LogLevel.warn, baseAppender);
filtered({ loglevel: LogLevel.warn, message: 'warning', action: 3 });

const appender1: AppenderAU = msg => {};
const appender2: AppenderAU = msg => {};
const combined = combineAppenders(appender1, appender2);
combined({ loglevel: LogLevel.info, message: 'combined', action: 3 });

// filterMessages with custom error context
const customFilter = filterMessages<CustomError>(
    msg => msg.context?.code !== 0,
    msg => {}
);

// ============================================================================
// @niceties/logger/default-formatting
// ============================================================================

const up: PrefixesDF = unicodePrefixes;
const ap: PrefixesDF = asciiPrefixes;
const c: ColorFormatterDF = colors;
const tag: string = tagFactory('my-module');

// ============================================================================
// @niceties/logger/types - re-exported types
// ============================================================================

const lvlT: number = LogLevelTypes.verbose;
const actT: 0 = ActionTypes.start;
const loggerT: LoggerTypes = createLogger();
const identityT: IdentityTypes = { id: 1 };
const prefixesT: PrefixesTypes = { 0: '+' };
const cfT: ColorFormattersTypes = {};
const formatterT: FormatterTypes = msg => msg.message;
const appenderT: AppenderTypes = msg => {};
const msgT: LogMessageTypes = { loglevel: 0, message: '', action: 3 };
const baseMsgT: LogMessageBaseTypes = { loglevel: 0, message: '' };
const withInputT: LogMessageWithInputTypes = {
    loglevel: 0,
    message: '',
    inputId: 0,
    action: 0,
    ref: new WeakRef<never>(null as never),
};
const logMsgT: LogMessageLogTypes = { loglevel: 0, message: '', action: 3 };

// ============================================================================
// Negative tests — all of these MUST fail to compile
// ============================================================================

// --- createLogger wrong arg types ---

// @ts-expect-error - createLogger does not accept a number
createLogger(123);

// @ts-expect-error - createLogger does not accept a boolean
createLogger(true);

// --- Logger call with wrong arg types ---

// @ts-expect-error - first argument must be a string, not a number
logger(123);

// @ts-expect-error - first argument must be a string, not boolean
logger(true);

// @ts-expect-error - second argument (loglevel) must be a number, not string
logger('msg', 'high');

// --- start/update/finish with wrong types ---

// @ts-expect-error - start message must be string, not number
logger.start(42);

// @ts-expect-error - update message must be string, not number
logger.update(42);

// @ts-expect-error - finish message must be string, not number
logger.finish(42);

// @ts-expect-error - start loglevel must be number, not string
logger.start('msg', 'high');

// @ts-expect-error - update loglevel must be number, not string
logger.update('msg', 'high');

// @ts-expect-error - finish loglevel must be number, not string
logger.finish('msg', 'high');

// --- setMinLevel wrong type ---

// @ts-expect-error - setMinLevel expects a number, not string
logger.setMinLevel('verbose');

// --- Appender with wrong message shape ---

// @ts-expect-error - appender function expects LogMessage, not string
const badAppender: Appender = (msg: string) => {};

// --- createConsoleAppender without arguments ---

// @ts-expect-error - createConsoleAppender requires a formatter argument
createConsoleAppender();

// @ts-expect-error - createConsoleAppender requires a function, not a string
createConsoleAppender('not a formatter');

// --- createFormatter wrong types ---

// @ts-expect-error - createFormatter requires 3 arguments
createFormatter();

// @ts-expect-error - createFormatter first arg must be ColorFormatters, not string
createFormatter('bad', {}, (t: string) => t);

// --- terminalSupportsUnicode takes no arguments ---

// @ts-expect-error - terminalSupportsUnicode does not accept arguments
terminalSupportsUnicode('arg');

// --- filterMessages wrong predicate ---

// @ts-expect-error - predicate must return boolean, not accept string
filterMessages('not a function', baseAppender);

// --- combineAppenders wrong types ---

// @ts-expect-error - combineAppenders expects Appender, not string
combineAppenders('not an appender');

// --- Action values are literal types ---

// @ts-expect-error - Action.start is 0, not assignable to 1
const wrongAction: 1 = Action.start;

// --- LogMessageLog requires action: 3 ---

const badLogMsg: LogMessageLog = {
    loglevel: 0,
    message: '',
    // @ts-expect-error - LogMessageLog action must be 3, not 0
    action: 0,
};

// --- LogMessageWithInput requires action: 0 | 1 | 2 ---

const badInputMsg: LogMessageWithInput = {
    loglevel: 0,
    message: '',
    inputId: 0,
    // @ts-expect-error - LogMessageWithInput action must be 0 | 1 | 2, not 3
    action: 3,
    ref: new WeakRef<never>(null as never),
};

// --- LogMessageBase missing required fields ---

// @ts-expect-error - LogMessageBase requires message
const incompleteMsgBase: LogMessageBase = {
    loglevel: 0,
};

// --- Custom ErrorContext: wrong context type ---

// @ts-expect-error - context must be CustomError, not a plain string
customLogger('msg', LogLevel.info, 'wrong context type');

// @ts-expect-error - context must be CustomError, not Error
customLogger.start('msg', LogLevel.info, new Error('wrong'));

// --- Identity id must be number ---

// @ts-expect-error - Identity.id must be number, not string
const badIdentity: Identity = { id: 'abc' };

// --- Prefixes values must be string ---

// @ts-expect-error - Prefixes values must be string, not number
const badPrefixes: Prefixes = { 0: 123 };

// --- Simple logger does not have start/update/finish ---

// @ts-expect-error - simple logger does not have start method
simpleLogger.start('msg');

// @ts-expect-error - simple logger does not have update method
simpleLogger.update('msg');

// @ts-expect-error - simple logger does not have finish method
simpleLogger.finish('msg');

// --- Simple logger does not have id ---

// @ts-expect-error - simple logger does not have id property
const simpleId: number = simpleLogger.id;

// --- appender() with wrong type ---

// @ts-expect-error - appender expects Appender function, not a plain object
logger.appender({ notAFunction: true });

// --- tagFactory expects string ---

// @ts-expect-error - tagFactory expects string, not number
tagFactory(123);

// --- Custom Api: wrong method types ---

// @ts-expect-error - setFilter expects boolean, not string
customApiLogger.setFilter('yes');

// @ts-expect-error - setFilter expects boolean, not number
customApiLogger.setFilter(1);

// @ts-expect-error - getStats takes no arguments
customApiLogger.getStats('extra');

// --- Custom Api appender: api must match Api shape ---

// @ts-expect-error - api shape does not match CustomApi (missing getStats)
const badApiAppender: Appender<Error, CustomApi> = Object.assign((msg: LogMessage) => {}, { api: { setFilter(_enabled: boolean) {} } });

// @ts-expect-error - api shape does not match CustomApi (wrong setFilter signature)
const badApiAppender2: Appender<Error, CustomApi> = Object.assign((msg: LogMessage) => {}, {
    api: {
        setFilter(_enabled: number) {},
        getStats() {
            return { count: 0 };
        },
    },
});
