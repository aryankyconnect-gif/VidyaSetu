// src/routes/auth.routes.ts
import { Router } from 'express';
import { body } from 'express-validator';
import {
  login,
  getMe,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  registerUser,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';
import { validateRequest } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  login
);

router.get('/me', authenticate, getMe);

router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validateRequest,
  refresh
);

router.post('/logout', logout);

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  validateRequest,
  forgotPassword
);

router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('token').notEmpty().withMessage('Reset token is required'),
  ],
  validateRequest,
  resetPassword
);

// Admin-only user registration
router.post(
  '/register-user',
  authenticate,
  authorizeRoles(Role.ADMIN),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('name').notEmpty().withMessage('Full name is required'),
    body('role').isIn(Object.values(Role)).withMessage('Valid role is required'),
  ],
  validateRequest,
  registerUser
);

export default router;
