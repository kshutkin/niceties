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

export type Appender<ErrorContext = Error> = (message: LogMessage<ErrorContext>) => void;

export type Identity = {id?: number};

type Prefixes = {
    [index in LogLevel]: string;
};

type ColorFormatters = {
    [index in LogLevel]: (((text: string) => string) | undefined);
};

export type Formatting = {
    finishedPrefixes: Prefixes
    colors: ColorFormatters
};
