// src/services/audit.service.ts
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

export interface CreateAuditLogParams {
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  userId?: string;
  ipAddress?: string;
}

export const logAudit = async (params: CreateAuditLogParams) => {
  try {
    return await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        userId: params.userId,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    logger.error('Failed to create audit log', err);
    return null;
  }
};
