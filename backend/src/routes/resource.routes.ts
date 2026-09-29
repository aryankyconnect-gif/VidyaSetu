// src/routes/resource.routes.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { getResources, createResource, deleteResource } from '../controllers/resource.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';
import { validateRequest } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getResources);

router.post(
  '/',
  authorizeRoles(Role.ADMIN, Role.FACULTY),
  [
    body('title').notEmpty().withMessage('Resource title is required'),
    body('fileUrl').notEmpty().withMessage('Valid file URL or resource link is required'),
    body('subjectId').notEmpty().withMessage('Subject is required'),
  ],
  validateRequest,
  createResource
);

router.delete('/:id', authorizeRoles(Role.ADMIN, Role.FACULTY), deleteResource);

export default router;
