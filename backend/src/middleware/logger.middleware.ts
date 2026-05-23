import { pinoHttp } from 'pino-http';
import { logger } from '../utils/logger';

export const loggerMiddleware = pinoHttp({
  logger,
  customLogLevel: function (_req, res, err) {
    if (res.statusCode >= 500 || err) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      ip: req.remoteAddress
    }),
    res: (res) => ({
      statusCode: res.statusCode
    })
  }
});
