// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new HttpError(404, `Resource not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

export const errorHandler = (
  err: Error | HttpError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  const status = (err as HttpError).status || 500;
  const message = err.message || 'Internal Server Error';
  const details = (err as HttpError).details;

  logger.error(`[${req.method}] ${req.originalUrl} - ${status} - ${message}`);

  res.status(status).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
