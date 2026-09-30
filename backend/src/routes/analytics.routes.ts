// src/routes/analytics.routes.ts
import { Router } from 'express';
import {
  getStudentAnalytics,
  getFacultyAnalytics,
  getInstitutionalOverview,
} from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Student analytics: Student can see their own, Admin and Faculty can see any student's
router.get(
  '/student/:studentProfileId?',
  authorizeRoles(Role.ADMIN, Role.FACULTY, Role.STUDENT, Role.CR),
  getStudentAnalytics
);

// Faculty analytics: Faculty can see their own, Admin can see any faculty's
router.get(
  '/faculty/:facultyProfileId?',
  authorizeRoles(Role.ADMIN, Role.FACULTY),
  getFacultyAnalytics
);

// Institutional overview: Admin only
router.get(
  '/overview',
  authorizeRoles(Role.ADMIN),
  getInstitutionalOverview
);

export default router;
