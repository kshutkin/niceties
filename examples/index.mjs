import "@niceties/draftlog-appender";
import { createLogger } from "@niceties/logger";

setTimeout(() => {
    const logger = createLogger();

    logger.start('test1');
}, 500);

const logger2 = createLogger();

setTimeout(() => {
    logger2.start('asdsadasdas');
}, 700);

setTimeout(() => {
    logger2('!!!!!!!!!');
}, 600);

setTimeout(() => {
    global.gc();
}, 1000);

setTimeout(() => {
    logger2.finish('finished second logger');
}, 2000);
