/**
 * Moataz AI — Centralized Configuration
 * All environment-driven configuration is accessed here.
 */

function env(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`[Moataz AI] Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  app: {
    name: 'Moataz AI',
    description: 'Enterprise AI Operating System',
    url: env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    version: '1.0.0',
    locale: env('DEFAULT_LOCALE', 'en'),
    environment: env('NODE_ENV', 'development'),
  },
  auth: {
    jwtSecret: env('JWT_SECRET', 'dev-secret-change-in-production'),
    sessionTimeout: parseInt(env('SESSION_TIMEOUT_HOURS', '24')),
    bcryptRounds: parseInt(env('BCRYPT_ROUNDS', '12')),
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
  },
  database: {
    url: process.env.DATABASE_URL || 'file:./db/custom.db',
  },
  storage: {
    endpoint: env('S3_ENDPOINT', ''),
    bucket: env('S3_BUCKET', 'moataz-ai'),
    accessKey: env('S3_ACCESS_KEY', ''),
    secretKey: env('S3_SECRET_KEY', ''),
    region: env('S3_REGION', 'us-east-1'),
  },
  redis: {
    url: env('REDIS_URL', 'redis://localhost:6379'),
  },
  qdrant: {
    url: env('QDRANT_URL', 'http://localhost:6333'),
    apiKey: env('QDRANT_API_KEY', ''),
  },
  oauth: {
    google: {
      clientId: env('GOOGLE_CLIENT_ID', ''),
      clientSecret: env('GOOGLE_CLIENT_SECRET', ''),
    },
    github: {
      clientId: env('GITHUB_CLIENT_ID', ''),
      clientSecret: env('GITHUB_CLIENT_SECRET', ''),
    },
  },
  security: {
    corsOrigins: env('CORS_ORIGINS', '*').split(','),
    rateLimitEnabled: env('RATE_LIMIT_ENABLED', 'true') === 'true',
    promptInjectionDetection: true,
  },
} as const;
