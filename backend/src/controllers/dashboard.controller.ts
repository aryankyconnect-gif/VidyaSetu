// src/controllers/dashboard.controller.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { HttpError } from '../middleware/errorHandler';
import { Role } from '@prisma/client';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthorized');

    const role = req.user.role;

    // --- ADMIN STATS ---
    if (role === Role.ADMIN) {
      const [
        totalUsers,
        totalStudents,
        totalFaculty,
        totalCRs,
        totalDepartments,
        totalSubjects,
        totalResources,
        totalAssignments,
        totalSubmissions,
        totalQuizzes,
        totalEnrollments,
        recentAuditLogs,
        departments,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: Role.STUDENT } }),
        prisma.user.count({ where: { role: Role.FACULTY } }),
        prisma.user.count({ where: { role: Role.CR } }),
        prisma.department.count(),
        prisma.subject.count(),
        prisma.resource.count(),
        prisma.assignment.count(),
        prisma.assignmentSubmission.count(),
        prisma.quiz.count(),
        prisma.enrollment.count(),
        prisma.auditLog.findMany({
          take: 8,
          orderBy: { timestamp: 'desc' },
          include: {
            user: { select: { id: true, name: true, role: true, email: true } },
          },
        }),
        prisma.department.findMany({
          include: {
            _count: {
              select: { students: true, faculties: true, subjects: true },
            },
          },
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          role,
          metrics: {
            totalUsers,
            totalStudents,
            totalFaculty,
            totalCRs,
            totalDepartments,
            totalSubjects,
            totalResources,
            totalAssignments,
            totalSubmissions,
            totalQuizzes,
            totalEnrollments,
          },
          recentAuditLogs,
          departments,
        },
      });
    }

    // --- FACULTY STATS ---
    if (role === Role.FACULTY) {
      const facultyProfileId = req.user.facultyProfileId;

      const [assignedSubjects, recentSubmissions, recentAnnouncements] = await Promise.all([
        prisma.subject.findMany({
          where: facultyProfileId ? { facultyId: facultyProfileId } : {},
          include: {
            _count: {
              select: { enrollments: true, assignments: true, quizzes: true, resources: true },
            },
            department: true,
            semester: true,
          },
        }),
        prisma.assignmentSubmission.findMany({
          where: {
            assignment: facultyProfileId
              ? { subject: { facultyId: facultyProfileId } }
              : {},
          },
          take: 6,
          orderBy: { submittedAt: 'desc' },
          include: {
            assignment: { select: { id: true, title: true, totalMarks: true } },
            student: {
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            },
            grade: true,
          },
        }),
        prisma.announcement.findMany({
          take: 4,
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { name: true, role: true } } },
        }),
      ]);

      const totalStudentsTaught = assignedSubjects.reduce(
        (sum, s) => sum + s._count.enrollments,
        0
      );

      const pendingGradingCount = await prisma.assignmentSubmission.count({
        where: {
          status: 'SUBMITTED',
          assignment: facultyProfileId
            ? { subject: { facultyId: facultyProfileId } }
            : {},
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          role,
          metrics: {
            assignedSubjectsCount: assignedSubjects.length,
            totalStudentsTaught,
            pendingGradingCount,
          },
          assignedSubjects,
          recentSubmissions,
          recentAnnouncements,
        },
      });
    }

    // --- CR STATS ---
    if (role === Role.CR) {
      const sectionId = req.user.sectionId;

      const [section, peerStudents, activeAnnouncements, sectionSubjects] = await Promise.all([
        sectionId
          ? prisma.section.findUnique({
              where: { id: sectionId },
              include: { department: true, semester: true },
            })
          : null,
        sectionId
          ? prisma.studentProfile.findMany({
              where: { sectionId },
              include: {
                user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
              },
              orderBy: { rollNumber: 'asc' },
            })
          : [],
        prisma.announcement.findMany({
          where: {
            OR: [
              { targetRole: null },
              { targetRole: Role.CR },
              { targetRole: Role.STUDENT },
              ...(sectionId ? [{ sectionId }] : []),
            ],
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { name: true, role: true } } },
        }),
        req.user.studentProfileId
          ? prisma.subject.findMany({
              where: {
                enrollments: { some: { studentId: req.user.studentProfileId } },
              },
              include: {
                faculty: {
                  include: { user: { select: { name: true, email: true } } },
                },
                _count: { select: { resources: true, assignments: true } },
              },
            })
          : [],
      ]);

      return res.status(200).json({
        success: true,
        data: {
          role,
          section,
          metrics: {
            peersCount: peerStudents.length,
            enrolledSubjectsCount: sectionSubjects.length,
            announcementsCount: activeAnnouncements.length,
          },
          peerStudents,
          activeAnnouncements,
          sectionSubjects,
        },
      });
    }

    // --- STUDENT STATS ---
    if (role === Role.STUDENT) {
      const studentProfileId = req.user.studentProfileId;

      const [enrolledSubjects, assignments, recentGrades, upcomingQuizzes, announcements] =
        await Promise.all([
          studentProfileId
            ? prisma.subject.findMany({
                where: {
                  enrollments: { some: { studentId: studentProfileId } },
                },
                include: {
                  faculty: {
                    include: { user: { select: { name: true, email: true } } },
                  },
                  _count: { select: { modules: true, resources: true, assignments: true } },
                },
              })
            : [],
          studentProfileId
            ? prisma.assignment.findMany({
                where: {
                  subject: {
                    enrollments: { some: { studentId: studentProfileId } },
                  },
                },
                include: {
                  subject: { select: { code: true, name: true } },
                  submissions: {
                    where: { studentId: studentProfileId },
                    include: { grade: true },
                  },
                },
                orderBy: { dueDate: 'asc' },
                take: 6,
              })
            : [],
          studentProfileId
            ? prisma.grade.findMany({
                where: {
                  submission: { studentId: studentProfileId },
                },
                include: {
                  submission: {
                    include: {
                      assignment: { select: { title: true, totalMarks: true } },
                    },
                  },
                  gradedBy: { select: { name: true } },
                },
                take: 5,
                orderBy: { gradedAt: 'desc' },
              })
            : [],
          studentProfileId
            ? prisma.quiz.findMany({
                where: {
                  isPublished: true,
                  subject: {
                    enrollments: { some: { studentId: studentProfileId } },
                  },
                },
                include: {
                  subject: { select: { code: true } },
                  attempts: {
                    where: { studentId: studentProfileId },
                  },
                },
                take: 4,
              })
            : [],
          prisma.announcement.findMany({
            where: {
              OR: [{ targetRole: null }, { targetRole: Role.STUDENT }],
            },
            take: 4,
            orderBy: { createdAt: 'desc' },
            include: { author: { select: { name: true, role: true } } },
          }),
        ]);

      const totalCredits = enrolledSubjects.reduce((sum, s) => sum + s.credits, 0);
      const pendingAssignmentsCount = assignments.filter((a) => a.submissions.length === 0).length;

      return res.status(200).json({
        success: true,
        data: {
          role,
          metrics: {
            enrolledSubjectsCount: enrolledSubjects.length,
            totalCredits,
            pendingAssignmentsCount,
            completedQuizzesCount: upcomingQuizzes.filter((q) => q.attempts.length > 0).length,
          },
          enrolledSubjects,
          assignments,
          recentGrades,
          upcomingQuizzes,
          announcements,
        },
      });
    }

    res.status(200).json({ success: true, data: { role } });
  } catch (error) {
    next(error);
  }
};
