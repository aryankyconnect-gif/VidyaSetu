// src/controllers/doubt.controller.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { HttpError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit.service';
import { DoubtStatus, Role } from '@prisma/client';

export const getDoubts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, subjectId, search, tab } = req.query;
    const userRole = req.user?.role;
    const studentProfileId = req.user?.studentProfileId;
    const facultyProfileId = req.user?.facultyProfileId;

    const whereClause: any = {};

    // Filter by subject if provided
    if (subjectId) {
      whereClause.subjectId = String(subjectId);
    }

    // Filter by status if provided
    if (status && Object.values(DoubtStatus).includes(status as DoubtStatus)) {
      whereClause.status = status as DoubtStatus;
    }

    // Tab-based filtering
    if (tab) {
      const tabStr = String(tab).toLowerCase();
      if (tabStr === 'my' && studentProfileId) {
        whereClause.studentId = studentProfileId;
      } else if (tabStr === 'active') {
        whereClause.status = { in: [DoubtStatus.OPEN, DoubtStatus.IN_DISCUSSION] };
      } else if (tabStr === 'answered') {
        whereClause.status = DoubtStatus.ANSWERED;
      } else if (tabStr === 'resolved') {
        whereClause.status = DoubtStatus.RESOLVED;
      } else if (tabStr === 'new') {
        whereClause.status = DoubtStatus.OPEN;
      }
    }

    // Text search in title, description, or topic
    if (search && String(search).trim() !== '') {
      const query = String(search).trim();
      whereClause.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { topic: { contains: query, mode: 'insensitive' } },
      ];
    }

    const doubts = await prisma.doubt.findMany({
      where: whereClause,
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
        student: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
          },
        },
        faculty: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
          },
        },
        _count: {
          select: {
            messages: true,
            attachments: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true, role: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.status(200).json({ success: true, data: doubts });
  } catch (error) {
    next(error);
  }
};

export const getDoubtById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const doubt = await prisma.doubt.findUnique({
      where: { id },
      include: {
        subject: {
          select: { id: true, name: true, code: true, facultyId: true },
        },
        student: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
          },
        },
        faculty: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
          },
        },
        attachments: {
          where: { messageId: null },
          include: {
            uploadedBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
            attachments: true,
          },
        },
      },
    });

    if (!doubt) {
      throw new HttpError(404, 'Doubt not found');
    }

    res.status(200).json({ success: true, data: doubt });
  } catch (error) {
    next(error);
  }
};

