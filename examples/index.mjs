import "@niceties/draftlog-appender";
import { createLogger } from "@niceties/logger";

setTimeout(() => {
    const logger = createLogger();

    logger.start('test1');
}, 500);

const logger2 = createLogger();
const logger3 = createLogger(logger2);
const logger4 = createLogger(logger3);
const logger5 = createLogger(logger3);
const logger6 = createLogger(logger3);

setTimeout(() => {
    logger4.start('444444444');
    logger5.update('555555555');
    logger6.start('666666666');
}, 600);

setTimeout(() => {
    
}, 550);

setTimeout(() => {
    logger2.start('asdsadasdas');
    logger6.finish('error', 3);
    logger3.start('!!!!!!!!!');
}, 700);

setTimeout(() => {
    global.gc();
}, 1000);

setTimeout(() => {
    logger2.finish('finished second logger');
    logger3.finish('++++++++++++++++');
}, 2000);
