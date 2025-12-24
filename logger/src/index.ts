import { createLogger } from './core';
import { appender } from './global-appender';
import { LogLevel, type LogMessage } from './types';

if (!appender()) {
    const [
        { asciiPrefixes, colors, unicodePrefixes, tagFactory },
        { createConsoleAppender },
        { createFormatter, terminalSupportsUnicode },
        { filterMessages },
    ] = await Promise.all([
        import('./default-formatting'),
        import('./console-appender'),
        import('./format-utils'),
        import('./appender-utils'),
    ]);
    const formatter = createFormatter(colors, terminalSupportsUnicode() ? unicodePrefixes : asciiPrefixes, tagFactory);
    let minLogLevel = LogLevel.info;
    appender(
        filterMessages((message: LogMessage) => (message.loglevel as number) >= minLogLevel, createConsoleAppender(formatter), {
            setMinLevel(logLevel: LogLevel) {
                minLogLevel = logLevel;
            },
        })
    );
}

export * from './types';
export { createLogger, appender };
