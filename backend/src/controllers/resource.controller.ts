// src/controllers/resource.controller.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { HttpError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit.service';

export const getResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId, moduleId, fileType } = req.query;

    const resources = await prisma.resource.findMany({
      where: {
        ...(subjectId ? { subjectId: String(subjectId) } : {}),
        ...(moduleId ? { moduleId: String(moduleId) } : {}),
        ...(fileType ? { fileType: String(fileType) } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        module: { select: { id: true, title: true } },
        uploadedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: resources });
  } catch (error) {
    next(error);
  }
};

export const createResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, fileUrl, fileType, subjectId, moduleId } = req.body;

    if (!req.user) {
      throw new HttpError(401, 'Unauthorized');
    }

    const resource = await prisma.resource.create({
      data: {
        title,
        description,
        fileUrl,
        fileType: fileType || 'PDF',
        subjectId,
        moduleId: moduleId || null,
        uploadedById: req.user.userId,
      },
      include: {
        subject: true,
        module: true,
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      action: 'UPLOAD_RESOURCE',
      entity: 'RESOURCE',
      entityId: resource.id,
      userId: req.user.userId,
      details: `Uploaded resource "${title}" to subject ${resource.subject.code}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
};

export const deleteResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      throw new HttpError(404, 'Resource not found');
    }

    if (req.user?.role !== 'ADMIN' && resource.uploadedById !== req.user?.userId) {
      throw new HttpError(403, 'You do not have permission to delete this resource');
    }

    await prisma.resource.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    next(error);
  }
};
