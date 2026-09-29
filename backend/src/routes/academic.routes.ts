// src/routes/academic.routes.ts
import { Router } from 'express';
import { body } from 'express-validator';
import {
  getDepartments,
  createDepartment,
  getSemesters,
  createSemester,
  getSections,
  createSection,
  getSubjects,
  getSubjectById,
  createSubject,
  createModule,
} from '../controllers/academic.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';
import { validateRequest } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Departments
router.get('/departments', getDepartments);
router.post(
  '/departments',
  authorizeRoles(Role.ADMIN),
  [
    body('name').notEmpty().withMessage('Department name is required'),
    body('code').notEmpty().withMessage('Department code is required'),
  ],
  validateRequest,
  createDepartment
);

// Semesters
router.get('/semesters', getSemesters);
router.post(
  '/semesters',
  authorizeRoles(Role.ADMIN),
  [
    body('number').isNumeric().withMessage('Semester number is required'),
    body('name').notEmpty().withMessage('Semester name is required'),
  ],
  validateRequest,
  createSemester
);

// Sections
router.get('/sections', getSections);
router.post(
  '/sections',
  authorizeRoles(Role.ADMIN),
  [
    body('name').notEmpty().withMessage('Section name is required'),
    body('departmentId').notEmpty().withMessage('Department is required'),
    body('semesterId').notEmpty().withMessage('Semester is required'),
  ],
  validateRequest,
  createSection
);

// Subjects
router.get('/subjects', getSubjects);
router.get('/subjects/:id', getSubjectById);
router.post(
  '/subjects',
  authorizeRoles(Role.ADMIN),
  [
    body('name').notEmpty().withMessage('Subject name is required'),
    body('code').notEmpty().withMessage('Subject code is required'),
    body('departmentId').notEmpty().withMessage('Department is required'),
    body('semesterId').notEmpty().withMessage('Semester is required'),
  ],
  validateRequest,
  createSubject
);

// Modules
router.post(
  '/modules',
  authorizeRoles(Role.ADMIN, Role.FACULTY),
  [
    body('title').notEmpty().withMessage('Module title is required'),
    body('subjectId').notEmpty().withMessage('Subject ID is required'),
  ],
  validateRequest,
  createModule
);

export default router;
