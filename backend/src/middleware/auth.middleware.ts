import { Request, Response, NextFunction, RequestHandler } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface UserPayload {
  id: string;
  email: string;
  role: string;
}

// Extend standard Express request type definition to include user payloads
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authenticateJWT: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication token was missing or malformed.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    throw new UnauthorizedError('Access token is invalid or has expired.');
  }
};

export const requireAdmin: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication context required.');
  }

  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Administrator privileges required to execute this operation.');
  }

  next();
};
