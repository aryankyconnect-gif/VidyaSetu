// src/controllers/resource.controller.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { HttpError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit.service';

export const getResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      subjectId,
      moduleId,
      fileType,
      departmentId,
      semesterId,
      year,
      search,
      isPublished,
    } = req.query;

    const whereClause: Record<string, unknown> = {};

    // Filter by module
    if (moduleId) {
      whereClause.moduleId = String(moduleId);
    }

    // Filter by fileType (e.g. PDF, PPT, NOTES, PYQ, VIDEO, REFERENCE, DOCUMENT)
    if (fileType) {
      whereClause.fileType = String(fileType);
    }

    // Filter by year (e.g. for PYQs)
    if (year) {
      whereClause.year = Number(year);
    }

    // Text search on title or description
    if (search) {
      whereClause.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    // Explicit publish status filter
    if (isPublished !== undefined) {
      whereClause.isPublished = isPublished === 'true';
    }

    // Hierarchy filter on subject (department, semester)
    const subjectWhere: Record<string, unknown> = {};
    if (departmentId) subjectWhere.departmentId = String(departmentId);
    if (semesterId) subjectWhere.semesterId = String(semesterId);

    // Role-based Access Enforcement:
    // Students should only see published resources for subjects they are actively enrolled in!
    if (req.user?.role === 'STUDENT') {
      whereClause.isPublished = true;

      if (!req.user.studentProfileId) {
        throw new HttpError(403, 'Access denied: No student profile associated with this account');
      }

      if (subjectId) {
        // Check if student is enrolled in this specific subject
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            studentId_subjectId: {
              studentId: req.user.studentProfileId,
              subjectId: String(subjectId),
            },
          },
        });

        if (!enrollment || enrollment.status !== 'ACTIVE') {
          throw new HttpError(403, 'Access denied: You are not enrolled in this subject');
        }

        whereClause.subjectId = String(subjectId);
      } else {
        // Limit query to enrolled subjects only
        subjectWhere.enrollments = {
          some: {
            studentId: req.user.studentProfileId,
            status: 'ACTIVE',
          },
        };
      }
    } else {
      // Non-students (Faculty, Admin)
      if (subjectId) {
        whereClause.subjectId = String(subjectId);
      }
    }

    if (Object.keys(subjectWhere).length > 0) {
      whereClause.subject = {
        ...((whereClause.subject as Record<string, unknown>) || {}),
        ...subjectWhere,
      };
    }

    const resources = await prisma.resource.findMany({
      where: whereClause,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            departmentId: true,
            semesterId: true,
            department: { select: { id: true, name: true, code: true } },
            semester: { select: { id: true, number: true, name: true } },
          },
        },
        module: {
          select: {
            id: true,
            title: true,
            orderIndex: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: resources });
  } catch (error) {
    next(error);
  }
};

export const getPyqs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentId, semesterId, subjectId, year, search } = req.query;

    const whereClause: Record<string, unknown> = {
      fileType: 'PYQ',
    };

    if (year) {
      whereClause.year = Number(year);
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const subjectWhere: Record<string, unknown> = {};
    if (departmentId) subjectWhere.departmentId = String(departmentId);
    if (semesterId) subjectWhere.semesterId = String(semesterId);
    if (subjectId) whereClause.subjectId = String(subjectId);

    // If student, only show published
    if (req.user?.role === 'STUDENT') {
      whereClause.isPublished = true;
    }

    if (Object.keys(subjectWhere).length > 0) {
      whereClause.subject = subjectWhere;
    }

    const pyqs = await prisma.resource.findMany({
      where: whereClause,
      include: {
        subject: {
          include: {
            department: true,
            semester: true,
          },
        },
        uploadedBy: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });

    res.status(200).json({ success: true, data: pyqs });
  } catch (error) {
    next(error);
  }
};

