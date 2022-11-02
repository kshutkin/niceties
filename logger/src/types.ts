export const enum LogLevel {
    verbose, // for debugging logs, not for displaying on screen in normal cases
    info, // should be printed to user but not an error
    warn, // something is probably wrong, but we can continue
    error // operation completely failed
}

export const enum Action {
    start,
    update,
    finish,
    log
}

export type LogMessage<ErrorContext = Error> = {
    inputId: number;
    loglevel: LogLevel;
    message: string;
    action: Action.start | Action.update | Action.finish;
    tag?: string;
    parentId?: number;
    ref: WeakRef<never>;
    context?: ErrorContext;
} | {
    inputId?: number;
    loglevel: LogLevel;
    message: string;
    action: Action.log;
    tag?: string;
    parentId?: number;
    ref?: WeakRef<never>;
    context?: ErrorContext;
};

export type Appender<ErrorContext = Error> = (message: LogMessage<ErrorContext>) => void;

export type Identity = {id?: number};

export type Prefixes = {
    [index in LogLevel]: string;
};

export type ColorFormatters = {
    [index in LogLevel]: (((text: string) => string) | undefined);
};

export type Formatter<ErrorContext = Error> = (message: LogMessage<ErrorContext>, usePrefix?: string | boolean, identation?: number) => string;

export type Logger<ErrorContext = Error> = ((message: string, loglevel?: LogLevel, context?: ErrorContext | undefined) => void) & {
    start(message: string, loglevel?: LogLevel | undefined, context?: ErrorContext | undefined): void;
    update(message: string, loglevel?: LogLevel | undefined, context?: ErrorContext | undefined): void;
    finish(message: string, loglevel?: LogLevel | undefined, context?: ErrorContext | undefined): void;
    appender(appender?: Appender<ErrorContext>): (message: LogMessage<ErrorContext>) => void;
} & Identity;

export type MinLogLevelApi = {
    setMinLevel(logLevel: LogLevel): void;
};
