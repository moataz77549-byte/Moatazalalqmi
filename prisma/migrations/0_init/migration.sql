-- ═══════════════════════════════════════════════════════════════════
-- Moataz AI — PostgreSQL 16+ Initial Migration
-- Production-Safe | Supabase Compatible
-- Generated: 2026-06-28
-- ═══════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ENUMS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TYPE "RoleName" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MEMBER', 'GUEST');
CREATE TYPE "PermissionAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE');
CREATE TYPE "ProviderType" AS ENUM ('OPENAI', 'GEMINI', 'ANTHROPIC', 'OPENROUTER', 'NVIDIA_NIM', 'HUGGING_FACE', 'MISTRAL', 'GROQ', 'DEEPSEEK', 'COHERE', 'AZURE_OPENAI', 'OLLAMA', 'CUSTOM');
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'GITHUB');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET', 'EMAIL_VERIFIED', 'ROLE_CHANGE', 'PERMISSION_CHANGE', 'API_KEY_CREATED', 'API_KEY_REVOKED', 'SETTINGS_CHANGE', 'EXPORT');
CREATE TYPE "FeatureFlagType" AS ENUM ('BOOLEAN', 'PERCENTAGE', 'VARIANT');
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "MemoryScope" AS ENUM ('PERSONAL', 'WORKSPACE', 'PROJECT', 'ORGANIZATION', 'PINNED');
CREATE TYPE "MemoryType" AS ENUM ('FACT', 'PREFERENCE', 'DECISION', 'INSTRUCTION', 'CONTEXT', 'SUMMARY', 'ENTITY', 'RELATIONSHIP');
CREATE TYPE "MemoryStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'EXPIRED', 'DEPRECATED');
CREATE TYPE "DocumentType" AS ENUM ('PDF', 'DOCX', 'MARKDOWN', 'TEXT', 'CSV', 'CODE', 'HTML', 'WEBPAGE', 'ARTICLE', 'NOTE', 'IMAGE', 'SPREADSHEET', 'PRESENTATION');
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'EXTRACTING', 'CHUNKING', 'EMBEDDING', 'INDEXED', 'FAILED', 'DUPLICATE');
CREATE TYPE "CollectionType" AS ENUM ('KNOWLEDGE_BASE', 'FOLDER', 'CATEGORY', 'TAG_GROUP', 'SHARED');
CREATE TYPE "EmbeddingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "EmbeddingModel" AS ENUM ('OPENAI_SMALL', 'OPENAI_LARGE', 'COHERE', 'MISTRAL', 'LOCAL');
CREATE TYPE "ArtifactType" AS ENUM ('CODE', 'IMAGE', 'DOCUMENT', 'TABLE', 'CHART', 'MARKDOWN', 'PDF', 'JSON', 'CSV', 'HTML', 'SVG');
CREATE TYPE "FolderType" AS ENUM ('CHAT', 'FILE', 'PROJECT');
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'STREAMING', 'COMPLETED', 'FAILED', 'STOPPED');
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'DISLIKE', 'LOVE', 'THUMBS_UP', 'THUMBS_DOWN');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: User
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "passwordHash" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "preferredLocale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "User_isSuperAdmin_idx" ON "User"("isSuperAdmin");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Session
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Session" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_token_idx" ON "Session"("token");
CREATE INDEX "Session_refreshToken_idx" ON "Session"("refreshToken");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "Session_isRevoked_idx" ON "Session"("isRevoked");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: OAuthAccount
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "OAuthAccount" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthAccount_provider_providerId_key" ON "OAuthAccount"("provider", "providerId");
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: PasswordResetToken
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: EmailVerificationToken
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "EmailVerificationToken" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");
CREATE INDEX "EmailVerificationToken_email_idx" ON "EmailVerificationToken"("email");
CREATE INDEX "EmailVerificationToken_token_idx" ON "EmailVerificationToken"("token");
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Organization
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Organization" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" UUID NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");
CREATE INDEX "Organization_ownerId_idx" ON "Organization"("ownerId");
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");
CREATE INDEX "Organization_deletedAt_idx" ON "Organization"("deletedAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Team
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Team" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Team_organizationId_slug_key" ON "Team"("organizationId", "slug");
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");
CREATE INDEX "Team_isActive_idx" ON "Team"("isActive");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Membership
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Membership" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "teamId" UUID,
    "role" "RoleName" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE INDEX "Membership_organizationId_idx" ON "Membership"("organizationId");
CREATE INDEX "Membership_teamId_idx" ON "Membership"("teamId");
CREATE INDEX "Membership_role_idx" ON "Membership"("role");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Role
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Role" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" "RoleName" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Permission
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Permission" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "roleId" UUID NOT NULL,
    "resource" TEXT NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Permission_roleId_resource_action_key" ON "Permission"("roleId", "resource", "action");
CREATE INDEX "Permission_roleId_idx" ON "Permission"("roleId");
CREATE INDEX "Permission_resource_idx" ON "Permission"("resource");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Analytics
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Analytics" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "properties" JSONB,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Analytics_organizationId_idx" ON "Analytics"("organizationId");
CREATE INDEX "Analytics_event_idx" ON "Analytics"("event");
CREATE INDEX "Analytics_createdAt_idx" ON "Analytics"("createdAt");
CREATE INDEX "Analytics_userId_idx" ON "Analytics"("userId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Project
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Project" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "organizationId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Project_organizationId_slug_key" ON "Project"("organizationId", "slug");
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");
CREATE INDEX "Project_isActive_idx" ON "Project"("isActive");
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Workspace
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Workspace" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "layout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Workspace_organizationId_idx" ON "Workspace"("organizationId");
CREATE INDEX "Workspace_projectId_idx" ON "Workspace"("projectId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Chat
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Chat" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT,
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "userId" UUID NOT NULL,
    "folderId" UUID,
    "providerType" "ProviderType",
    "modelId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "parentChatId" UUID,
    "modelParams" JSONB,
    "lastMessageAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Chat_userId_idx" ON "Chat"("userId");
CREATE INDEX "Chat_organizationId_idx" ON "Chat"("organizationId");
CREATE INDEX "Chat_projectId_idx" ON "Chat"("projectId");
CREATE INDEX "Chat_folderId_idx" ON "Chat"("folderId");
CREATE INDEX "Chat_createdAt_idx" ON "Chat"("createdAt");
CREATE INDEX "Chat_lastMessageAt_idx" ON "Chat"("lastMessageAt");
CREATE INDEX "Chat_isPinned_idx" ON "Chat"("isPinned");
CREATE INDEX "Chat_isArchived_idx" ON "Chat"("isArchived");
CREATE INDEX "Chat_deletedAt_idx" ON "Chat"("deletedAt");
CREATE INDEX "Chat_parentChatId_idx" ON "Chat"("parentChatId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Message
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Message" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "chatId" UUID NOT NULL,
    "userId" UUID,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "status" "MessageStatus" NOT NULL DEFAULT 'COMPLETED',
    "metadata" JSONB,
    "parentMessageId" UUID,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");
CREATE INDEX "Message_userId_idx" ON "Message"("userId");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
CREATE INDEX "Message_parentMessageId_idx" ON "Message"("parentMessageId");
CREATE INDEX "Message_status_idx" ON "Message"("status");
CREATE INDEX "Message_deletedAt_idx" ON "Message"("deletedAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Provider
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Provider" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "type" "ProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT,
    "baseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Provider_organizationId_type_key" ON "Provider"("organizationId", "type");
CREATE INDEX "Provider_organizationId_idx" ON "Provider"("organizationId");
CREATE INDEX "Provider_type_idx" ON "Provider"("type");
CREATE INDEX "Provider_isActive_idx" ON "Provider"("isActive");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Model
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Model" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "providerId" UUID NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contextWindow" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pricing" JSONB,
    "capabilities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Model_providerId_externalId_key" ON "Model"("providerId", "externalId");
CREATE INDEX "Model_providerId_idx" ON "Model"("providerId");
CREATE INDEX "Model_isActive_idx" ON "Model"("isActive");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: PromptTemplate
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "PromptTemplate" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PromptTemplate_organizationId_idx" ON "PromptTemplate"("organizationId");
CREATE INDEX "PromptTemplate_name_idx" ON "PromptTemplate"("name");
CREATE INDEX "PromptTemplate_isPublic_idx" ON "PromptTemplate"("isPublic");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: File
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "File" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "folderId" UUID,
    "userId" UUID NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentFileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "File_organizationId_idx" ON "File"("organizationId");
CREATE INDEX "File_userId_idx" ON "File"("userId");
CREATE INDEX "File_projectId_idx" ON "File"("projectId");
CREATE INDEX "File_folderId_idx" ON "File"("folderId");
CREATE INDEX "File_mimeType_idx" ON "File"("mimeType");
CREATE INDEX "File_parentFileId_idx" ON "File"("parentFileId");
CREATE INDEX "File_status_idx" ON "File"("status");
CREATE INDEX "File_storageKey_idx" ON "File"("storageKey");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: ApiKey
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "organizationId" UUID,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" JSONB,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");
CREATE INDEX "ApiKey_isRevoked_idx" ON "ApiKey"("isRevoked");
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Notification
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Notification" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: AuditLog
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID,
    "organizationId" UUID,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");
CREATE INDEX "AuditLog_resourceId_idx" ON "AuditLog"("resourceId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: UserSetting
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "UserSetting" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSetting_userId_key_key" ON "UserSetting"("userId", "key");
CREATE INDEX "UserSetting_userId_idx" ON "UserSetting"("userId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: OrganizationSetting
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "OrganizationSetting" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "OrganizationSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationSetting_organizationId_key_key" ON "OrganizationSetting"("organizationId", "key");
CREATE INDEX "OrganizationSetting_organizationId_idx" ON "OrganizationSetting"("organizationId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: FeatureFlag
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "FeatureFlag" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "FeatureFlagType" NOT NULL DEFAULT 'BOOLEAN',
    "value" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");
CREATE INDEX "FeatureFlag_isActive_idx" ON "FeatureFlag"("isActive");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: FeatureFlagEvaluation
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "FeatureFlagEvaluation" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "flagId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "variant" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlagEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeatureFlagEvaluation_flagId_idx" ON "FeatureFlagEvaluation"("flagId");
CREATE INDEX "FeatureFlagEvaluation_userId_idx" ON "FeatureFlagEvaluation"("userId");
CREATE INDEX "FeatureFlagEvaluation_evaluatedAt_idx" ON "FeatureFlagEvaluation"("evaluatedAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Folder
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Folder" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "type" "FolderType" NOT NULL,
    "parentId" UUID,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");
CREATE INDEX "Folder_organizationId_idx" ON "Folder"("organizationId");
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");
CREATE INDEX "Folder_type_idx" ON "Folder"("type");
CREATE INDEX "Folder_sortOrder_idx" ON "Folder"("sortOrder");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Tag
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Tag" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_organizationId_name_userId_key" ON "Tag"("organizationId", "name", "userId");
CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");
CREATE INDEX "Tag_organizationId_idx" ON "Tag"("organizationId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: ChatTag
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "ChatTag" (
    "chatId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "ChatTag_pkey" PRIMARY KEY ("chatId", "tagId")
);

CREATE INDEX "ChatTag_chatId_idx" ON "ChatTag"("chatId");
CREATE INDEX "ChatTag_tagId_idx" ON "ChatTag"("tagId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: ChatShare
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "ChatShare" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "chatId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "shareToken" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatShare_shareToken_key" ON "ChatShare"("shareToken");
CREATE INDEX "ChatShare_chatId_idx" ON "ChatShare"("chatId");
CREATE INDEX "ChatShare_userId_idx" ON "ChatShare"("userId");
CREATE INDEX "ChatShare_shareToken_idx" ON "ChatShare"("shareToken");
CREATE INDEX "ChatShare_expiresAt_idx" ON "ChatShare"("expiresAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: MessageVersion
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "MessageVersion" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "messageId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "editedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessageVersion_messageId_idx" ON "MessageVersion"("messageId");
CREATE INDEX "MessageVersion_version_idx" ON "MessageVersion"("version");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: MessageReaction
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "MessageReaction" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "messageId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageReaction_messageId_userId_type_key" ON "MessageReaction"("messageId", "userId", "type");
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");
CREATE INDEX "MessageReaction_userId_idx" ON "MessageReaction"("userId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Artifact
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Artifact" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "artifactType" "ArtifactType" NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT,
    "metadata" JSONB,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID,
    "chatId" UUID,
    "messageId" UUID,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentArtifactId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Artifact_organizationId_idx" ON "Artifact"("organizationId");
CREATE INDEX "Artifact_userId_idx" ON "Artifact"("userId");
CREATE INDEX "Artifact_projectId_idx" ON "Artifact"("projectId");
CREATE INDEX "Artifact_chatId_idx" ON "Artifact"("chatId");
CREATE INDEX "Artifact_messageId_idx" ON "Artifact"("messageId");
CREATE INDEX "Artifact_artifactType_idx" ON "Artifact"("artifactType");
CREATE INDEX "Artifact_parentArtifactId_idx" ON "Artifact"("parentArtifactId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Note
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Note" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "userId" UUID NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Note_userId_idx" ON "Note"("userId");
CREATE INDEX "Note_organizationId_idx" ON "Note"("organizationId");
CREATE INDEX "Note_projectId_idx" ON "Note"("projectId");
CREATE INDEX "Note_isPinned_idx" ON "Note"("isPinned");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Task
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Task" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "userId" UUID NOT NULL,
    "assigneeId" UUID,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_userId_idx" ON "Task"("userId");
CREATE INDEX "Task_organizationId_idx" ON "Task"("organizationId");
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Task_priority_idx" ON "Task"("priority");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: QuickAccess
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "QuickAccess" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuickAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuickAccess_userId_itemType_itemId_key" ON "QuickAccess"("userId", "itemType", "itemId");
CREATE INDEX "QuickAccess_userId_idx" ON "QuickAccess"("userId");
CREATE INDEX "QuickAccess_sortOrder_idx" ON "QuickAccess"("sortOrder");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: WorkspaceVariable
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "WorkspaceVariable" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceVariable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceVariable_projectId_key_key" ON "WorkspaceVariable"("projectId", "key");
CREATE INDEX "WorkspaceVariable_projectId_idx" ON "WorkspaceVariable"("projectId");
CREATE INDEX "WorkspaceVariable_organizationId_idx" ON "WorkspaceVariable"("organizationId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: PromptLibrary
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "PromptLibrary" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "tags" JSONB,
    "organizationId" UUID,
    "userId" UUID NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptLibrary_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PromptLibrary_userId_idx" ON "PromptLibrary"("userId");
CREATE INDEX "PromptLibrary_organizationId_idx" ON "PromptLibrary"("organizationId");
CREATE INDEX "PromptLibrary_category_idx" ON "PromptLibrary"("category");
CREATE INDEX "PromptLibrary_isPublic_idx" ON "PromptLibrary"("isPublic");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: UserPreference
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "UserPreference" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPreference_userId_category_key" ON "UserPreference"("userId", "category");
CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Memory
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Memory" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "type" "MemoryType" NOT NULL,
    "scope" "MemoryScope" NOT NULL,
    "status" "MemoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID,
    "chatId" UUID,
    "parentMemoryId" UUID,
    "embedding" JSONB,
    "embeddingModel" "EmbeddingModel",
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "deprecatedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "tags" JSONB,
    "source" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Memory_userId_idx" ON "Memory"("userId");
CREATE INDEX "Memory_organizationId_idx" ON "Memory"("organizationId");
CREATE INDEX "Memory_projectId_idx" ON "Memory"("projectId");
CREATE INDEX "Memory_chatId_idx" ON "Memory"("chatId");
CREATE INDEX "Memory_scope_idx" ON "Memory"("scope");
CREATE INDEX "Memory_type_idx" ON "Memory"("type");
CREATE INDEX "Memory_status_idx" ON "Memory"("status");
CREATE INDEX "Memory_confidence_idx" ON "Memory"("confidence");
CREATE INDEX "Memory_importance_idx" ON "Memory"("importance");
CREATE INDEX "Memory_createdAt_idx" ON "Memory"("createdAt");
CREATE INDEX "Memory_expiresAt_idx" ON "Memory"("expiresAt");
CREATE INDEX "Memory_parentMemoryId_idx" ON "Memory"("parentMemoryId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: MemoryPermission
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "MemoryPermission" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "memoryId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "access" TEXT NOT NULL DEFAULT 'read',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemoryPermission_memoryId_userId_key" ON "MemoryPermission"("memoryId", "userId");
CREATE INDEX "MemoryPermission_memoryId_idx" ON "MemoryPermission"("memoryId");
CREATE INDEX "MemoryPermission_userId_idx" ON "MemoryPermission"("userId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Collection
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Collection" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "collectionType" "CollectionType" NOT NULL,
    "parentId" UUID,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID,
    "icon" TEXT,
    "color" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");
CREATE INDEX "Collection_organizationId_idx" ON "Collection"("organizationId");
CREATE INDEX "Collection_projectId_idx" ON "Collection"("projectId");
CREATE INDEX "Collection_parentId_idx" ON "Collection"("parentId");
CREATE INDEX "Collection_collectionType_idx" ON "Collection"("collectionType");
CREATE INDEX "Collection_sortOrder_idx" ON "Collection"("sortOrder");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: KnowledgeDocument
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "KnowledgeDocument" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID,
    "collectionId" UUID,
    "fileId" UUID,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "language" TEXT,
    "contentHash" TEXT,
    "checksum" TEXT,
    "pageCount" INTEGER,
    "wordCount" INTEGER,
    "charCount" INTEGER,
    "chunkCount" INTEGER,
    "metadata" JSONB,
    "tags" JSONB,
    "categories" JSONB,
    "keywords" JSONB,
    "topics" JSONB,
    "languageConfidence" DOUBLE PRECISION,
    "duplicateOfId" UUID,
    "processingError" TEXT,
    "processedAt" TIMESTAMP(3),
    "indexedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KnowledgeDocument_userId_idx" ON "KnowledgeDocument"("userId");
CREATE INDEX "KnowledgeDocument_organizationId_idx" ON "KnowledgeDocument"("organizationId");
CREATE INDEX "KnowledgeDocument_projectId_idx" ON "KnowledgeDocument"("projectId");
CREATE INDEX "KnowledgeDocument_collectionId_idx" ON "KnowledgeDocument"("collectionId");
CREATE INDEX "KnowledgeDocument_documentType_idx" ON "KnowledgeDocument"("documentType");
CREATE INDEX "KnowledgeDocument_status_idx" ON "KnowledgeDocument"("status");
CREATE INDEX "KnowledgeDocument_contentHash_idx" ON "KnowledgeDocument"("contentHash");
CREATE INDEX "KnowledgeDocument_createdAt_idx" ON "KnowledgeDocument"("createdAt");
CREATE INDEX "KnowledgeDocument_deletedAt_idx" ON "KnowledgeDocument"("deletedAt");
CREATE INDEX "KnowledgeDocument_duplicateOfId_idx" ON "KnowledgeDocument"("duplicateOfId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: DocumentChunk
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "DocumentChunk" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "documentId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "tokenCount" INTEGER,
    "charCount" INTEGER NOT NULL,
    "startPosition" INTEGER NOT NULL,
    "endPosition" INTEGER NOT NULL,
    "embedding" JSONB,
    "embeddingModel" "EmbeddingModel",
    "embeddingStatus" "EmbeddingStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");
CREATE INDEX "DocumentChunk_embeddingStatus_idx" ON "DocumentChunk"("embeddingStatus");
CREATE INDEX "DocumentChunk_chunkIndex_idx" ON "DocumentChunk"("chunkIndex");
CREATE INDEX "DocumentChunk_documentId_chunkIndex_idx" ON "DocumentChunk"("documentId", "chunkIndex");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: Embedding
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "Embedding" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "documentId" UUID,
    "chunkId" UUID,
    "memoryId" UUID,
    "embedding" JSONB NOT NULL,
    "embeddingModel" "EmbeddingModel" NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "textPreview" TEXT NOT NULL,
    "qdrantId" TEXT,
    "qdrantCollection" TEXT,
    "status" "EmbeddingStatus" NOT NULL DEFAULT 'COMPLETED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Embedding_userId_idx" ON "Embedding"("userId");
CREATE INDEX "Embedding_organizationId_idx" ON "Embedding"("organizationId");
CREATE INDEX "Embedding_documentId_idx" ON "Embedding"("documentId");
CREATE INDEX "Embedding_chunkId_idx" ON "Embedding"("chunkId");
CREATE INDEX "Embedding_memoryId_idx" ON "Embedding"("memoryId");
CREATE INDEX "Embedding_embeddingModel_idx" ON "Embedding"("embeddingModel");
CREATE INDEX "Embedding_status_idx" ON "Embedding"("status");
CREATE INDEX "Embedding_qdrantCollection_idx" ON "Embedding"("qdrantCollection");
CREATE INDEX "Embedding_qdrantId_idx" ON "Embedding"("qdrantId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: SearchIndex
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE "SearchIndex" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "keywords" JSONB,
    "topics" JSONB,
    "language" TEXT,
    "classification" TEXT,
    "metadata" JSONB,
    "embedding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchIndex_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SearchIndex_itemType_itemId_key" ON "SearchIndex"("itemType", "itemId");
CREATE INDEX "SearchIndex_userId_idx" ON "SearchIndex"("userId");
CREATE INDEX "SearchIndex_organizationId_idx" ON "SearchIndex"("organizationId");
CREATE INDEX "SearchIndex_itemType_idx" ON "SearchIndex"("itemType");
CREATE INDEX "SearchIndex_itemId_idx" ON "SearchIndex"("itemId");
CREATE INDEX "SearchIndex_createdAt_idx" ON "SearchIndex"("createdAt");
CREATE INDEX "SearchIndex_organizationId_itemType_idx" ON "SearchIndex"("organizationId", "itemType");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FOREIGN KEYS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Session
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OAuthAccount
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Organization
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Team
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Membership
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Permission
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Project
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Workspace
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Chat
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_parentChatId_fkey" FOREIGN KEY ("parentChatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Message
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Provider
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Model
ALTER TABLE "Model" ADD CONSTRAINT "Model_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- File
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_parentFileId_fkey" FOREIGN KEY ("parentFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ApiKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notification
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AuditLog
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserSetting
ALTER TABLE "UserSetting" ADD CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OrganizationSetting
ALTER TABLE "OrganizationSetting" ADD CONSTRAINT "OrganizationSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FeatureFlagEvaluation
ALTER TABLE "FeatureFlagEvaluation" ADD CONSTRAINT "FeatureFlagEvaluation_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureFlagEvaluation" ADD CONSTRAINT "FeatureFlagEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Folder
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tag
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ChatTag
ALTER TABLE "ChatTag" ADD CONSTRAINT "ChatTag_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatTag" ADD CONSTRAINT "ChatTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ChatShare
ALTER TABLE "ChatShare" ADD CONSTRAINT "ChatShare_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatShare" ADD CONSTRAINT "ChatShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MessageVersion
ALTER TABLE "MessageVersion" ADD CONSTRAINT "MessageVersion_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MessageReaction
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Artifact
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Note
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Task
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- QuickAccess
ALTER TABLE "QuickAccess" ADD CONSTRAINT "QuickAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WorkspaceVariable
ALTER TABLE "WorkspaceVariable" ADD CONSTRAINT "WorkspaceVariable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PromptLibrary
ALTER TABLE "PromptLibrary" ADD CONSTRAINT "PromptLibrary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserPreference
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Memory
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_parentMemoryId_fkey" FOREIGN KEY ("parentMemoryId") REFERENCES "Memory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- MemoryPermission
ALTER TABLE "MemoryPermission" ADD CONSTRAINT "MemoryPermission_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "Memory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemoryPermission" ADD CONSTRAINT "MemoryPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Collection
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- KnowledgeDocument
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "KnowledgeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DocumentChunk
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Embedding
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "DocumentChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PRODUCTION OPTIMIZATIONS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Partial indexes for soft-deleted records (PostgreSQL specific)
CREATE INDEX "User_active_not_deleted_idx" ON "User"("isActive") WHERE "deletedAt" IS NULL;
CREATE INDEX "Organization_active_not_deleted_idx" ON "Organization"("isActive") WHERE "deletedAt" IS NULL;
CREATE INDEX "Project_active_not_deleted_idx" ON "Project"("isActive") WHERE "deletedAt" IS NULL;
CREATE INDEX "Chat_active_not_deleted_idx" ON "Chat"("userId", "organizationId") WHERE "deletedAt" IS NULL;
CREATE INDEX "Message_active_not_deleted_idx" ON "Message"("chatId") WHERE "deletedAt" IS NULL;

-- Composite indexes for common queries
CREATE INDEX "Chat_user_org_recent_idx" ON "Chat"("userId", "organizationId", "lastMessageAt" DESC) WHERE "deletedAt" IS NULL AND "isArchived" = false;
CREATE INDEX "Message_chat_recent_idx" ON "Message"("chatId", "createdAt" DESC) WHERE "deletedAt" IS NULL;
CREATE INDEX "Memory_user_active_idx" ON "Memory"("userId", "status") WHERE "status" = 'ACTIVE';
CREATE INDEX "AuditLog_org_recent_idx" ON "AuditLog"("organizationId", "createdAt" DESC);

-- Mark migration as applied
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (uuid_generate_v4(), 'initial_postgresql_migration', NOW(), '0_init', NULL, NULL, NOW(), 1);
