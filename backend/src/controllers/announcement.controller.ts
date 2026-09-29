// src/controllers/announcement.controller.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { HttpError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit.service';
import { AnnouncementPriority, Role } from '@prisma/client';

export const getAnnouncements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role;
    const userDeptId = req.user?.departmentId;
    const userSectionId = req.user?.sectionId;

    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { targetRole: null }, // Broadcast to everyone
          ...(userRole ? [{ targetRole: userRole }] : []),
          ...(userDeptId ? [{ departmentId: userDeptId }] : []),
          ...(userSectionId ? [{ sectionId: userSectionId }] : []),
        ],
      },
      include: {
        author: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        department: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: announcements });
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, content, priority, targetRole, departmentId, sectionId } = req.body;

    if (!req.user) {
      throw new HttpError(401, 'Unauthorized');
    }

    // CR permission check: CR can only post to their section or students
    if (req.user.role === Role.CR) {
      if (targetRole && targetRole !== Role.STUDENT && targetRole !== Role.CR) {
        throw new HttpError(403, 'Class Representatives can only post class announcements for students');
      }
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || AnnouncementPriority.MEDIUM,
        targetRole: targetRole || null,
        departmentId: departmentId || null,
        sectionId: sectionId || null,
        authorId: req.user.userId,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    // Broadcast notifications to relevant users
    const userWhere: Record<string, unknown> = {};
    if (targetRole) userWhere.role = targetRole;

    const targetUsers = await prisma.user.findMany({
      where: userWhere,
      select: { id: true },
      take: 50,
    });

    for (const u of targetUsers) {
      if (u.id !== req.user.userId) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            title: `New Notice: ${title}`,
            message: content.slice(0, 120) + (content.length > 120 ? '...' : ''),
            link: '/app/announcements',
          },
        });
      }
    }

    await logAudit({
      action: 'CREATE_ANNOUNCEMENT',
      entity: 'ANNOUNCEMENT',
      entityId: announcement.id,
      userId: req.user.userId,
      details: `Created notice "${title}" (${announcement.priority})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const notice = await prisma.announcement.findUnique({ where: { id } });
    if (!notice) {
      throw new HttpError(404, 'Announcement not found');
    }

    if (req.user?.role !== 'ADMIN' && notice.authorId !== req.user?.userId) {
      throw new HttpError(403, 'Permission denied to delete this announcement');
    }

    await prisma.announcement.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    next(error);
  }
};
