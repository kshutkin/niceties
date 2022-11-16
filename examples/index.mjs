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
const logger3_1 = createLogger(logger2);
const logger4_1 = createLogger(logger3_1);
const logger5_1 = createLogger(logger3_1);
const logger6_1 = createLogger(logger3_1);

logger4.start('I have parent missing1');
logger4_1.start('I have parent missing2');

await waitFor(500);

logger5.update('I have parent missing3');
logger5_1.update('I have parent missing4');

await waitFor(500);

logger6.start('I have parent missing5');
logger6_1.start('I have parent missing6');

await waitFor(500);

logger2.start('I am the another\nmissing parent1');
logger6.finish('I am finished with error1', 3);
logger6_1.finish('I am finished with error2', 3);
logger3.start('I am the missing parent1');
logger3_1.start('I am the missing parent2');

logger4.start('I found the parent1');
logger4_1.start('I found the parent2');
logger5.start('I found the parent3');
logger5_1.start('I found the parent4');

await waitFor(500);

global.gc();

await waitFor(500);

logger2.finish('Job finished');
logger3.finish('Ok1');
logger3_1.finish('Ok2');
logger4.finish('Ok1 !');
logger4_1.finish('Ok2 !');
logger5.finish('Kind of Ok1 !!', 2);
logger5_1.finish('Kind of Ok2 !!', 2);

await waitFor(500);

console.log('');

