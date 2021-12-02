require("@niceties/draftlog-appender");
const { createLogger } = require("@niceties/logger");
const kleur = require("kleur");

const waitFor = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const logger2 = createLogger();
const logger3 = createLogger(logger2);
const logger4 = createLogger(logger3);
const logger5 = createLogger(logger3);
const logger6 = createLogger(logger3);

Promise.resolve()
    .then(() => {
        const logger = createLogger();

        logger.start('I am going to be freed soon');

        logger(`${kleur.blue(kleur.bgWhite(kleur.bold('just a log line')))}`);
    })
    .then(() => waitFor(200))
    .then(() => {
        console.log('I am from console.log');

        global.gc();
    })
    .then(() => waitFor(200))
    .then(() => {
        logger4.start('I have parent missing');
    })
    .then(() => waitFor(500))
    .then(() => {
        logger5.update('I have parent missing');
    })
    .then(() => waitFor(500))
    .then(() => {
        logger6.update('I have parent missing');
    })
    .then(() => waitFor(500))
    .then(() => {
        logger2.start('I am the another missing parent');
        logger6.finish('I am finished with error', 3);
        logger3.start('I am the missing parent');

        logger4.start('I found the parent');
        logger5.start('I found the parent');
    })
    .then(() => waitFor(1000))
    .then(() => {
        logger2.finish('Job finished');
        logger3.finish('Ok');
        logger4.finish('Ok !');
        logger5.finish('Kind of Ok !!', 2);
    })
    .then(() => waitFor(500))
    .then(() => {
        console.log('');
    });
