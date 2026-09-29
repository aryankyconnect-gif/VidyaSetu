// src/middleware/role.ts
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { HttpError } from './errorHandler';

export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HttpError(401, 'Unauthorized: User not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new HttpError(
          403,
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};
