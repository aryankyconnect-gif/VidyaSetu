// src/routes/quiz.routes.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { getQuizzes, getQuizById, createQuiz, submitQuizAttempt } from '../controllers/quiz.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';
import { validateRequest } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getQuizzes);
router.get('/:id', getQuizById);

// Create Quiz (Faculty & Admin)
router.post(
  '/',
  authorizeRoles(Role.ADMIN, Role.FACULTY),
  [
    body('title').notEmpty().withMessage('Quiz title is required'),
    body('subjectId').notEmpty().withMessage('Subject ID is required'),
  ],
  validateRequest,
  createQuiz
);

// Submit Quiz Attempt (Student & CR)
router.post('/:id/attempt', authorizeRoles(Role.STUDENT, Role.CR), submitQuizAttempt);

export default router;
