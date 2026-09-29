// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { HttpError } from './errorHandler';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: 'path' in err ? err.path : 'param',
      message: err.msg,
    }));
    return next(new HttpError(400, 'Validation failed for request parameters', formatted));
  }
  next();
};
