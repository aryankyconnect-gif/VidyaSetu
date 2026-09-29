// src/controllers/academic.controller.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { HttpError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit.service';

// --- DEPARTMENTS ---
export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            students: true,
            faculties: true,
            subjects: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, description } = req.body;
    const department = await prisma.department.create({
      data: { name, code: code.toUpperCase(), description },
    });

    await logAudit({
      action: 'CREATE_DEPARTMENT',
      entity: 'DEPARTMENT',
      entityId: department.id,
      userId: req.user?.userId,
      details: `Created department ${name} (${code})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

// --- SEMESTERS ---
export const getSemesters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const semesters = await prisma.semester.findMany({
      orderBy: { number: 'asc' },
    });
    res.status(200).json({ success: true, data: semesters });
  } catch (error) {
    next(error);
  }
};

export const createSemester = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { number, name, academicYear, isActive } = req.body;
    const semester = await prisma.semester.create({
      data: {
        number: Number(number),
        name,
        academicYear,
        isActive: Boolean(isActive),
      },
    });

    await logAudit({
      action: 'CREATE_SEMESTER',
      entity: 'SEMESTER',
      entityId: semester.id,
      userId: req.user?.userId,
      details: `Created semester ${name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: semester });
  } catch (error) {
    next(error);
  }
};

// --- SECTIONS ---
export const getSections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentId, semesterId } = req.query;
    const sections = await prisma.section.findMany({
      where: {
        ...(departmentId ? { departmentId: String(departmentId) } : {}),
        ...(semesterId ? { semesterId: String(semesterId) } : {}),
      },
      include: {
        department: true,
        semester: true,
        crProfiles: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { students: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.status(200).json({ success: true, data: sections });
  } catch (error) {
    next(error);
  }
};

export const createSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, departmentId, semesterId } = req.body;
    const section = await prisma.section.create({
      data: { name, departmentId, semesterId },
      include: { department: true, semester: true },
    });

    await logAudit({
      action: 'CREATE_SECTION',
      entity: 'SECTION',
      entityId: section.id,
      userId: req.user?.userId,
      details: `Created section ${name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
};

// --- SUBJECTS ---
export const getSubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentId, semesterId, facultyId, myEnrolled } = req.query;

    let whereClause: Record<string, unknown> = {};

    if (departmentId) whereClause.departmentId = String(departmentId);
    if (semesterId) whereClause.semesterId = String(semesterId);
    if (facultyId) whereClause.facultyId = String(facultyId);

    // If student or CR asks for their subjects
    if (myEnrolled && req.user?.studentProfileId) {
      whereClause.enrollments = {
        some: { studentId: req.user.studentProfileId },
      };
    }

    // If faculty asks for their assigned subjects
    if (req.user?.role === 'FACULTY' && !facultyId && !myEnrolled) {
      if (req.user.facultyProfileId) {
        whereClause.facultyId = req.user.facultyProfileId;
      }
    }

    const subjects = await prisma.subject.findMany({
      where: whereClause,
      include: {
        department: true,
        semester: true,
        faculty: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: {
            modules: true,
            resources: true,
            assignments: true,
            quizzes: true,
            enrollments: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

export const getSubjectById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        department: true,
        semester: true,
        faculty: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            resources: true,
          },
        },
        resources: {
          where: { moduleId: null },
          include: {
            uploadedBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        assignments: {
          orderBy: { dueDate: 'asc' },
          include: {
            _count: { select: { submissions: true } },
          },
        },
        quizzes: {
          where: req.user?.role === 'STUDENT' ? { isPublished: true } : {},
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { questions: true, attempts: true } },
          },
        },
        enrollments: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                section: true,
              },
            },
          },
        },
      },
    });

    if (!subject) {
      throw new HttpError(404, 'Subject not found');
    }

    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

export const createSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, credits, departmentId, semesterId, facultyId } = req.body;

    const subject = await prisma.subject.create({
      data: {
        name,
        code: code.toUpperCase(),
        credits: Number(credits) || 3,
        departmentId,
        semesterId,
        facultyId: facultyId || null,
      },
      include: {
        department: true,
        semester: true,
        faculty: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    await logAudit({
      action: 'CREATE_SUBJECT',
      entity: 'SUBJECT',
      entityId: subject.id,
      userId: req.user?.userId,
      details: `Created subject ${name} (${code})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

// --- MODULES ---
export const createModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, orderIndex, subjectId } = req.body;

    const moduleItem = await prisma.module.create({
      data: {
        title,
        description,
        orderIndex: Number(orderIndex) || 1,
        subjectId,
      },
    });

    res.status(201).json({ success: true, data: moduleItem });
  } catch (error) {
    next(error);
  }
};
