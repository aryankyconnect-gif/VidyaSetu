// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { HttpError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit.service';
import { Role } from '@prisma/client';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        studentProfile: {
          include: {
            department: true,
            semester: true,
            section: true,
          },
        },
        facultyProfile: {
          include: {
            department: true,
          },
        },
        crProfile: {
          include: {
            section: true,
          },
        },
      },
    });

    if (!user) {
      throw new HttpError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new HttpError(403, 'Account is deactivated. Please contact campus administration.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    await logAudit({
      action: 'USER_LOGIN',
      entity: 'USER',
      entityId: user.id,
      userId: user.id,
      details: `User logged in with role ${user.role}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          studentProfile: user.studentProfile,
          facultyProfile: user.facultyProfile,
          crProfile: user.crProfile,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError(401, 'Not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        studentProfile: {
          include: {
            department: true,
            semester: true,
            section: true,
          },
        },
        facultyProfile: {
          include: {
            department: true,
          },
        },
        crProfile: {
          include: {
            section: true,
          },
        },
      },
    });

    if (!user) {
      throw new HttpError(404, 'User profile not found');
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        studentProfile: user.studentProfile,
        facultyProfile: user.facultyProfile,
        crProfile: user.crProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new HttpError(400, 'Refresh token is required');
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new HttpError(401, 'Invalid refresh token or inactive user');
    }

    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    res.status(200).json({
      success: true,
      data: {
        token: newAccessToken,
      },
    });
  } catch (error) {
    next(new HttpError(401, 'Invalid or expired refresh token'));
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('accessToken');
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  res.status(200).json({
    success: true,
    message: `If an account with email ${email} exists, password reset instructions have been dispatched. (In development mode, you may reset with code 123456).`,
  });
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, newPassword, token } = req.body;

    if (token !== '123456' && token !== 'demo') {
      throw new HttpError(400, 'Invalid or expired reset token. Use code 123456 for demo.');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new HttpError(404, 'No account found with this email.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.status(200).json({
      success: true,
      message: 'Password has been successfully updated. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      password,
      name,
      role,
      phone,
      departmentId,
      semesterId,
      sectionId,
      rollNumber,
      employeeId,
      designation,
      batchYear,
    } = req.body;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      throw new HttpError(409, 'A user with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password || 'Welcome123', 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name,
        role: role as Role,
        phone,
      },
    });

    // Create appropriate role profile
    if (role === Role.STUDENT || role === Role.CR) {
      const studentProfile = await prisma.studentProfile.create({
        data: {
          userId: user.id,
          rollNumber: rollNumber || `ROLL-${Date.now().toString().slice(-5)}`,
          batchYear: Number(batchYear) || new Date().getFullYear(),
          departmentId,
          semesterId,
          sectionId: sectionId || null,
        },
      });

      if (role === Role.CR && sectionId) {
        await prisma.cRProfile.create({
          data: {
            userId: user.id,
            studentProfileId: studentProfile.id,
            sectionId,
            term: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
          },
        });
      }
    } else if (role === Role.FACULTY) {
      await prisma.facultyProfile.create({
        data: {
          userId: user.id,
          employeeId: employeeId || `EMP-${Date.now().toString().slice(-5)}`,
          designation: designation || 'Assistant Professor',
          departmentId,
        },
      });
    }

    await logAudit({
      action: 'ADMIN_CREATE_USER',
      entity: 'USER',
      entityId: user.id,
      userId: req.user?.userId,
      details: `Admin created user ${user.email} with role ${user.role}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
