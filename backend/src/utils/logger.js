/**
 * Simple structured logger.
 * In production you can swap this for winston / pino.
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const currentLevel = process.env.NODE_ENV === 'production' ? levels.info : levels.debug;

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

const logger = {
  error: (message, meta) => {
    if (currentLevel >= levels.error) {
      console.error(formatMessage('error', message, meta));
    }
  },
  warn: (message, meta) => {
    if (currentLevel >= levels.warn) {
      console.warn(formatMessage('warn', message, meta));
    }
  },
  info: (message, meta) => {
    if (currentLevel >= levels.info) {
      console.info(formatMessage('info', message, meta));
    }
  },
  http: (message, meta) => {
    if (currentLevel >= levels.http) {
      console.log(formatMessage('http', message, meta));
    }
  },
  debug: (message, meta) => {
    if (currentLevel >= levels.debug) {
      console.debug(formatMessage('debug', message, meta));
    }
  },
};

export default logger;
