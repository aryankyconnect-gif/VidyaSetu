// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { HttpError } from './errorHandler';
import prisma from '../utils/prisma';
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & {
        studentProfileId?: string;
        facultyProfileId?: string;
        crProfileId?: string;
        departmentId?: string;
        sectionId?: string;
        semesterId?: string;
      };
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      // 2. Check Cookie
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new HttpError(401, 'Authentication required: No token provided');
    }

    let payload: TokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new HttpError(401, 'Invalid or expired access token');
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        studentProfile: true,
        facultyProfile: true,
        crProfile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new HttpError(401, 'User account is inactive or not found');
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      studentProfileId: user.studentProfile?.id,
      facultyProfileId: user.facultyProfile?.id,
      crProfileId: user.crProfile?.id,
      departmentId: user.studentProfile?.departmentId || user.facultyProfile?.departmentId,
      sectionId: user.studentProfile?.sectionId || user.crProfile?.sectionId,
      semesterId: user.studentProfile?.semesterId,
    };

    next();
  } catch (error) {
    next(error);
  }
};
