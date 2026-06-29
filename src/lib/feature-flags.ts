import { db } from '@/lib/db';

export async function isFeatureEnabled(key: string, userId?: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({ where: { key } });
  if (!flag || !flag.isActive) return false;

  try {
    const value = JSON.parse(flag.value);
    if (flag.type === 'BOOLEAN') return !!value;
    if (flag.type === 'PERCENTAGE' && userId) {
      const hash = simpleHash(userId + key);
      return (hash % 100) < value;
    }
    return !!value;
  } catch {
    return false;
  }
}

export async function getFeatureFlag(key: string) {
  return db.featureFlag.findUnique({ where: { key } });
}

export async function getAllFeatureFlags() {
  return db.featureFlag.findMany({ where: { isActive: true } });
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
