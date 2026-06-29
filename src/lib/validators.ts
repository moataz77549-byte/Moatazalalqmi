import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
  locale: z.enum(['en', 'ar']).optional().default('en'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  organizationId: z.string().cuid(),
});

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  organizationId: z.string().cuid(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  locale: z.enum(['en', 'ar']).optional(),
  timezone: z.string().optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(2).max(100),
  organizationId: z.string().cuid().optional(),
  permissions: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const createChatSchema = z.object({
  title: z.string().max(200).optional(),
  organizationId: z.string().cuid(),
  projectId: z.string().cuid().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateChatInput = z.infer<typeof createChatSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