export const createDoubt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId, topic, title, description, attachments } = req.body;

    if (!req.user) {
      throw new HttpError(401, 'Unauthorized');
    }

    // Determine studentProfileId
    let studentProfileId = req.user.studentProfileId;
    if (!studentProfileId) {
      // Fallback for admin or non-student user posting demo doubts
      const studentProfile = await prisma.studentProfile.findFirst({
        where: { userId: req.user.userId },
      });
      if (studentProfile) {
        studentProfileId = studentProfile.id;
      } else {
        // If logged in as Admin/Faculty, get first student profile for testing
        const fallbackStudent = await prisma.studentProfile.findFirst();
        if (!fallbackStudent) {
          throw new HttpError(400, 'No student profile found to associate doubt');
        }
        studentProfileId = fallbackStudent.id;
      }
    }

    // Verify subject and get assigned faculty
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new HttpError(404, 'Subject not found');
    }

    const doubt = await prisma.doubt.create({
      data: {
        title,
        description,
        topic,
        subjectId,
        studentId: studentProfileId,
        facultyId: subject.facultyId || null,
        status: DoubtStatus.OPEN,
        ...(Array.isArray(attachments) && attachments.length > 0
          ? {
              attachments: {
                create: attachments.map((att: any) => ({
                  fileName: att.fileName || 'attachment',
                  fileUrl: att.fileUrl,
                  fileType: att.fileType || 'IMAGE',
                  fileSize: att.fileSize || 0,
                  uploadedById: req.user!.userId,
                })),
              },
            }
          : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        student: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
        faculty: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
        attachments: true,
      },
    });

    // Notify faculty if assigned
    if (subject.facultyId) {
      const faculty = await prisma.facultyProfile.findUnique({
        where: { id: subject.facultyId },
        select: { userId: true },
      });
      if (faculty) {
        await prisma.notification.create({
          data: {
            userId: faculty.userId,
            title: 'New Doubt Asked',
            message: `${req.user.name} posted a doubt in ${subject.code}: "${title}"`,
            link: `/app/doubts`,
          },
        });
      }
    }

    await logAudit({
      action: 'CREATE_DOUBT',
      entity: 'DOUBT',
      entityId: doubt.id,
      userId: req.user.userId,
      details: `Asked doubt "${title}" in subject ${subject.code} (${topic})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: doubt });
  } catch (error) {
    next(error);
  }
};

export const addMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { content, attachments } = req.body;

    if (!req.user) {
      throw new HttpError(401, 'Unauthorized');
    }

    if (!content || String(content).trim() === '') {
      throw new HttpError(400, 'Message content is required');
    }

    const doubt = await prisma.doubt.findUnique({
      where: { id },
      include: {
        subject: true,
        student: { select: { userId: true } },
        faculty: { select: { id: true, userId: true } },
      },
    });

    if (!doubt) {
      throw new HttpError(404, 'Doubt thread not found');
    }

    const isFaculty = req.user.role === Role.FACULTY || req.user.role === Role.ADMIN;

    // Create the message
    const message = await prisma.doubtMessage.create({
      data: {
        doubtId: id,
        senderId: req.user.userId,
        content: content.trim(),
        isFaculty,
        ...(Array.isArray(attachments) && attachments.length > 0
          ? {
              attachments: {
                create: attachments.map((att: any) => ({
                  fileName: att.fileName || 'attachment',
                  fileUrl: att.fileUrl,
                  fileType: att.fileType || 'IMAGE',
                  fileSize: att.fileSize || 0,
                  doubtId: id,
                  uploadedById: req.user!.userId,
                })),
              },
            }
          : {}),
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
        attachments: true,
      },
    });

    // Update Doubt metadata:
    // If faculty replies and doubt is OPEN, change to IN_DISCUSSION
    // If doubt facultyId is empty and sender has faculty profile, assign it
    const updateData: any = { updatedAt: new Date() };

    if (isFaculty) {
      if (doubt.status === DoubtStatus.OPEN) {
        updateData.status = DoubtStatus.IN_DISCUSSION;
      }
      if (!doubt.facultyId && req.user.facultyProfileId) {
        updateData.facultyId = req.user.facultyProfileId;
      }
    }

    await prisma.doubt.update({
      where: { id },
      data: updateData,
    });

    // Send in-app notification to the counterparty
    if (isFaculty) {
      // Notify the student
      if (doubt.student.userId !== req.user.userId) {
        await prisma.notification.create({
          data: {
            userId: doubt.student.userId,
            title: 'Faculty Replied to Doubt',
            message: `${req.user.name} replied to your doubt "${doubt.title}".`,
            link: `/app/doubts`,
          },
        });
      }
    } else {
      // Student sent message -> notify assigned faculty
      if (doubt.faculty?.userId && doubt.faculty.userId !== req.user.userId) {
        await prisma.notification.create({
          data: {
            userId: doubt.faculty.userId,
            title: 'New Student Reply in Doubt Hub',
            message: `${req.user.name} sent a reply in "${doubt.title}".`,
            link: `/app/doubts`,
          },
        });
      }
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

export const updateDoubtStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!req.user) {
      throw new HttpError(401, 'Unauthorized');
    }

    if (!status || !Object.values(DoubtStatus).includes(status as DoubtStatus)) {
      throw new HttpError(400, `Invalid status. Valid values: ${Object.values(DoubtStatus).join(', ')}`);
    }

    const doubt = await prisma.doubt.findUnique({
      where: { id },
      include: {
        student: { select: { userId: true } },
        faculty: { select: { id: true, userId: true } },
      },
    });

    if (!doubt) {
      throw new HttpError(404, 'Doubt not found');
    }

    const updateData: any = {
      status: status as DoubtStatus,
      updatedAt: new Date(),
    };

    // If faculty is setting status and not yet assigned, claim it
    if (
      (req.user.role === Role.FACULTY || req.user.role === Role.ADMIN) &&
      !doubt.facultyId &&
      req.user.facultyProfileId
    ) {
      updateData.facultyId = req.user.facultyProfileId;
    }

    const updated = await prisma.doubt.update({
      where: { id },
      data: updateData,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        student: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
        faculty: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
      },
    });

    // Notify student if faculty marked as ANSWERED or RESOLVED
    if (
      (req.user.role === Role.FACULTY || req.user.role === Role.ADMIN) &&
      doubt.student.userId !== req.user.userId
    ) {
      await prisma.notification.create({
        data: {
          userId: doubt.student.userId,
          title: `Doubt marked as ${status}`,
          message: `Your doubt "${doubt.title}" status has been updated to ${status}.`,
          link: `/app/doubts`,
        },
      });
    }

    await logAudit({
      action: 'UPDATE_DOUBT_STATUS',
      entity: 'DOUBT',
      entityId: id,
      userId: req.user.userId,
      details: `Changed doubt status to ${status}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const getDoubtStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, open, inDiscussion, answered, resolved] = await Promise.all([
      prisma.doubt.count(),
      prisma.doubt.count({ where: { status: DoubtStatus.OPEN } }),
      prisma.doubt.count({ where: { status: DoubtStatus.IN_DISCUSSION } }),
      prisma.doubt.count({ where: { status: DoubtStatus.ANSWERED } }),
      prisma.doubt.count({ where: { status: DoubtStatus.RESOLVED } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        open,
        inDiscussion,
        answered,
        resolved,
      },
    });
  } catch (error) {
    next(error);
  }
};
