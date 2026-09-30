// src/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { HttpError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit.service';
import { Role } from '@prisma/client';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, search, departmentId } = req.query;

    const whereClause: Record<string, unknown> = {};

    if (role && Object.values(Role).includes(role as Role)) {
      whereClause.role = role as Role;
    }

    if (search) {
      const q = String(search).trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { studentProfile: { rollNumber: { contains: q, mode: 'insensitive' } } },
        { facultyProfile: { employeeId: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (departmentId) {
      whereClause.OR = [
        { studentProfile: { departmentId: String(departmentId) } },
        { facultyProfile: { departmentId: String(departmentId) } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        studentProfile: {
          include: { department: true, semester: true, section: true },
        },
        facultyProfile: {
          include: { department: true },
        },
        crProfile: {
          include: { section: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: {
          include: { department: true, semester: true, section: true },
        },
        facultyProfile: {
          include: { department: true, subjects: true },
        },
        crProfile: {
          include: { section: true },
        },
      },
    });

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    res.status(200).json({ success: true, data: safeUser });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      email,
      password,
      role = Role.STUDENT,
      phone,
      avatarUrl,
      // Student & CR fields
      rollNumber,
      batchYear,
      departmentId,
      semesterId,
      sectionId,
      // CR specific
      term,
      // Faculty fields
      employeeId,
      designation,
    } = req.body;

    if (!name || !email || !password) {
      throw new HttpError(400, 'Name, email, and password are required');
    }

    if (password.length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new HttpError(400, 'A user with this email address already exists');
    }

    // Role specific validations
    if (role === Role.STUDENT || role === Role.CR) {
      if (!rollNumber) {
        throw new HttpError(400, 'Roll number is required for students and CRs');
      }
      if (!departmentId || !semesterId) {
        throw new HttpError(400, 'Department and semester are required for students');
      }
      const existingRoll = await prisma.studentProfile.findUnique({
        where: { rollNumber: rollNumber.trim().toUpperCase() },
      });
      if (existingRoll) {
        throw new HttpError(400, `Roll number "${rollNumber}" is already registered`);
      }
    }

    if (role === Role.FACULTY) {
      if (!employeeId) {
        throw new HttpError(400, 'Employee ID is required for faculty members');
      }
      if (!departmentId) {
        throw new HttpError(400, 'Department is required for faculty members');
      }
      const existingEmp = await prisma.facultyProfile.findUnique({
        where: { employeeId: employeeId.trim().toUpperCase() },
      });
      if (existingEmp) {
        throw new HttpError(400, `Employee ID "${employeeId}" is already registered`);
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          role: role as Role,
          phone: phone?.trim() || null,
          avatarUrl: avatarUrl?.trim() || null,
          isActive: true,
        },
      });

      if (role === Role.STUDENT || role === Role.CR) {
        const studentProfile = await tx.studentProfile.create({
          data: {
            userId: createdUser.id,
            rollNumber: rollNumber.trim().toUpperCase(),
            batchYear: Number(batchYear) || new Date().getFullYear(),
            departmentId,
            semesterId,
            sectionId: sectionId || null,
          },
        });

        if (role === Role.CR) {
          if (!sectionId) {
            throw new HttpError(400, 'Section is required for Class Representatives (CR)');
          }
          await tx.cRProfile.create({
            data: {
              userId: createdUser.id,
              studentProfileId: studentProfile.id,
              sectionId,
              term: term?.trim() || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            },
          });
        }
      } else if (role === Role.FACULTY) {
        await tx.facultyProfile.create({
          data: {
            userId: createdUser.id,
            employeeId: employeeId.trim().toUpperCase(),
            designation: designation?.trim() || 'Assistant Professor',
            departmentId,
          },
        });
      }

      return createdUser;
    });

    const safeCreatedUser = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: {
        studentProfile: { include: { department: true, semester: true, section: true } },
        facultyProfile: { include: { department: true } },
        crProfile: { include: { section: true } },
      },
    });

    await logAudit({
      action: 'CREATE_USER',
      entity: 'USER',
      entityId: newUser.id,
      userId: req.user?.userId,
      details: `Created new user ${newUser.name} (${newUser.email}) with role ${role}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `User created successfully as ${role}`,
      data: safeCreatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      avatarUrl,
      role,
      isActive,
      // Profile fields
      rollNumber,
      batchYear,
      departmentId,
      semesterId,
      sectionId,
      term,
      employeeId,
      designation,
    } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true, facultyProfile: true, crProfile: true },
    });

    if (!existingUser) {
      throw new HttpError(404, 'User not found');
    }

    if (email && email.toLowerCase().trim() !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (emailConflict) {
        throw new HttpError(400, 'Another user with this email address already exists');
      }
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const targetRole = (role || existingUser.role) as Role;

      // 1. Update Core User Details
      await tx.user.update({
        where: { id },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(email ? { email: email.toLowerCase().trim() } : {}),
          ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl ? avatarUrl.trim() : null } : {}),
          ...(role ? { role: targetRole } : {}),
          ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        },
      });

      // 2. Handle Profiles based on targetRole
      if (targetRole === Role.STUDENT || targetRole === Role.CR) {
        if (existingUser.studentProfile) {
          if (rollNumber && rollNumber.trim().toUpperCase() !== existingUser.studentProfile.rollNumber) {
            const rollConflict = await tx.studentProfile.findUnique({
              where: { rollNumber: rollNumber.trim().toUpperCase() },
            });
            if (rollConflict && rollConflict.id !== existingUser.studentProfile.id) {
              throw new HttpError(400, `Roll number "${rollNumber}" is already in use`);
            }
          }

          await tx.studentProfile.update({
            where: { id: existingUser.studentProfile.id },
            data: {
              ...(rollNumber ? { rollNumber: rollNumber.trim().toUpperCase() } : {}),
              ...(batchYear ? { batchYear: Number(batchYear) } : {}),
              ...(departmentId ? { departmentId } : {}),
              ...(semesterId ? { semesterId } : {}),
              ...(sectionId !== undefined ? { sectionId: sectionId || null } : {}),
            },
          });
        } else if (departmentId && semesterId && rollNumber) {
          await tx.studentProfile.create({
            data: {
              userId: id,
              rollNumber: rollNumber.trim().toUpperCase(),
              batchYear: Number(batchYear) || new Date().getFullYear(),
              departmentId,
              semesterId,
              sectionId: sectionId || null,
            },
          });
        }

        // CR Profile Handling
        if (targetRole === Role.CR) {
          const studentProf = await tx.studentProfile.findUnique({ where: { userId: id } });
          if (studentProf) {
            const crSec = sectionId || studentProf.sectionId;
            if (!crSec) {
              throw new HttpError(400, 'A valid Section is required to assign CR role');
            }
            if (existingUser.crProfile) {
              await tx.cRProfile.update({
                where: { id: existingUser.crProfile.id },
                data: {
                  sectionId: crSec,
                  ...(term ? { term: term.trim() } : {}),
                },
              });
            } else {
              await tx.cRProfile.create({
                data: {
                  userId: id,
                  studentProfileId: studentProf.id,
                  sectionId: crSec,
                  term: term?.trim() || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
                },
              });
            }
          }
        } else if (existingUser.crProfile) {
          await tx.cRProfile.delete({ where: { id: existingUser.crProfile.id } });
        }
      } else if (targetRole === Role.FACULTY) {
        if (existingUser.facultyProfile) {
          if (employeeId && employeeId.trim().toUpperCase() !== existingUser.facultyProfile.employeeId) {
            const empConflict = await tx.facultyProfile.findUnique({
              where: { employeeId: employeeId.trim().toUpperCase() },
            });
            if (empConflict && empConflict.id !== existingUser.facultyProfile.id) {
              throw new HttpError(400, `Employee ID "${employeeId}" is already in use`);
            }
          }

          await tx.facultyProfile.update({
            where: { id: existingUser.facultyProfile.id },
            data: {
              ...(employeeId ? { employeeId: employeeId.trim().toUpperCase() } : {}),
              ...(designation ? { designation: designation.trim() } : {}),
              ...(departmentId ? { departmentId } : {}),
            },
          });
        } else if (employeeId && departmentId) {
          await tx.facultyProfile.create({
            data: {
              userId: id,
              employeeId: employeeId.trim().toUpperCase(),
              designation: designation?.trim() || 'Faculty Member',
              departmentId,
            },
          });
        }
      }

      return tx.user.findUnique({
        where: { id },
        include: {
          studentProfile: { include: { department: true, semester: true, section: true } },
          facultyProfile: { include: { department: true } },
          crProfile: { include: { section: true } },
        },
      });
    });

    await logAudit({
      action: 'UPDATE_USER',
      entity: 'USER',
      entityId: id,
      userId: req.user?.userId,
      details: `Updated user ${existingUser.name} (${existingUser.email})`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      throw new HttpError(400, 'New password must be at least 6 characters long');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await logAudit({
      action: 'RESET_USER_PASSWORD',
      entity: 'USER',
      entityId: user.id,
      userId: req.user?.userId,
      details: `Admin reset password for user ${user.email}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Password for ${user.name} has been reset successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    await logAudit({
      action: 'TOGGLE_USER_STATUS',
      entity: 'USER',
      entityId: user.id,
      userId: req.user?.userId,
      details: `User status changed to isActive=${user.isActive}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: `User status updated to ${user.isActive}`, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthorized');

    const { name, phone, avatarUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(name ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

