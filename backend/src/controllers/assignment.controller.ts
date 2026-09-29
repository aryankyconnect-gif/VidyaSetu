// src/controllers/assignment.controller.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { HttpError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit.service';
import { SubmissionStatus } from '@prisma/client';

export const getAssignments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId } = req.query;

    let whereClause: Record<string, unknown> = {};
    if (subjectId) {
      whereClause.subjectId = String(subjectId);
    }

    // If student, filter by enrolled subjects
    if (req.user?.role === 'STUDENT' || req.user?.role === 'CR') {
      if (req.user.studentProfileId) {
        whereClause.subject = {
          enrollments: {
            some: { studentId: req.user.studentProfileId },
          },
        };
      }
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        submissions: req.user?.studentProfileId
          ? {
              where: { studentId: req.user.studentProfileId },
              include: { grade: true },
            }
          : {
              include: {
                student: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                  },
                },
                grade: true,
              },
            },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        submissions: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                section: true,
              },
            },
            grade: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new HttpError(404, 'Assignment not found');
    }

    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

export const createAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, dueDate, totalMarks, subjectId } = req.body;

    if (!req.user) {
      throw new HttpError(401, 'Unauthorized');
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        totalMarks: Number(totalMarks) || 100,
        subjectId,
        createdById: req.user.userId,
      },
      include: {
        subject: true,
      },
    });

    // Notify enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { subjectId },
      include: { student: true },
    });

    for (const enrollment of enrollments) {
      await prisma.notification.create({
        data: {
          userId: enrollment.student.userId,
          title: 'New Assignment Posted',
          message: `New assignment "${title}" has been posted in ${assignment.subject.code}. Due: ${new Date(
            dueDate
          ).toLocaleDateString()}.`,
          link: '/app/assignments',
        },
      });
    }

    await logAudit({
      action: 'CREATE_ASSIGNMENT',
      entity: 'ASSIGNMENT',
      entityId: assignment.id,
      userId: req.user.userId,
      details: `Created assignment "${title}" for ${assignment.subject.code}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

export const submitAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // assignmentId
    const { fileUrl, content } = req.body;

    if (!req.user?.studentProfileId) {
      throw new HttpError(403, 'Only registered students or CRs can submit assignments');
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new HttpError(404, 'Assignment not found');
    }

    const isLate = new Date() > new Date(assignment.dueDate);

    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: id,
          studentId: req.user.studentProfileId,
        },
      },
      update: {
        fileUrl,
        content,
        status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      create: {
        assignmentId: id,
        studentId: req.user.studentProfileId,
        fileUrl,
        content,
        status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
      },
      include: {
        grade: true,
      },
    });

    // Notify assignment creator (Faculty)
    await prisma.notification.create({
      data: {
        userId: assignment.createdById,
        title: 'Assignment Submitted',
        message: `${req.user.name} submitted work for "${assignment.title}".`,
        link: `/app/assignments/${assignment.id}`,
      },
    });

    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};

export const gradeSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { submissionId } = req.params;
    const { marksObtained, feedback } = req.body;

    if (!req.user) {
      throw new HttpError(401, 'Unauthorized');
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: true,
        student: { include: { user: true } },
      },
    });

    if (!submission) {
      throw new HttpError(404, 'Submission not found');
    }

    const grade = await prisma.grade.upsert({
      where: { submissionId },
      update: {
        marksObtained: Number(marksObtained),
        feedback,
        gradedById: req.user.userId,
        gradedAt: new Date(),
      },
      create: {
        submissionId,
        marksObtained: Number(marksObtained),
        feedback,
        gradedById: req.user.userId,
      },
    });

    // Mark submission status as GRADED
    await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.GRADED },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: submission.student.userId,
        title: 'Assignment Graded',
        message: `Your submission for "${submission.assignment.title}" has been graded: ${marksObtained}/${submission.assignment.totalMarks}`,
        link: `/app/assignments/${submission.assignmentId}`,
      },
    });

    await logAudit({
      action: 'GRADE_SUBMISSION',
      entity: 'GRADE',
      entityId: grade.id,
      userId: req.user.userId,
      details: `Graded submission by ${submission.student.user.name}: ${marksObtained} marks`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: grade });
  } catch (error) {
    next(error);
  }
};
