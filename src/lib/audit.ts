import { db } from '@/lib/db';

type AuditInput = {
  userId?: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export async function createAuditLog(input: AuditInput) {
  return db.auditLog.create({
    data: {
      userId: input.userId || null,
      organizationId: input.organizationId || null,
      action: input.action as any,
      resource: input.resource,
      resourceId: input.resourceId || null,
      details: input.details ? JSON.stringify(input.details) : null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    },
  });
}
