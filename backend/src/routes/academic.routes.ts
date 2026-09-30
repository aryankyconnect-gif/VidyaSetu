// src/routes/academic.routes.ts
import { Router } from 'express';
import { body } from 'express-validator';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  assignFacultyToSubject,
  getModules,
  createModule,
  updateModule,
  deleteModule,
  getEnrollments,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
} from '../controllers/academic.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';
import { validateRequest } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// --- Departments ---
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
router.patch('/departments/:id', authorizeRoles(Role.ADMIN), updateDepartment);
router.delete('/departments/:id', authorizeRoles(Role.ADMIN), deleteDepartment);

// --- Semesters ---
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
router.patch('/semesters/:id', authorizeRoles(Role.ADMIN), updateSemester);
router.delete('/semesters/:id', authorizeRoles(Role.ADMIN), deleteSemester);

// --- Sections ---
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
router.patch('/sections/:id', authorizeRoles(Role.ADMIN), updateSection);
router.delete('/sections/:id', authorizeRoles(Role.ADMIN), deleteSection);

// --- Subjects ---
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
router.patch('/subjects/:id', authorizeRoles(Role.ADMIN), updateSubject);
router.delete('/subjects/:id', authorizeRoles(Role.ADMIN), deleteSubject);
router.patch('/subjects/:id/assign-faculty', authorizeRoles(Role.ADMIN), assignFacultyToSubject);

// --- Modules ---
router.get('/modules', getModules);
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
router.patch('/modules/:id', authorizeRoles(Role.ADMIN, Role.FACULTY), updateModule);
router.delete('/modules/:id', authorizeRoles(Role.ADMIN, Role.FACULTY), deleteModule);

// --- Enrollments (Admin / Faculty / CR) ---
router.get('/enrollments', authorizeRoles(Role.ADMIN, Role.FACULTY, Role.CR), getEnrollments);
router.post(
  '/enrollments',
  authorizeRoles(Role.ADMIN),
  [
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('subjectId').notEmpty().withMessage('Subject ID is required'),
  ],
  validateRequest,
  createEnrollment
);
router.patch('/enrollments/:id', authorizeRoles(Role.ADMIN), updateEnrollment);
router.delete('/enrollments/:id', authorizeRoles(Role.ADMIN), deleteEnrollment);

export default router;