export const createResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      description,
      fileUrl,
      fileType,
      fileSize,
      year,
      isPublished,
      subjectId,
      moduleId,
    } = req.body;

    if (!req.user) {
      throw new HttpError(401, 'Unauthorized');
    }

    // Verify subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new HttpError(404, 'Subject not found');
    }

    // Role-based Access Enforcement:
    // Faculty can ONLY manage and upload resources for their assigned subjects!
    if (req.user.role === 'FACULTY') {
      if (subject.facultyId !== req.user.facultyProfileId) {
        throw new HttpError(
          403,
          'Access denied: You can only upload resources to your assigned subjects'
        );
      }
    }

    // If moduleId provided, verify it belongs to the same subject
    if (moduleId) {
      const moduleItem = await prisma.module.findUnique({
        where: { id: moduleId },
      });
      if (!moduleItem || moduleItem.subjectId !== subjectId) {
        throw new HttpError(400, 'Invalid module ID for the selected subject');
      }
    }

    const resource = await prisma.resource.create({
      data: {
        title,
        description: description || null,
        fileUrl,
        fileType: fileType || 'PDF',
        fileSize: fileSize || null,
        year: year ? Number(year) : null,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
        subjectId,
        moduleId: moduleId || null,
        uploadedById: req.user.userId,
      },
      include: {
        subject: {
          include: {
            department: true,
            semester: true,
          },
        },
        module: true,
        uploadedBy: { select: { id: true, name: true, role: true } },
      },
    });

    await logAudit({
      action: 'UPLOAD_RESOURCE',
      entity: 'RESOURCE',
      entityId: resource.id,
      userId: req.user.userId,
      details: `Uploaded resource "${title}" (${resource.fileType}) to subject ${subject.code}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
};

export const updateResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      fileUrl,
      fileType,
      fileSize,
      year,
      isPublished,
      moduleId,
    } = req.body;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!resource) {
      throw new HttpError(404, 'Resource not found');
    }

    // Role-based Access Enforcement:
    // Faculty can ONLY modify resources for their assigned subjects or resources they uploaded!
    if (req.user?.role === 'FACULTY') {
      const isAssignedFaculty = resource.subject.facultyId === req.user.facultyProfileId;
      const isUploader = resource.uploadedById === req.user.userId;

      if (!isAssignedFaculty && !isUploader) {
        throw new HttpError(
          403,
          'Access denied: You can only modify resources for your assigned subjects'
        );
      }
    }

    // If moduleId updated, check validity
    if (moduleId) {
      const moduleItem = await prisma.module.findUnique({
        where: { id: moduleId },
      });
      if (!moduleItem || moduleItem.subjectId !== resource.subjectId) {
        throw new HttpError(400, 'Invalid module ID for the subject');
      }
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(fileUrl !== undefined ? { fileUrl } : {}),
        ...(fileType !== undefined ? { fileType } : {}),
        ...(fileSize !== undefined ? { fileSize } : {}),
        ...(year !== undefined ? { year: year ? Number(year) : null } : {}),
        ...(isPublished !== undefined ? { isPublished: Boolean(isPublished) } : {}),
        ...(moduleId !== undefined ? { moduleId: moduleId || null } : {}),
      },
      include: {
        subject: {
          include: {
            department: true,
            semester: true,
          },
        },
        module: true,
        uploadedBy: { select: { id: true, name: true, role: true } },
      },
    });

    await logAudit({
      action: 'UPDATE_RESOURCE',
      entity: 'RESOURCE',
      entityId: updated.id,
      userId: req.user?.userId,
      details: `Updated resource "${updated.title}"`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!resource) {
      throw new HttpError(404, 'Resource not found');
    }

    // Role-based Access Enforcement:
    // Admin can delete any. Faculty can delete if it's their assigned subject or uploaded by them.
    if (req.user?.role === 'FACULTY') {
      const isAssignedFaculty = resource.subject.facultyId === req.user.facultyProfileId;
      const isUploader = resource.uploadedById === req.user.userId;

      if (!isAssignedFaculty && !isUploader) {
        throw new HttpError(
          403,
          'Access denied: You can only delete resources for your assigned subjects'
        );
      }
    } else if (req.user?.role !== 'ADMIN') {
      throw new HttpError(403, 'You do not have permission to delete this resource');
    }

    await prisma.resource.delete({ where: { id } });

    await logAudit({
      action: 'DELETE_RESOURCE',
      entity: 'RESOURCE',
      entityId: id,
      userId: req.user?.userId,
      details: `Deleted resource "${resource.title}" from subject ${resource.subject.code}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    next(error);
  }
};
