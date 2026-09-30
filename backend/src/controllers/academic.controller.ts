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
        semesters: {
          orderBy: { number: 'asc' },
        },
        _count: {
          select: {
            students: true,
            faculties: true,
            subjects: true,
            semesters: true,
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

export const updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(code ? { code: code.toUpperCase() } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    await logAudit({
      action: 'UPDATE_DEPARTMENT',
      entity: 'DEPARTMENT',
      entityId: department.id,
      userId: req.user?.userId,
      details: `Updated department ${department.name}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.department.delete({ where: { id } });

    await logAudit({
      action: 'DELETE_DEPARTMENT',
      entity: 'DEPARTMENT',
      entityId: id,
      userId: req.user?.userId,
      details: `Deleted department ${id}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// --- SEMESTERS ---
export const getSemesters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentId } = req.query;

    const semesters = await prisma.semester.findMany({
      where: departmentId ? { departmentId: String(departmentId) } : {},
      include: {
        department: true,
        _count: {
          select: {
            subjects: true,
            students: true,
            sections: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    });
    res.status(200).json({ success: true, data: semesters });
  } catch (error) {
    next(error);
  }
};

export const createSemester = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { number, name, academicYear, isActive, departmentId } = req.body;
    const semester = await prisma.semester.create({
      data: {
        number: Number(number),
        name,
        academicYear: academicYear || '2025-2026',
        isActive: Boolean(isActive),
        departmentId: departmentId || null,
      },
      include: { department: true },
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

export const updateSemester = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { number, name, academicYear, isActive, departmentId } = req.body;

    const semester = await prisma.semester.update({
      where: { id },
      data: {
        ...(number !== undefined ? { number: Number(number) } : {}),
        ...(name ? { name } : {}),
        ...(academicYear ? { academicYear } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
      },
      include: { department: true },
    });

    res.status(200).json({ success: true, data: semester });
  } catch (error) {
    next(error);
  }
};

export const deleteSemester = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.semester.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Semester deleted successfully' });
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

export const updateSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, departmentId, semesterId } = req.body;

    const section = await prisma.section.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(semesterId ? { semesterId } : {}),
      },
      include: { department: true, semester: true },
    });

    await logAudit({
      action: 'UPDATE_SECTION',
      entity: 'SECTION',
      entityId: section.id,
      userId: req.user?.userId,
      details: `Updated section ${section.name}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
};

export const deleteSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        _count: { select: { students: true, crProfiles: true, enrollments: true } },
      },
    });

    if (!section) {
      throw new HttpError(404, 'Section not found');
    }

    if (section._count.students > 0 || section._count.crProfiles > 0) {
      throw new HttpError(
        400,
        `Cannot delete section with ${section._count.students} assigned students. Reassign students first.`
      );
    }

    await prisma.section.delete({ where: { id } });

    await logAudit({
      action: 'DELETE_SECTION',
      entity: 'SECTION',
      entityId: id,
      userId: req.user?.userId,
      details: `Deleted section ${section.name}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Section deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// --- SUBJECTS ---
export const getSubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentId, semesterId, facultyId, myEnrolled, search } = req.query;

    let whereClause: Record<string, unknown> = {};

    if (departmentId) whereClause.departmentId = String(departmentId);
    if (semesterId) whereClause.semesterId = String(semesterId);
    if (facultyId) whereClause.facultyId = String(facultyId);

    if (search) {
      whereClause.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { code: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    // If student or CR asks for their subjects or role is STUDENT
    if ((myEnrolled || req.user?.role === 'STUDENT') && req.user?.studentProfileId) {
      whereClause.enrollments = {
        some: { studentId: req.user.studentProfileId },
      };
    }

    // If faculty asks for their assigned subjects
    if (req.user?.role === 'FACULTY' && !facultyId && (myEnrolled || req.query.myAssigned === 'true')) {
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
            resources: {
              where: req.user?.role === 'STUDENT' ? { isPublished: true } : {},
              include: {
                uploadedBy: {
                  select: { id: true, name: true, role: true },
                },
              },
            },
          },
        },
        resources: {
          where: {
            moduleId: null,
            ...(req.user?.role === 'STUDENT' ? { isPublished: true } : {}),
          },
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

    // Role-Based Access Enforcement for Students:
    // Students can ONLY view subjects they are actively enrolled in!
    if (req.user?.role === 'STUDENT') {
      if (!req.user.studentProfileId) {
        throw new HttpError(403, 'Access denied: No student profile associated with this account');
      }
      const isEnrolled = subject.enrollments.some(
        (e) => e.student.id === req.user?.studentProfileId && e.status === 'ACTIVE'
      );
      if (!isEnrolled) {
        throw new HttpError(403, 'Access denied: You are not enrolled in this subject');
      }
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

export const updateSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, code, credits, departmentId, semesterId, facultyId } = req.body;

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(code ? { code: code.toUpperCase() } : {}),
        ...(credits !== undefined ? { credits: Number(credits) } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(semesterId ? { semesterId } : {}),
        ...(facultyId !== undefined ? { facultyId: facultyId || null } : {}),
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
      action: 'UPDATE_SUBJECT',
      entity: 'SUBJECT',
      entityId: subject.id,
      userId: req.user?.userId,
      details: `Updated subject ${subject.name} (${subject.code})`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

export const deleteSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.subject.delete({ where: { id } });

    await logAudit({
      action: 'DELETE_SUBJECT',
      entity: 'SUBJECT',
      entityId: id,
      userId: req.user?.userId,
      details: `Deleted subject ${id}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const assignFacultyToSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { facultyId } = req.body;

    const subject = await prisma.subject.update({
      where: { id },
      data: { facultyId: facultyId || null },
      include: {
        faculty: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    await logAudit({
      action: 'ASSIGN_FACULTY',
      entity: 'SUBJECT',
      entityId: subject.id,
      userId: req.user?.userId,
      details: `Assigned faculty ${facultyId || 'None'} to subject ${subject.code}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

// --- MODULES ---
export const getModules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) {
      throw new HttpError(400, 'subjectId query parameter is required');
    }

    const modules = await prisma.module.findMany({
      where: { subjectId: String(subjectId) },
      include: {
        resources: {
          where: req.user?.role === 'STUDENT' ? { isPublished: true } : {},
          include: {
            uploadedBy: { select: { id: true, name: true, role: true } },
          },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    res.status(200).json({ success: true, data: modules });
  } catch (error) {
    next(error);
  }
};

export const createModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, orderIndex, subjectId } = req.body;

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      throw new HttpError(404, 'Subject not found');
    }

    // Role validation: Faculty can ONLY create modules for their assigned subjects!
    if (req.user?.role === 'FACULTY') {
      if (subject.facultyId !== req.user.facultyProfileId) {
        throw new HttpError(403, 'Access denied: You can only create modules for your assigned subjects');
      }
    }

    const moduleItem = await prisma.module.create({
      data: {
        title,
        description,
        orderIndex: Number(orderIndex) || 1,
        subjectId,
      },
      include: {
        resources: true,
      },
    });

    await logAudit({
      action: 'CREATE_MODULE',
      entity: 'MODULE',
      entityId: moduleItem.id,
      userId: req.user?.userId,
      details: `Created module "${title}" for subject ${subject.code}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: moduleItem });
  } catch (error) {
    next(error);
  }
};

export const updateModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, orderIndex } = req.body;

    const moduleItem = await prisma.module.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!moduleItem) {
      throw new HttpError(404, 'Module not found');
    }

    // Role validation: Faculty can ONLY edit modules for their assigned subjects!
    if (req.user?.role === 'FACULTY') {
      if (moduleItem.subject.facultyId !== req.user.facultyProfileId) {
        throw new HttpError(403, 'Access denied: You can only modify modules for your assigned subjects');
      }
    }

    const updated = await prisma.module.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(orderIndex !== undefined ? { orderIndex: Number(orderIndex) } : {}),
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const moduleItem = await prisma.module.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!moduleItem) {
      throw new HttpError(404, 'Module not found');
    }

    // Role validation: Faculty can ONLY delete modules for their assigned subjects!
    if (req.user?.role === 'FACULTY') {
      if (moduleItem.subject.facultyId !== req.user.facultyProfileId) {
        throw new HttpError(403, 'Access denied: You can only delete modules for your assigned subjects');
      }
    }

    await prisma.module.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Module deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// --- ENROLLMENTS ---
export const getEnrollments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId, studentId, sectionId, departmentId, semesterId, status, search } = req.query;

    const whereClause: Record<string, unknown> = {};

    if (subjectId) whereClause.subjectId = String(subjectId);
    if (studentId) whereClause.studentId = String(studentId);
    if (sectionId) whereClause.sectionId = String(sectionId);
    if (status) whereClause.status = String(status);

    if (departmentId) {
      whereClause.subject = { ...(whereClause.subject as any || {}), departmentId: String(departmentId) };
    }

    if (semesterId) {
      whereClause.subject = { ...(whereClause.subject as any || {}), semesterId: String(semesterId) };
    }

    if (search) {
      const q = String(search).trim();
      whereClause.OR = [
        { student: { user: { name: { contains: q, mode: 'insensitive' } } } },
        { student: { user: { email: { contains: q, mode: 'insensitive' } } } },
        { student: { rollNumber: { contains: q, mode: 'insensitive' } } },
        { subject: { name: { contains: q, mode: 'insensitive' } } },
        { subject: { code: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const enrollments = await prisma.enrollment.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
            department: true,
            semester: true,
            section: true,
          },
        },
        subject: {
          include: {
            department: true,
            semester: true,
            faculty: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        section: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    res.status(200).json({ success: true, data: enrollments });
  } catch (error) {
    next(error);
  }
};

export const createEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, subjectId, sectionId, status = 'ACTIVE' } = req.body;

    if (!studentId || !subjectId) {
      throw new HttpError(400, 'studentId and subjectId are required');
    }

    // Resolve studentId: check if it's StudentProfile.id or User.id
    let studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!studentProfile) {
      studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: studentId },
        include: { user: true },
      });
    }

    if (!studentProfile) {
      throw new HttpError(404, 'Student profile not found. User must have a Student role.');
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) {
      throw new HttpError(404, 'Subject not found');
    }

    // Prevent duplicate enrollment
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_subjectId: {
          studentId: studentProfile.id,
          subjectId: subject.id,
        },
      },
    });

    if (existingEnrollment) {
      throw new HttpError(400, `Student is already enrolled in ${subject.code}`);
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: studentProfile.id,
        subjectId: subject.id,
        sectionId: sectionId || studentProfile.sectionId || null,
        status: status || 'ACTIVE',
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: true,
            semester: true,
            section: true,
          },
        },
        subject: {
          include: {
            department: true,
            semester: true,
          },
        },
        section: true,
      },
    });

    await logAudit({
      action: 'ENROLL_STUDENT',
      entity: 'ENROLLMENT',
      entityId: enrollment.id,
      userId: req.user?.userId,
      details: `Enrolled student ${studentProfile.user.name} (${studentProfile.rollNumber}) in subject ${subject.code}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully',
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, sectionId } = req.body;

    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(sectionId !== undefined ? { sectionId: sectionId || null } : {}),
      },
      include: {
        student: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        subject: true,
        section: true,
      },
    });

    await logAudit({
      action: 'UPDATE_ENROLLMENT',
      entity: 'ENROLLMENT',
      entityId: enrollment.id,
      userId: req.user?.userId,
      details: `Updated enrollment ${enrollment.id} status=${enrollment.status}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Enrollment updated successfully',
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        student: { include: { user: true } },
        subject: true,
      },
    });

    if (!enrollment) {
      throw new HttpError(404, 'Enrollment record not found');
    }

    await prisma.enrollment.delete({ where: { id } });

    await logAudit({
      action: 'REMOVE_ENROLLMENT',
      entity: 'ENROLLMENT',
      entityId: id,
      userId: req.user?.userId,
      details: `Cancelled enrollment of ${enrollment.student.user.name} in ${enrollment.subject.code}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Enrollment cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

