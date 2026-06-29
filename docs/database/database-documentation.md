# Moataz AI — Database Documentation

## Overview

| Property | Value |
|----------|-------|
| **Database Engine** | PostgreSQL 16+ |
| **ORM** | Prisma 6.x |
| **Compatibility** | Supabase, Neon, AWS RDS, Railway |
| **Total Tables** | 37 |
| **Total Enums** | 21 |
| **ID Strategy** | UUID v4 (`@db.Uuid`) |
| **Soft Delete** | Core entities (User, Org, Project, Chat, Message, Document) |
| **JSON Storage** | Native JSONB |

---

## Table Catalog

### 1. User
Core identity table for all platform users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto | Unique user identifier |
| email | TEXT | UNIQUE, NOT NULL | Login email |
| name | TEXT | nullable | Display name |
| avatarUrl | TEXT | nullable | Profile picture URL |
| passwordHash | TEXT | nullable | bcrypt hash (null for OAuth-only) |
| emailVerified | BOOLEAN | default: false | Email verification status |
| emailVerifiedAt | TIMESTAMP | nullable | When email was verified |
| isActive | BOOLEAN | default: true | Account active status |
| isSuperAdmin | BOOLEAN | default: false | Platform-wide admin flag |
| lastLoginAt | TIMESTAMP | nullable | Last successful login |
| lastLoginIp | TEXT | nullable | IP of last login |
| preferredLocale | TEXT | default: 'en' | UI language preference |
| timezone | TEXT | default: 'UTC' | User timezone |
| deletedAt | TIMESTAMP | nullable | Soft delete timestamp |
| createdAt | TIMESTAMP | auto | Record creation time |
| updatedAt | TIMESTAMP | auto | Last update time |

**Indexes:** email, isActive, deletedAt, isSuperAdmin, active_not_deleted (partial)

---

### 2. Session
Active authentication sessions with token management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Session identifier |
| userId | UUID | FK → User, CASCADE | Owner |
| token | TEXT | UNIQUE | Access token |
| refreshToken | TEXT | UNIQUE | Refresh token |
| userAgent | TEXT | nullable | Browser/client info |
| ipAddress | TEXT | nullable | Client IP |
| expiresAt | TIMESTAMP | NOT NULL | Expiry time |
| isRevoked | BOOLEAN | default: false | Manual revocation |

---

### 3. Organization
Multi-tenant container for all business data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Organization identifier |
| name | TEXT | NOT NULL | Display name |
| slug | TEXT | UNIQUE | URL-safe identifier |
| logoUrl | TEXT | nullable | Organization logo |
| description | TEXT | nullable | About text |
| isActive | BOOLEAN | default: true | Active status |
| plan | TEXT | default: 'free' | Subscription tier |
| ownerId | UUID | FK → User | Organization creator |
| deletedAt | TIMESTAMP | nullable | Soft delete |

---

### 4. Team
Sub-groups within organizations for access control.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Team identifier |
| name | TEXT | NOT NULL | Team name |
| slug | TEXT | UNIQUE(org+slug) | URL-safe identifier |
| organizationId | UUID | FK → Organization, CASCADE | Parent org |

---

### 5. Membership
Junction: User ↔ Organization with role assignment.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Membership identifier |
| userId | UUID | FK, UNIQUE(user+org) | Member |
| organizationId | UUID | FK, CASCADE | Organization |
| teamId | UUID | FK, SET NULL | Optional team |
| role | RoleName | default: MEMBER | Access level |

---

### 6. Chat
AI conversation container with branching support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Chat identifier |
| title | TEXT | nullable | Auto-generated title |
| organizationId | UUID | FK, CASCADE | Owning org |
| projectId | UUID | FK, SET NULL | Scoped project |
| userId | UUID | FK, CASCADE | Creator |
| folderId | UUID | FK, SET NULL | Folder organization |
| providerType | ProviderType | nullable | AI provider |
| modelId | TEXT | nullable | Model identifier |
| parentChatId | UUID | FK, SET NULL | Branch parent |
| modelParams | JSONB | nullable | temperature, topP, etc |
| lastMessageAt | TIMESTAMP | nullable | For sorting |
| deletedAt | TIMESTAMP | nullable | Soft delete |

---

### 7. Message
Individual message in a chat conversation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Message identifier |
| chatId | UUID | FK, CASCADE | Parent chat |
| userId | UUID | FK, SET NULL | Sender (null for system) |
| role | TEXT | NOT NULL | user/assistant/system/tool |
| content | TEXT | NOT NULL | Message body |
| model | TEXT | nullable | AI model used |
| tokensIn | INT | nullable | Input token count |
| tokensOut | INT | nullable | Output token count |
| status | MessageStatus | default: COMPLETED | Processing state |
| metadata | JSONB | nullable | Extra data |
| parentMessageId | UUID | nullable | For branching |
| deletedAt | TIMESTAMP | nullable | Soft delete |

---

### 8. Provider
AI service provider configuration per organization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Provider identifier |
| organizationId | UUID | FK, CASCADE | Owning org |
| type | ProviderType | UNIQUE(org+type) | Provider type enum |
| name | TEXT | NOT NULL | Display name |
| apiKey | TEXT | nullable | Encrypted API key |
| baseUrl | TEXT | nullable | API endpoint |
| isActive | BOOLEAN | default: true | Enabled status |
| config | JSONB | nullable | Provider-specific config |

---

