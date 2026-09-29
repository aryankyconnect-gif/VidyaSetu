// src/routes/user.routes.ts
import { Router } from 'express';
import { getUsers, getUserById, toggleUserStatus, updateProfile } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Admin-only user list & status toggle
router.get('/', authorizeRoles(Role.ADMIN), getUsers);
router.get('/:id', getUserById);
router.patch('/:id/status', authorizeRoles(Role.ADMIN), toggleUserStatus);

// Self profile update
router.patch('/me/profile', updateProfile);

export default router;
