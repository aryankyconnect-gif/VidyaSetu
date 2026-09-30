// src/controllers/assignment.controller.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { HttpError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit.service';
import { SubmissionStatus } from '@prisma/client';
import { SimilarityService } from '../services/similarity.service';
import { logger } from '../utils/logger';

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
    const {
      title,
      description,
      dueDate,
      totalMarks,
      subjectId,
      instructions,
      startDate,
      maxFileSizeMB,
      allowedFormats,
      maxAttempts,
      isPublished,
      allowedSubmissions,
    } = req.body;

    if (!req.user) {
      throw new HttpError(401, 'Unauthorized');
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        instructions: instructions || null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: new Date(dueDate),
        totalMarks: Number(totalMarks) || 100,
        maxFileSizeMB: maxFileSizeMB ? Number(maxFileSizeMB) : null,
        allowedFormats: allowedFormats ? JSON.stringify(allowedFormats) : null,
        maxAttempts: maxAttempts ? Number(maxAttempts) : null,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : false,
        allowedSubmissions: allowedSubmissions !== undefined ? Boolean(allowedSubmissions) : true,
        subjectId,
        createdById: req.user.userId,
      },
      include: { subject: true },
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
          message: `New assignment "${title}" has been posted in ${assignment.subject.code}. Due: ${new Date(dueDate).toLocaleDateString()}.`,
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

    // Validate deadline
    if (new Date() > assignment.dueDate) {
      throw new HttpError(403, 'Submission deadline has passed');
    }
    // Validate file size and format if provided
    if (fileUrl) {
      // Assuming fileUrl contains query params with size and mime (mock validation)
      // In real implementation, extract file metadata from storage service.
      if (assignment.maxFileSizeMB) {
        // Placeholder: parse size from URL if format size=123MB
        const sizeMatch = fileUrl.match(/size=(\d+)/);
        const fileSizeMB = sizeMatch ? parseInt(sizeMatch[1], 10) : null;
        if (fileSizeMB && fileSizeMB > assignment.maxFileSizeMB) {
          throw new HttpError(400, `File size exceeds maximum of ${assignment.maxFileSizeMB} MB`);
        }
      }
      if (assignment.allowedFormats) {
        const allowed = JSON.parse(assignment.allowedFormats);
        const extMatch = fileUrl.match(/\.([a-zA-Z0-9]+)(\?|$)/);
        const ext = extMatch ? extMatch[1].toLowerCase() : '';
        const mimeMap: Record<string, string> = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
        const fileMime = mimeMap[ext] || '';
        if (!allowed.includes(fileMime)) {
          throw new HttpError(400, 'File format not allowed for this assignment');
        }
      }
    }

    const isLate = new Date() > new Date(assignment.dueDate);

    // Extract text from content and/or PDF submission
    const extraction = await SimilarityService.extractSubmissionText(content, fileUrl);

    let calculatedSimilarity = 0;
    let similarityReport = extraction.warning || 'Original work - No peer matches';

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
        extractedText: extraction.text,
        extractionStatus: extraction.status,
        similarityScore: calculatedSimilarity,
        similarityReport,
        status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      create: {
        assignmentId: id,
        studentId: req.user.studentProfileId,
        fileUrl,
        content,
        extractedText: extraction.text,
        extractionStatus: extraction.status,
        similarityScore: calculatedSimilarity,
        similarityReport,
        status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
      },
      include: {
        grade: true,
      },
    });

    // Run similarity comparisons against peer submissions within this assignment
    try {
      await SimilarityService.runAssignmentSimilarity(id);
    } catch (simErr: any) {
      logger.error(`Error running similarity detection for assignment ${id}: ${simErr.message}`);
    }

    // Refetch updated submission with current similarity score
    const updatedSubmission = await prisma.assignmentSubmission.findUnique({
      where: { id: submission.id },
      include: { grade: true },
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

    res.status(200).json({ success: true, data: updatedSubmission || submission });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentSimilarity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { filter, search } = req.query;

    if (!req.user) throw new HttpError(401, 'Unauthorized');

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        subject: true,
        submissions: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new HttpError(404, 'Assignment not found');
    }

    // Authorization: Faculty can view if they created it or teach the subject, Admin can view any
    if (
      req.user.role === 'FACULTY' &&
      assignment.createdById !== req.user.userId &&
      assignment.subject.facultyId !== req.user.facultyProfileId
    ) {
      throw new HttpError(403, 'You are not authorized to view similarity reports for this assignment');
    }

    let records = await SimilarityService.runAssignmentSimilarity(id);

    // Apply risk filter ('HIGH' | 'MEDIUM' | 'LOW')
    if (filter && typeof filter === 'string' && filter.toUpperCase() !== 'ALL') {
      const riskUpper = filter.toUpperCase();
      records = records.filter((r) => r.riskLevel === riskUpper);
    }

    // Apply search filter (Student name or Roll Number)
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      records = records.filter((r) => {
        const nameA = r.submissionA?.student?.user?.name?.toLowerCase() || '';
        const rollA = r.submissionA?.student?.rollNumber?.toLowerCase() || '';
        const nameB = r.submissionB?.student?.user?.name?.toLowerCase() || '';
        const rollB = r.submissionB?.student?.rollNumber?.toLowerCase() || '';
        return nameA.includes(q) || rollA.includes(q) || nameB.includes(q) || rollB.includes(q);
      });
    }

    res.status(200).json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          totalMarks: assignment.totalMarks,
          subjectCode: assignment.subject.code,
          totalSubmissions: assignment.submissions.length,
        },
        pairs: records,
        totalPairs: records.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const recalculateAssignmentSimilarity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.user) throw new HttpError(401, 'Unauthorized');

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!assignment) {
      throw new HttpError(404, 'Assignment not found');
    }

    if (
      req.user.role === 'FACULTY' &&
      assignment.createdById !== req.user.userId &&
      assignment.subject.facultyId !== req.user.facultyProfileId
    ) {
      throw new HttpError(403, 'You are not authorized to recalculate similarity for this assignment');
    }

    // Clear cached pairwise similarities to force fresh recalculation
    await prisma.submissionSimilarity.deleteMany({
      where: { assignmentId: id },
    });

    // Reset cached extractedText on submissions so they re-extract if updated
    await prisma.assignmentSubmission.updateMany({
      where: { assignmentId: id },
      data: { extractedText: null },
    });

    const records = await SimilarityService.runAssignmentSimilarity(id);

    res.status(200).json({
      success: true,
      message: 'Similarity analysis recalculated successfully',
      data: records,
    });
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

export const deleteAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new HttpError(404, 'Assignment not found');
    }

    if (req.user?.role === 'FACULTY' && assignment.createdById !== req.user.userId) {
      throw new HttpError(403, 'You can only delete assignments you created');
    }

    await prisma.assignment.delete({ where: { id } });

    await logAudit({
      action: 'DELETE_ASSIGNMENT',
      entity: 'ASSIGNMENT',
      entityId: id,
      userId: req.user?.userId,
      details: `Deleted assignment "${assignment.title}"`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

