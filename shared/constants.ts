/**
 * Moataz AI — Shared Constants
 * Central source of truth for branding, versioning, and configuration constants.
 */

export const APP = {
  name: 'Moataz AI',
  tagline: 'Enterprise AI Operating System',
  version: '1.0.0',
  releaseStage: 'rc',
  copyright: '© 2026 Moataz AI Team',
} as const;

export const API = {
  version: 'v1',
  basePath: '/api/v1',
  maxPageSize: 100,
  defaultPageSize: 20,
} as const;

export const SECURITY = {
  saltRounds: 12,
  sessionTTLHours: 24,
  tokenEntropy: 32,
  refreshTokenEntropy: 64,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  apiKeyPrefix: 'mz_',
} as const;

export const AI_GATEWAY = {
  maxRetries: 3,
  maxFallbacks: 3,
  defaultTimeout: 30_000,
  providerCooldownMs: 60_000,
  maxContextTokens: 120_000,
} as const;

export const RATE_LIMITS = {
  free: { requests: 60, windowMs: 60_000 },
  pro: { requests: 300, windowMs: 60_000 },
  enterprise: { requests: 1000, windowMs: 60_000 },
} as const;
