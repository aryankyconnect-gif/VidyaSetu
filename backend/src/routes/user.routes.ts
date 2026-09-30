// src/routes/user.routes.ts
import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
  toggleUserStatus,
  updateProfile,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Admin-only user management
router.get('/', authorizeRoles(Role.ADMIN), getUsers);
router.post('/', authorizeRoles(Role.ADMIN), createUser);
router.get('/:id', getUserById);
router.patch('/:id', authorizeRoles(Role.ADMIN), updateUser);
router.patch('/:id/status', authorizeRoles(Role.ADMIN), toggleUserStatus);
router.post('/:id/reset-password', authorizeRoles(Role.ADMIN), resetUserPassword);

// Self profile update
router.patch('/me/profile', updateProfile);

export default router;

