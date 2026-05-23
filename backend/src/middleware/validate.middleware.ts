import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AnyZodObject } from 'zod';

export const validate = (schema: AnyZodObject): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    // Bind type-safe parsed objects back to express request reference
    req.body = parsed.body;
    req.query = parsed.query;
    req.params = parsed.params;
    
    next();
  };
};
