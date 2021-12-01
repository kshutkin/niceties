import { createLogger } from "@niceties/logger";

const logger = createLogger();

logger('verbose message', 0);
logger('info message');
logger('warning message', 2);
logger('error message', 4);