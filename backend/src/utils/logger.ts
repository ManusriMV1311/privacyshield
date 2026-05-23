import pino from 'pino';
import { config } from '../config/environment';

const isDev = config.NODE_ENV === 'development';
const isTest = config.NODE_ENV === 'test';

export const logger = pino({
  level: isTest ? 'silent' : isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    : undefined
});
