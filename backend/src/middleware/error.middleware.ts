import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { ZodError } from 'zod';

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Zod Validation Schema Failures
  if (err instanceof ZodError) {
    logger.warn({ err }, 'Request validation schema validation failed');
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: err.format()
    });
    return;
  }

  // 2. Custom AppErrors (Operational Exceptions)
  if (err instanceof AppError) {
    const isClientError = err.statusCode >= 400 && err.statusCode < 500;
    
    if (isClientError) {
      logger.warn({ err }, `Client operational warning (${err.statusCode}): ${err.message}`);
    } else {
      logger.error({ err }, `Server operational error (${err.statusCode}): ${err.message}`);
    }

    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details ? { details: err.details } : {})
    });
    return;
  }

  // 3. Unhandled Generic Failures
  logger.error({ err }, 'Unhandled runtime exception encountered');
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    ...(config.NODE_ENV === 'development' ? { stack: err.stack, message: err.message } : {})
  });
};
