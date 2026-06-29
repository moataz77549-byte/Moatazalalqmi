import { db } from '@/lib/db';

export type Permission = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MANAGE';
export type Resource = 'chat' | 'file' | 'note' | 'task' | 'artifact' | 'memory' | 'knowledge' | 'organization' | 'user' | 'provider' | 'api_key' | 'settings';

export interface RBACContext {
  userId: string;
  organizationId?: string;
  roles: string[];
}

const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  MANAGER: 60,
  MEMBER: 40,
  GUEST: 20,
};

const ROLE_PERMISSIONS: Record<string, Record<Resource, Permission[]>> = {
  SUPER_ADMIN: {
    chat: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    file: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    note: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    task: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    artifact: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    memory: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    knowledge: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    organization: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    user: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    provider: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    api_key: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    settings: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
  },
  ADMIN: {
    chat: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    file: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    note: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    task: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    artifact: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    memory: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    knowledge: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
    organization: ['READ', 'UPDATE', 'MANAGE'],
    user: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    provider: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    api_key: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    settings: ['READ', 'UPDATE'],
  },
  MANAGER: {
    chat: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    file: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    note: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    task: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    artifact: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    memory: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    knowledge: ['CREATE', 'READ', 'UPDATE'],
    organization: ['READ'],
    user: ['READ'],
    provider: ['READ'],
    api_key: ['CREATE', 'READ'],
    settings: ['READ'],
  },
  MEMBER: {
    chat: ['CREATE', 'READ', 'UPDATE'],
    file: ['CREATE', 'READ', 'UPDATE'],
    note: ['CREATE', 'READ', 'UPDATE'],
    task: ['CREATE', 'READ', 'UPDATE'],
    artifact: ['CREATE', 'READ'],
    memory: ['CREATE', 'READ', 'UPDATE'],
    knowledge: ['READ'],
    organization: ['READ'],
    user: ['READ'],
    provider: ['READ'],
    api_key: ['CREATE', 'READ'],
    settings: ['READ'],
  },
  GUEST: {
    chat: ['READ'],
    file: ['READ'],
    note: ['READ'],
    task: ['READ'],
    artifact: ['READ'],
    memory: ['READ'],
    knowledge: ['READ'],
    organization: ['READ'],
    user: [],
    provider: [],
    api_key: [],
    settings: [],
  },
};

export function hasPermission(
  roles: string[],
  resource: Resource,
  action: Permission
): boolean {
  for (const role of roles) {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) continue;
    const resourcePerms = permissions[resource];
    if (!resourcePerms) continue;
    if (resourcePerms.includes(action) || resourcePerms.includes('MANAGE')) {
      return true;
    }
  }
  return false;
}

export function getHighestRole(roles: string[]): string {
  let highest = 'GUEST';
  let highestLevel = 0;
  for (const role of roles) {
    const level = ROLE_HIERARCHY[role] || 0;
    if (level > highestLevel) {
      highestLevel = level;
      highest = role;
    }
  }
  return highest;
}

export async function getUserRoles(userId: string, organizationId?: string): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (user?.isSuperAdmin) return ['SUPER_ADMIN'];

  if (!organizationId) return ['MEMBER'];

  const membership = await db.organizationMember.findFirst({
    where: { userId, organizationId },
    include: { role: true },
  });

  if (!membership) return ['GUEST'];
  return [membership.role.name];
}

export async function checkPermission(
  userId: string,
  resource: Resource,
  action: Permission,
  organizationId?: string
): Promise<boolean> {
  const roles = await getUserRoles(userId, organizationId);
  return hasPermission(roles, resource, action);
}
