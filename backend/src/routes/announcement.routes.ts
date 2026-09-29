// src/routes/announcement.routes.ts
import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcement.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';
import { validateRequest } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getAnnouncements);

// Create announcement: Admin, Faculty, and CR
router.post(
  '/',
  authorizeRoles(Role.ADMIN, Role.FACULTY, Role.CR),
  [
    body('title').notEmpty().withMessage('Notice title is required'),
    body('content').notEmpty().withMessage('Notice content is required'),
  ],
  validateRequest,
  createAnnouncement
);

router.delete('/:id', authorizeRoles(Role.ADMIN, Role.FACULTY, Role.CR), deleteAnnouncement);

export default router;
