// src/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { HttpError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit.service';
import { Role } from '@prisma/client';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, search, departmentId } = req.query;

    const whereClause: Record<string, unknown> = {};

    if (role && Object.values(Role).includes(role as Role)) {
      whereClause.role = role as Role;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    if (departmentId) {
      whereClause.OR = [
        { studentProfile: { departmentId: String(departmentId) } },
        { facultyProfile: { departmentId: String(departmentId) } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        studentProfile: {
          include: { department: true, semester: true, section: true },
        },
        facultyProfile: {
          include: { department: true },
        },
        crProfile: {
          include: { section: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: {
          include: { department: true, semester: true, section: true },
        },
        facultyProfile: {
          include: { department: true, subjects: true },
        },
        crProfile: {
          include: { section: true },
        },
      },
    });

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    res.status(200).json({ success: true, data: safeUser });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    await logAudit({
      action: 'TOGGLE_USER_STATUS',
      entity: 'USER',
      entityId: user.id,
      userId: req.user?.userId,
      details: `User status changed to isActive=${user.isActive}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: `User status updated to ${user.isActive}`, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthorized');

    const { name, phone, avatarUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(name ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
