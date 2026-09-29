// src/controllers/quiz.controller.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { HttpError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit.service';
import { QuestionType } from '@prisma/client';

export const getQuizzes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId } = req.query;

    let whereClause: Record<string, unknown> = {};
    if (subjectId) {
      whereClause.subjectId = String(subjectId);
    }

    if (req.user?.role === 'STUDENT' || req.user?.role === 'CR') {
      whereClause.isPublished = true;
      if (req.user.studentProfileId) {
        whereClause.subject = {
          enrollments: {
            some: { studentId: req.user.studentProfileId },
          },
        };
      }
    }

    const quizzes = await prisma.quiz.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        _count: {
          select: { questions: true, attempts: true },
        },
        attempts: req.user?.studentProfileId
          ? {
              where: { studentId: req.user.studentProfileId },
            }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: quizzes });
  } catch (error) {
    next(error);
  }
};

export const getQuizById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        questions: {
          orderBy: { orderIndex: 'asc' },
        },
        attempts: {
          include: {
            student: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new HttpError(404, 'Quiz not found');
    }

    // If user is student, check if they already attempted
    const isStudent = req.user?.role === 'STUDENT' || req.user?.role === 'CR';
    let studentAttempt = null;

    if (isStudent && req.user?.studentProfileId) {
      studentAttempt = quiz.attempts.find((a) => a.studentId === req.user?.studentProfileId);
    }

    // Mask correct answers for students who haven't finished yet
    const sanitizedQuestions = quiz.questions.map((q) => {
      let parsedOptions = [];
      try {
        parsedOptions = JSON.parse(q.optionsJson);
      } catch {
        parsedOptions = [];
      }

      if (isStudent && !studentAttempt) {
        // Hide correct answer
        return {
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: parsedOptions,
          marks: q.marks,
          orderIndex: q.orderIndex,
        };
      }

      // Faculty or already attempted student sees correct answers
      return {
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: parsedOptions,
        correctAnswer: q.correctAnswer,
        marks: q.marks,
        orderIndex: q.orderIndex,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        ...quiz,
        questions: sanitizedQuestions,
        myAttempt: studentAttempt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, timeLimitMinutes, totalMarks, subjectId, isPublished, dueDate, questions } = req.body;

    if (!req.user) {
      throw new HttpError(401, 'Unauthorized');
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        timeLimitMinutes: Number(timeLimitMinutes) || 30,
        totalMarks: Number(totalMarks) || 50,
        subjectId,
        isPublished: Boolean(isPublished),
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: req.user.userId,
      },
    });

    if (Array.isArray(questions) && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await prisma.question.create({
          data: {
            quizId: quiz.id,
            questionText: q.questionText,
            questionType: q.questionType || QuestionType.MULTIPLE_CHOICE,
            optionsJson: JSON.stringify(q.options || []),
            correctAnswer: String(q.correctAnswer),
            marks: Number(q.marks) || 5,
            orderIndex: i + 1,
          },
        });
      }
    }

    await logAudit({
      action: 'CREATE_QUIZ',
      entity: 'QUIZ',
      entityId: quiz.id,
      userId: req.user.userId,
      details: `Created quiz "${title}"`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};

export const submitQuizAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // quizId
    const { answers } = req.body; // map of questionId -> studentAnswer

    if (!req.user?.studentProfileId) {
      throw new HttpError(403, 'Only students can take quizzes');
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: true },
    });

    if (!quiz) {
      throw new HttpError(404, 'Quiz not found');
    }

    // Check if already attempted
    const existing = await prisma.quizAttempt.findUnique({
      where: {
        quizId_studentId: {
          quizId: id,
          studentId: req.user.studentProfileId,
        },
      },
    });

    if (existing) {
      throw new HttpError(400, 'You have already submitted an attempt for this quiz.');
    }

    // Score calculation
    let calculatedScore = 0;
    quiz.questions.forEach((q) => {
      const studentAns = answers ? answers[q.id] : undefined;
      if (studentAns !== undefined && String(studentAns).trim() === String(q.correctAnswer).trim()) {
        calculatedScore += q.marks;
      }
    });

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: id,
        studentId: req.user.studentProfileId,
        score: calculatedScore,
        answersJson: JSON.stringify(answers || {}),
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        quiz: { select: { id: true, title: true, totalMarks: true } },
      },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: req.user.userId,
        title: 'Quiz Completed',
        message: `You scored ${calculatedScore}/${quiz.totalMarks} in "${quiz.title}".`,
        link: `/app/quizzes/${quiz.id}`,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Quiz attempt recorded successfully',
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
};
