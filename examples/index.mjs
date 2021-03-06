import "@niceties/draftlog-appender";
import { createLogger, appender } from "@niceties/logger";
import kleur from "kleur";

appender().setMinLevel(0);

const waitFor = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

setTimeout(() => {
    const logger = createLogger('test tag');

    logger('test', 0);

    logger.start('I am going to be freed soon');

    logger(`${kleur.blue(kleur.bgWhite(kleur.bold('just a log line')))}`);
}, 0);

await waitFor(200);

console.log('I am from console.log');

global.gc();

await waitFor(200);

const logger2 = createLogger();
const logger3 = createLogger(logger2);
const logger4 = createLogger(logger3);
const logger5 = createLogger(logger3);
const logger6 = createLogger(logger3);

logger4.start('I have parent missing');

await waitFor(500);

logger5.update('I have parent missing');

await waitFor(500);

logger6.start('I have parent missing');

await waitFor(500);

logger2.start('I am the another missing parent');
logger6.finish('I am finished with error', 3);
logger3.start('I am the missing parent');

logger4.start('I found the parent');
logger5.start('I found the parent');

await waitFor(500);

global.gc();

await waitFor(500);

logger2.finish('Job finished');
logger3.finish('Ok');
logger4.finish('Ok !');
logger5.finish('Kind of Ok !!', 2);

await waitFor(500);

console.log('');

