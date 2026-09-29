// src/routes/assignment.routes.ts
import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAssignments,
  getAssignmentById,
  createAssignment,
  submitAssignment,
  gradeSubmission,
} from '../controllers/assignment.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';
import { validateRequest } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getAssignments);
router.get('/:id', getAssignmentById);

// Create Assignment (Faculty & Admin)
router.post(
  '/',
  authorizeRoles(Role.ADMIN, Role.FACULTY),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('dueDate').isISO8601().withMessage('Valid ISO dueDate is required'),
    body('subjectId').notEmpty().withMessage('Subject ID is required'),
  ],
  validateRequest,
  createAssignment
);

// Submit Assignment (Student & CR)
router.post(
  '/:id/submit',
  authorizeRoles(Role.STUDENT, Role.CR),
  [body('content').optional(), body('fileUrl').optional()],
  submitAssignment
);

// Grade Submission (Faculty & Admin)
router.post(
  '/submissions/:submissionId/grade',
  authorizeRoles(Role.ADMIN, Role.FACULTY),
  [
    body('marksObtained').isNumeric().withMessage('Marks obtained must be numeric'),
    body('feedback').optional(),
  ],
  validateRequest,
  gradeSubmission
);

export default router;
