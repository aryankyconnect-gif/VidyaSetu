// src/routes/doubt.routes.ts
import { Router } from 'express';
import { body } from 'express-validator';
import {
  getDoubts,
  getDoubtById,
  createDoubt,
  addMessage,
  updateDoubtStatus,
  getDoubtStats,
} from '../controllers/doubt.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

// All doubt routes require authentication
router.use(authenticate);

// Doubt statistics (for counts & dashboard metrics)
router.get('/stats', getDoubtStats);

// List doubts with filters (subjectId, status, search, tab)
router.get('/', getDoubts);

// Get single doubt with full messages and attachments
router.get('/:id', getDoubtById);

// Create / Post a new doubt
router.post(
  '/',
  [
    body('subjectId').notEmpty().withMessage('Subject is required'),
    body('topic').notEmpty().trim().withMessage('Topic is required'),
    body('title').notEmpty().trim().withMessage('Doubt title is required'),
    body('description').notEmpty().trim().withMessage('Detailed description is required'),
  ],
  validateRequest,
  createDoubt
);

// Post a message in the doubt thread
router.post(
  '/:id/messages',
  [body('content').notEmpty().trim().withMessage('Message content cannot be empty')],
  validateRequest,
  addMessage
);

// Update doubt status (OPEN, IN_DISCUSSION, ANSWERED, RESOLVED)
router.patch(
  '/:id/status',
  [
    body('status')
      .notEmpty()
      .isIn(['OPEN', 'IN_DISCUSSION', 'ANSWERED', 'RESOLVED'])
      .withMessage('Valid status (OPEN, IN_DISCUSSION, ANSWERED, RESOLVED) is required'),
  ],
  validateRequest,
  updateDoubtStatus
);

export default router;
