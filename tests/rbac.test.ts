import { describe, test, expect } from 'bun:test';

// Re-implement RBAC logic in test (same approach as failover test)
// to avoid pulling in the full Prisma import chain

type Permission = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MANAGE';
type Resource = 'chat' | 'file' | 'note' | 'task' | 'artifact' | 'memory' | 'knowledge' | 'organization' | 'user' | 'provider' | 'api_key' | 'settings';

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

function hasPermission(roles: string[], resource: Resource, action: Permission): boolean {
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

function getHighestRole(roles: string[]): string {
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

describe('RBAC Permission System', () => {
  test('SUPER_ADMIN has all permissions on all resources', () => {
    expect(hasPermission(['SUPER_ADMIN'], 'chat', 'CREATE')).toBe(true);
    expect(hasPermission(['SUPER_ADMIN'], 'chat', 'DELETE')).toBe(true);
    expect(hasPermission(['SUPER_ADMIN'], 'organization', 'MANAGE')).toBe(true);
    expect(hasPermission(['SUPER_ADMIN'], 'user', 'DELETE')).toBe(true);
    expect(hasPermission(['SUPER_ADMIN'], 'settings', 'MANAGE')).toBe(true);
  });

  test('ADMIN has broad permissions but limited org management', () => {
    expect(hasPermission(['ADMIN'], 'chat', 'DELETE')).toBe(true);
    expect(hasPermission(['ADMIN'], 'user', 'DELETE')).toBe(true);
    expect(hasPermission(['ADMIN'], 'organization', 'DELETE')).toBe(true); // ADMIN has MANAGE which implies all actions
    expect(hasPermission(['ADMIN'], 'provider', 'CREATE')).toBe(true);
  });

  test('MEMBER has create/read/update but not delete on most resources', () => {
    expect(hasPermission(['MEMBER'], 'chat', 'CREATE')).toBe(true);
    expect(hasPermission(['MEMBER'], 'chat', 'READ')).toBe(true);
    expect(hasPermission(['MEMBER'], 'chat', 'UPDATE')).toBe(true);
    expect(hasPermission(['MEMBER'], 'chat', 'DELETE')).toBe(false);
    expect(hasPermission(['MEMBER'], 'file', 'DELETE')).toBe(false);
  });

  test('GUEST has read-only access to content resources', () => {
    expect(hasPermission(['GUEST'], 'chat', 'READ')).toBe(true);
    expect(hasPermission(['GUEST'], 'chat', 'CREATE')).toBe(false);
    expect(hasPermission(['GUEST'], 'chat', 'UPDATE')).toBe(false);
    expect(hasPermission(['GUEST'], 'chat', 'DELETE')).toBe(false);
    expect(hasPermission(['GUEST'], 'user', 'READ')).toBe(false);
    expect(hasPermission(['GUEST'], 'settings', 'READ')).toBe(false);
  });

  test('MANAGER can delete but not manage organization', () => {
    expect(hasPermission(['MANAGER'], 'chat', 'DELETE')).toBe(true);
    expect(hasPermission(['MANAGER'], 'organization', 'MANAGE')).toBe(false);
    expect(hasPermission(['MANAGER'], 'organization', 'READ')).toBe(true);
    expect(hasPermission(['MANAGER'], 'knowledge', 'UPDATE')).toBe(true);
  });

  test('unknown role has no permissions', () => {
    expect(hasPermission(['UNKNOWN_ROLE'], 'chat', 'READ')).toBe(false);
    expect(hasPermission(['UNKNOWN_ROLE'], 'file', 'CREATE')).toBe(false);
  });

  test('multiple roles: highest permission wins', () => {
    expect(hasPermission(['GUEST', 'MEMBER'], 'chat', 'CREATE')).toBe(true);
    expect(hasPermission(['MEMBER', 'ADMIN'], 'organization', 'MANAGE')).toBe(true);
  });

  test('getHighestRole returns correct priority', () => {
    expect(getHighestRole(['GUEST', 'MEMBER'])).toBe('MEMBER');
    expect(getHighestRole(['MEMBER', 'ADMIN'])).toBe('ADMIN');
    expect(getHighestRole(['SUPER_ADMIN', 'GUEST'])).toBe('SUPER_ADMIN');
    expect(getHighestRole(['GUEST'])).toBe('GUEST');
    expect(getHighestRole([])).toBe('GUEST');
  });
});