### 9. Memory
Persistent AI memory with importance scoring.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Memory identifier |
| content | TEXT | NOT NULL | Memory text |
| summary | TEXT | nullable | Compressed form |
| type | MemoryType | NOT NULL | FACT/PREFERENCE/etc |
| scope | MemoryScope | NOT NULL | PERSONAL/WORKSPACE/etc |
| status | MemoryStatus | default: ACTIVE | Lifecycle state |
| confidence | FLOAT | default: 0.5 | AI confidence score |
| importance | FLOAT | default: 0.5 | Priority weight |
| accessCount | INT | default: 0 | Retrieval frequency |
| expiresAt | TIMESTAMP | nullable | TTL (null=permanent) |

---

### 10. KnowledgeDocument
Ingested documents for RAG (Retrieval-Augmented Generation).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Document identifier |
| title | TEXT | NOT NULL | Document title |
| content | TEXT | NOT NULL | Full extracted text |
| summary | TEXT | nullable | AI summary |
| documentType | DocumentType | NOT NULL | PDF/DOCX/etc |
| status | DocumentStatus | default: PENDING | Processing pipeline state |
| contentHash | TEXT | nullable | SHA-256 for dedup |
| chunkCount | INT | nullable | Number of chunks |
| deletedAt | TIMESTAMP | nullable | Soft delete |

---

## Enum Reference

| Enum | Values |
|------|--------|
| RoleName | SUPER_ADMIN, ADMIN, MANAGER, MEMBER, GUEST |
| PermissionAction | CREATE, READ, UPDATE, DELETE, MANAGE |
| ProviderType | OPENAI, GEMINI, ANTHROPIC, OPENROUTER, NVIDIA_NIM, HUGGING_FACE, MISTRAL, GROQ, DEEPSEEK, COHERE, AZURE_OPENAI, OLLAMA, CUSTOM |
| OAuthProvider | GOOGLE, GITHUB |
| AuditAction | CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_RESET, EMAIL_VERIFIED, ROLE_CHANGE, PERMISSION_CHANGE, API_KEY_CREATED, API_KEY_REVOKED, SETTINGS_CHANGE, EXPORT |
| FeatureFlagType | BOOLEAN, PERCENTAGE, VARIANT |
| NotificationType | INFO, SUCCESS, WARNING, ERROR |
| FileStatus | PENDING, PROCESSING, COMPLETED, FAILED |
| MemoryScope | PERSONAL, WORKSPACE, PROJECT, ORGANIZATION, PINNED |
| MemoryType | FACT, PREFERENCE, DECISION, INSTRUCTION, CONTEXT, SUMMARY, ENTITY, RELATIONSHIP |
| MemoryStatus | ACTIVE, ARCHIVED, EXPIRED, DEPRECATED |
| DocumentType | PDF, DOCX, MARKDOWN, TEXT, CSV, CODE, HTML, WEBPAGE, ARTICLE, NOTE, IMAGE, SPREADSHEET, PRESENTATION |
| DocumentStatus | PENDING, EXTRACTING, CHUNKING, EMBEDDING, INDEXED, FAILED, DUPLICATE |
| CollectionType | KNOWLEDGE_BASE, FOLDER, CATEGORY, TAG_GROUP, SHARED |
| EmbeddingStatus | PENDING, PROCESSING, COMPLETED, FAILED |
| EmbeddingModel | OPENAI_SMALL, OPENAI_LARGE, COHERE, MISTRAL, LOCAL |
| ArtifactType | CODE, IMAGE, DOCUMENT, TABLE, CHART, MARKDOWN, PDF, JSON, CSV, HTML, SVG |
| FolderType | CHAT, FILE, PROJECT |
| MessageStatus | PENDING, STREAMING, COMPLETED, FAILED, STOPPED |
| ReactionType | LIKE, DISLIKE, LOVE, THUMBS_UP, THUMBS_DOWN |

---

## Cascade Rules Summary

| Parent → Child | onDelete |
|---------------|----------|
| User → Session | CASCADE |
| User → OAuthAccount | CASCADE |
| User → Chat | CASCADE |
| User → Message | SET NULL |
| User → Memory | CASCADE |
| Organization → Team | CASCADE |
| Organization → Project | CASCADE |
| Organization → Provider | CASCADE |
| Organization → Chat | CASCADE |
| Project → Workspace | CASCADE |
| Project → Chat | SET NULL |
| Chat → Message | CASCADE |
| Provider → Model | CASCADE |
| Collection → KnowledgeDocument | SET NULL |
| KnowledgeDocument → DocumentChunk | CASCADE |
| DocumentChunk → Embedding | CASCADE |
| Memory → MemoryPermission | CASCADE |
| Folder → Folder (children) | CASCADE |
| Collection → Collection (children) | CASCADE |

---

## JSON Column Types

All JSON columns use PostgreSQL `JSONB` for indexable, queryable storage:

- `Analytics.properties` — Event metadata
- `Workspace.layout` — UI panel configuration
- `Chat.modelParams` — AI parameters (temperature, topP, maxTokens)
- `Message.metadata` — Response metadata, tool calls
- `Provider.config` — Provider-specific settings
- `Model.pricing` / `Model.capabilities` — Structured model info
- `PromptTemplate.variables` — Template variable definitions
- `File.metadata` — File-specific metadata
- `ApiKey.permissions` — Granular permission scopes
- `FeatureFlag.value` — Flag configuration
- `UserSetting.value` / `OrganizationSetting.value` — Settings values
- `Memory.embedding` / `Memory.tags` / `Memory.metadata` — Memory data
- `KnowledgeDocument.tags/categories/keywords/topics` — Document classification
- `DocumentChunk.embedding/metadata` — Chunk vectors
- `Embedding.embedding/metadata` — Vector data
- `SearchIndex.keywords/topics/embedding/metadata` — Search data
