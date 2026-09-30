// src/controllers/analytics.controller.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { HttpError } from '../middleware/errorHandler';
import { Role } from '@prisma/client';

// ==========================================
// 1. STUDENT ANALYTICS (REAL DATABASE ONLY)
// ==========================================
export const getStudentAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthorized');

    let targetStudentProfileId = req.params.studentProfileId || (req.query.studentProfileId as string);

    // If student, can only view their own
    if (req.user.role === Role.STUDENT || req.user.role === Role.CR) {
      if (!req.user.studentProfileId) {
        throw new HttpError(403, 'No student profile linked to your account');
      }
      targetStudentProfileId = req.user.studentProfileId;
    } else if (!targetStudentProfileId) {
      // If admin/faculty didn't supply an id, find the first student with data
      const firstStudent = await prisma.studentProfile.findFirst({
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!firstStudent) {
        return res.status(200).json({
          success: true,
          data: null,
          message: 'No student profiles exist in the system yet.',
        });
      }
      targetStudentProfileId = firstStudent.id;
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: targetStudentProfileId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        department: true,
        semester: true,
        section: true,
      },
    });

    if (!student) {
      throw new HttpError(404, 'Student profile not found');
    }

    // 1. Enrolled Subjects
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'ACTIVE' },
      include: {
        subject: {
          include: {
            faculty: { include: { user: { select: { name: true, email: true } } } },
          },
        },
      },
    });

    const enrolledSubjectIds = enrollments.map((e) => e.subjectId);

    // 2. Assignment Completion
    const publishedAssignments = await prisma.assignment.findMany({
      where: {
        subjectId: { in: enrolledSubjectIds },
        isPublished: true,
      },
      include: {
        subject: { select: { id: true, code: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: student.id,
        assignmentId: { in: publishedAssignments.map((a) => a.id) },
      },
      include: {
        grade: true,
        assignment: { select: { id: true, title: true, totalMarks: true, dueDate: true } },
      },
    });

    const submissionMap = new Map<string, typeof submissions[0]>();
    submissions.forEach((s) => submissionMap.set(s.assignmentId, s));

    const totalAssigned = publishedAssignments.length;
    const totalSubmitted = submissions.length;
    const completionPercentage = totalAssigned > 0 ? Math.round((totalSubmitted / totalAssigned) * 100) : 0;

    const pendingAssignmentsList = publishedAssignments
      .filter((a) => !submissionMap.has(a.id))
      .map((a) => ({
        id: a.id,
        title: a.title,
        dueDate: a.dueDate,
        totalMarks: a.totalMarks,
        subjectCode: a.subject.code,
        subjectName: a.subject.name,
        isOverdue: new Date() > new Date(a.dueDate),
      }));

    const submittedAssignmentsList = submissions.map((s) => ({
      submissionId: s.id,
      assignmentId: s.assignmentId,
      title: s.assignment.title,
      totalMarks: s.assignment.totalMarks,
      marksObtained: s.grade ? s.grade.marksObtained : null,
      feedback: s.grade ? s.grade.feedback : null,
      status: s.status,
      submittedAt: s.submittedAt,
      isGraded: s.grade !== null,
    }));

    // 3. Quiz Performance
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { studentId: student.id },
      include: {
        quiz: {
          include: {
            subject: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    const totalQuizAttempts = quizAttempts.length;
    const quizScoresList = quizAttempts.map((qa) => {
      const percentage = qa.quiz.totalMarks > 0 ? Math.round((qa.score / qa.quiz.totalMarks) * 100) : 0;
      return {
        id: qa.id,
        quizId: qa.quizId,
        title: qa.quiz.title,
        subjectCode: qa.quiz.subject.code,
        subjectName: qa.quiz.subject.name,
        score: qa.score,
        totalMarks: qa.quiz.totalMarks,
        percentage,
        completedAt: qa.completedAt || qa.startedAt,
      };
    });

    const averageQuizScore =
      totalQuizAttempts > 0
        ? Math.round(quizScoresList.reduce((acc, q) => acc + q.percentage, 0) / totalQuizAttempts)
        : 0;

    // 4. Subject-Level Performance (Real scores only)
    const subjectPerformance = enrollments.map((enr) => {
      const subId = enr.subjectId;
      const subAssignments = publishedAssignments.filter((a) => a.subjectId === subId);
      const subSubmissions = submissions.filter((s) =>
        subAssignments.some((a) => a.id === s.assignmentId)
      );
      const graded = subSubmissions.filter((s) => s.grade !== null);
      const avgAssignmentScore =
        graded.length > 0
          ? Math.round(
              graded.reduce((acc, s) => acc + (s.grade!.marksObtained / s.assignment.totalMarks) * 100, 0) /
                graded.length
            )
          : null;

      const subQuizzes = quizScoresList.filter((q) => q.subjectCode === enr.subject.code);
      const avgQuizScore =
        subQuizzes.length > 0
          ? Math.round(subQuizzes.reduce((acc, q) => acc + q.percentage, 0) / subQuizzes.length)
          : null;

      const hasData = subAssignments.length > 0 || subQuizzes.length > 0;

      return {
        subjectId: enr.subject.id,
        subjectCode: enr.subject.code,
        subjectName: enr.subject.name,
        credits: enr.subject.credits,
        facultyName: enr.subject.faculty?.user?.name || 'Unassigned',
        assignedCount: subAssignments.length,
        submittedCount: subSubmissions.length,
        averageAssignmentScore: avgAssignmentScore,
        quizzesAttemptedCount: subQuizzes.length,
        averageQuizScore: avgQuizScore,
        hasData,
      };
    });

    // 5. Resource Usage Tracking Check
    // Per instructions: "If resource usage is not tracked, display: No resource usage data available. Do NOT invent usage numbers."
    const resourceAccessLogs = await prisma.auditLog.count({
      where: {
        userId: student.userId,
        entity: 'RESOURCE',
      },
    });

    const resourceUsage = {
      isTracked: resourceAccessLogs > 0,
      totalAccessEvents: resourceAccessLogs,
      message:
        resourceAccessLogs > 0
          ? `${resourceAccessLogs} resource access events recorded`
          : 'No resource usage data available',
    };

    // 6. Real Academic Activity (Recent submissions, quiz attempts, doubts)
    const [recentDoubts, auditEvents] = await Promise.all([
      prisma.doubt.findMany({
        where: { studentId: student.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { subject: { select: { code: true } } },
      }),
      prisma.auditLog.findMany({
        where: { userId: student.userId },
        take: 6,
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    const academicActivity: Array<{
      id: string;
      type: 'SUBMISSION' | 'QUIZ' | 'DOUBT' | 'SYSTEM';
      title: string;
      timestamp: Date;
      details?: string;
    }> = [];

    submissions.forEach((s) => {
      academicActivity.push({
        id: `sub-${s.id}`,
        type: 'SUBMISSION',
        title: `Submitted assignment: ${s.assignment.title}`,
        timestamp: s.submittedAt,
        details: s.grade ? `Graded: ${s.grade.marksObtained}/${s.assignment.totalMarks}` : 'Pending review',
      });
    });

    quizAttempts.forEach((qa) => {
      academicActivity.push({
        id: `quiz-${qa.id}`,
        type: 'QUIZ',
        title: `Completed quiz: ${qa.quiz.title}`,
        timestamp: qa.completedAt || qa.startedAt,
        details: `Score: ${qa.score}/${qa.quiz.totalMarks}`,
      });
    });

    recentDoubts.forEach((d) => {
      academicActivity.push({
        id: `doubt-${d.id}`,
        type: 'DOUBT',
        title: `Posted question in ${d.subject.code}: ${d.title}`,
        timestamp: d.createdAt,
        details: `Status: ${d.status}`,
      });
    });

    // Sort by timestamp desc
    academicActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student.id,
          userId: student.user.id,
          name: student.user.name,
          email: student.user.email,
          rollNumber: student.rollNumber,
          batchYear: student.batchYear,
          department: student.department?.name,
          semester: student.semester?.name,
          section: student.section?.name,
        },
        assignmentCompletion: {
          totalAssigned,
          totalSubmitted,
          completionPercentage,
          pendingCount: pendingAssignmentsList.length,
          pendingAssignments: pendingAssignmentsList,
          submittedAssignments: submittedAssignmentsList,
          hasData: totalAssigned > 0,
        },
        quizPerformance: {
          totalAttempts: totalQuizAttempts,
          averageScore: averageQuizScore,
          scores: quizScoresList,
          hasData: totalQuizAttempts > 0,
        },
        subjectPerformance,
        resourceUsage,
        academicActivity: academicActivity.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. FACULTY ANALYTICS (REAL DATABASE ONLY)
// ==========================================
export const getFacultyAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthorized');

    let targetFacultyProfileId = req.params.facultyProfileId || (req.query.facultyProfileId as string);

    // If faculty, can only view their own
    if (req.user.role === Role.FACULTY) {
      if (!req.user.facultyProfileId) {
        throw new HttpError(403, 'No faculty profile linked to your account');
      }
      targetFacultyProfileId = req.user.facultyProfileId;
    } else if (!targetFacultyProfileId) {
      // If admin didn't supply an id, find first faculty
      const firstFaculty = await prisma.facultyProfile.findFirst({
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!firstFaculty) {
        return res.status(200).json({
          success: true,
          data: null,
          message: 'No faculty profiles exist in the system yet.',
        });
      }
      targetFacultyProfileId = firstFaculty.id;
    }

    const faculty = await prisma.facultyProfile.findUnique({
      where: { id: targetFacultyProfileId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        department: true,
        subjects: {
          include: {
            enrollments: { where: { status: 'ACTIVE' } },
            department: true,
            semester: true,
          },
        },
      },
    });

    if (!faculty) {
      throw new HttpError(404, 'Faculty profile not found');
    }

    const facultySubjectIds = faculty.subjects.map((s) => s.id);

    // 1. Assignments created by faculty or for faculty's subjects
    const assignments = await prisma.assignment.findMany({
      where: {
        subjectId: { in: facultySubjectIds },
      },
      include: {
        subject: {
          select: {
            id: true,
            code: true,
            name: true,
            _count: { select: { enrollments: true } },
          },
        },
        submissions: {
          include: {
            grade: true,
            student: { include: { user: { select: { name: true, email: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalExpectedSubmissions = 0;
    let totalActualSubmissions = 0;
    let totalGradedSubmissions = 0;
    let totalPendingGrading = 0;

    const assignmentStats = assignments.map((a) => {
      const enrolledCount = a.subject._count.enrollments;
      const submissionCount = a.submissions.length;
      const gradedCount = a.submissions.filter((s) => s.grade !== null).length;
      const pendingCount = a.submissions.filter((s) => s.grade === null).length;
      const rate = enrolledCount > 0 ? Math.round((submissionCount / enrolledCount) * 100) : 0;

      totalExpectedSubmissions += enrolledCount;
      totalActualSubmissions += submissionCount;
      totalGradedSubmissions += gradedCount;
      totalPendingGrading += pendingCount;

      return {
        id: a.id,
        title: a.title,
        subjectCode: a.subject.code,
        subjectName: a.subject.name,
        dueDate: a.dueDate,
        totalMarks: a.totalMarks,
        enrolledCount,
        submissionCount,
        gradedCount,
        pendingCount,
        submissionRate: rate,
        isPublished: a.isPublished,
      };
    });

    const overallSubmissionRate =
      totalExpectedSubmissions > 0
        ? Math.round((totalActualSubmissions / totalExpectedSubmissions) * 100)
        : 0;

    const gradingProgressPercentage =
      totalActualSubmissions > 0
        ? Math.round((totalGradedSubmissions / totalActualSubmissions) * 100)
        : 0;

    // 2. Quizzes created by faculty or for faculty subjects
    const quizzes = await prisma.quiz.findMany({
      where: {
        subjectId: { in: facultySubjectIds },
      },
      include: {
        subject: { select: { code: true, name: true } },
        attempts: true,
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let allQuizScorePercentageSum = 0;
    let allQuizAttemptsCount = 0;

    const quizStats = quizzes.map((q) => {
      const attemptsCount = q.attempts.length;
      allQuizAttemptsCount += attemptsCount;

      const avgScore =
        attemptsCount > 0 && q.totalMarks > 0
          ? Math.round(
              (q.attempts.reduce((acc, att) => acc + att.score, 0) / (attemptsCount * q.totalMarks)) * 100
            )
          : null;

      if (avgScore !== null) {
        allQuizScorePercentageSum += avgScore * attemptsCount;
      }

      return {
        id: q.id,
        title: q.title,
        subjectCode: q.subject.code,
        subjectName: q.subject.name,
        totalMarks: q.totalMarks,
        questionsCount: q._count.questions,
        attemptsCount,
        averageScorePercentage: avgScore,
        isPublished: q.isPublished,
      };
    });

    const overallAverageQuizScore =
      allQuizAttemptsCount > 0
        ? Math.round(allQuizScorePercentageSum / allQuizAttemptsCount)
        : 0;

    // 3. Resource Publishing Activity (Actual uploaded resources)
    const resources = await prisma.resource.findMany({
      where: {
        uploadedById: faculty.userId,
      },
      include: {
        subject: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const resourcesByType: Record<string, number> = {};
    resources.forEach((r) => {
      resourcesByType[r.fileType] = (resourcesByType[r.fileType] || 0) + 1;
    });

    // 4. Real Faculty Activity
    const [recentGradesGiven, recentDoubtsResolved] = await Promise.all([
      prisma.grade.findMany({
        where: { gradedById: faculty.userId },
        take: 6,
        orderBy: { gradedAt: 'desc' },
        include: {
          submission: {
            include: {
              assignment: { select: { title: true } },
              student: { include: { user: { select: { name: true } } } },
            },
          },
        },
      }),
      prisma.doubt.findMany({
        where: { facultyId: faculty.id },
        take: 6,
        orderBy: { updatedAt: 'desc' },
        include: { subject: { select: { code: true } } },
      }),
    ]);

    const facultyActivity: Array<{
      id: string;
      type: 'GRADE' | 'ASSIGNMENT' | 'RESOURCE' | 'QUIZ' | 'DOUBT';
      title: string;
      timestamp: Date;
    }> = [];

    recentGradesGiven.forEach((g) => {
      facultyActivity.push({
        id: `grade-${g.id}`,
        type: 'GRADE',
        title: `Graded ${g.submission.student.user.name}'s "${g.submission.assignment.title}" (${g.marksObtained} pts)`,
        timestamp: g.gradedAt,
      });
    });

    resources.slice(0, 5).forEach((r) => {
      facultyActivity.push({
        id: `res-${r.id}`,
        type: 'RESOURCE',
        title: `Published resource "${r.title}" for ${r.subject.code}`,
        timestamp: r.createdAt,
      });
    });

    quizzes.slice(0, 4).forEach((q) => {
      facultyActivity.push({
        id: `quiz-${q.id}`,
        type: 'QUIZ',
        title: `Created quiz "${q.title}" for ${q.subject.code}`,
        timestamp: q.createdAt,
      });
    });

    facultyActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
      success: true,
      data: {
        faculty: {
          id: faculty.id,
          userId: faculty.user.id,
          name: faculty.user.name,
          email: faculty.user.email,
          employeeId: faculty.employeeId,
          designation: faculty.designation,
          department: faculty.department?.name || 'Academic Department',
          subjectsCount: faculty.subjects.length,
          subjects: faculty.subjects.map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            enrolledStudents: s.enrollments ? s.enrollments.length : 0,
          })),
        },
        assignmentSubmissionStats: {
          totalAssignments: assignments.length,
          totalExpectedSubmissions,
          totalActualSubmissions,
          overallSubmissionRate,
          assignments: assignmentStats,
          hasData: assignments.length > 0,
        },
        gradingProgress: {
          totalSubmissions: totalActualSubmissions,
          gradedSubmissions: totalGradedSubmissions,
          pendingGrading: totalPendingGrading,
          progressPercentage: gradingProgressPercentage,
          hasData: totalActualSubmissions > 0,
        },
        quizPerformance: {
          totalQuizzes: quizzes.length,
          totalAttempts: allQuizAttemptsCount,
          overallAverageScore: overallAverageQuizScore,
          quizzes: quizStats,
          hasData: quizzes.length > 0,
        },
        resourcePublishing: {
          totalPublished: resources.length,
          byType: resourcesByType,
          recentResources: resources.slice(0, 6).map((r) => ({
            id: r.id,
            title: r.title,
            fileType: r.fileType,
            subjectCode: r.subject.code,
            createdAt: r.createdAt,
          })),
          hasData: resources.length > 0,
        },
        facultyActivity: facultyActivity.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. INSTITUTIONAL ANALYTICS OVERVIEW (ADMIN)
// ==========================================
export const getInstitutionalOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthorized');

    const [
      students,
      faculties,
      departments,
      subjects,
      assignmentsCount,
      submissionsCount,
      gradedSubmissionsCount,
      quizzesCount,
      quizAttemptsCount,
      resourcesCount,
    ] = await Promise.all([
      prisma.studentProfile.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          department: { select: { name: true, code: true } },
          semester: { select: { number: true, name: true } },
        },
        take: 30,
        orderBy: { rollNumber: 'asc' },
      }),
      prisma.facultyProfile.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          department: { select: { name: true, code: true } },
        },
        take: 30,
        orderBy: { employeeId: 'asc' },
      }),
      prisma.department.findMany({
        include: {
          _count: { select: { students: true, faculties: true, subjects: true } },
        },
      }),
      prisma.subject.findMany({
        include: {
          department: true,
          semester: true,
          _count: { select: { enrollments: true, assignments: true, quizzes: true } },
        },
      }),
      prisma.assignment.count(),
      prisma.assignmentSubmission.count(),
      prisma.assignmentSubmission.count({ where: { status: 'GRADED' } }),
      prisma.quiz.count(),
      prisma.quizAttempt.count(),
      prisma.resource.count(),
    ]);

    const gradingRate = submissionsCount > 0 ? Math.round((gradedSubmissionsCount / submissionsCount) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalStudents: students.length,
          totalFaculty: faculties.length,
          totalDepartments: departments.length,
          totalSubjects: subjects.length,
          totalAssignments: assignmentsCount,
          totalSubmissions: submissionsCount,
          gradedSubmissions: gradedSubmissionsCount,
          pendingGrading: Math.max(0, submissionsCount - gradedSubmissionsCount),
          gradingRate,
          totalQuizzes: quizzesCount,
          totalQuizAttempts: quizAttemptsCount,
          totalResources: resourcesCount,
        },
        departments: departments.map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          studentsCount: d._count.students,
          facultyCount: d._count.faculties,
          subjectsCount: d._count.subjects,
        })),
        studentsList: students.map((s) => ({
          profileId: s.id,
          name: s.user.name,
          email: s.user.email,
          rollNumber: s.rollNumber,
          department: s.department.code,
          semester: s.semester.name,
        })),
        facultyList: faculties.map((f) => ({
          profileId: f.id,
          name: f.user.name,
          email: f.user.email,
          employeeId: f.employeeId,
          designation: f.designation,
          department: f.department.code,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
