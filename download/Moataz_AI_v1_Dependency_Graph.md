# Moataz AI v1.0 — Dependency Graph
Generated: 2026-06-27 23:07:23

## Core Dependencies

### Frontend
```
next@16.1.3
react@19
react-dom@19
typescript@5
tailwindcss@4
@radix-ui/* (20+ components)
zustand (state management)
@tanstack/react-query (server state)
framer-motion (animations)
react-markdown + remark-gfm + rehype-highlight
remark-math + rehype-katex + katex (math rendering)
lucide-react (icons)
sonner (toast notifications)
```

### Backend
```
@prisma/client@6.19.2
prisma@6.19.2
bcryptjs (password hashing)
zod (validation)
tiktoken (token counting)
```

### Infrastructure
```
redis (caching/queues)
bullmq (job processing)
qdrant (vector database)
docker (containerization)
```

## Module Dependency Graph

```
page.tsx
├── workspace-shell.tsx
│   ├── sidebar.tsx
│   ├── top-bar.tsx
│   ├── right-panel.tsx
│   ├── status-bar.tsx
│   ├── chat-view.tsx
│   │   ├── chat-message.tsx
│   │   ├── chat-input.tsx
│   │   ├── model-selector.tsx
│   │   └── markdown.tsx
│   ├── files-view.tsx
│   ├── notes-view.tsx
│   ├── tasks-view.tsx
│   ├── artifacts-view.tsx
│   ├── memory-view.tsx (Phase 4)
│   ├── knowledge-view.tsx (Phase 4)
│   │   └── document-viewer.tsx (Phase 4)
│   ├── search-view.tsx (Phase 4)
│   ├── settings-view.tsx
│   ├── gateway-view.tsx (Phase 2)
│   ├── command-palette.tsx
│   └── landing.tsx
│       └── auth-dialogs.tsx
├── lib/store.ts (Zustand)
├── lib/api-client.ts
├── lib/i18n.ts
├── lib/ai-gateway/ (Phase 2)
│   ├── gateway.ts
│   ├── smart-router.ts
│   ├── fallback-engine.ts
│   ├── retry-engine.ts
│   ├── prompt-engine.ts
│   ├── prompt-cache.ts
│   ├── health-monitor.ts
│   ├── usage-tracker.ts
│   ├── cost-calculator.ts
│   ├── token-counter.ts
│   ├── key-vault.ts
│   ├── registry.ts
│   └── drivers/ (12 providers)
├── lib/memory/ (Phase 4)
│   └── memory-engine.ts
├── lib/knowledge/ (Phase 4)
│   ├── document-processor.ts
│   ├── rag-engine.ts
│   └── search-engine.ts
├── lib/db.ts (Prisma)
├── lib/auth.ts
├── lib/middleware.ts
├── lib/redis.ts
├── lib/qdrant.ts
├── lib/storage.ts
└── lib/bullmq.ts
```

## Database Models (40+)

### Phase 1 (25 models)
User, Session, OAuthAccount, PasswordResetToken, EmailVerificationToken, Organization, Team, Membership, Role, Permission, Analytics, Project, Workspace, Chat, Message, Provider, Model, PromptTemplate, File, ApiKey, Notification, AuditLog, UserSetting, OrganizationSetting, FeatureFlag, FeatureFlagEvaluation

### Phase 3 (13 models)
Folder, Tag, ChatTag, ChatShare, MessageVersion, MessageReaction, Artifact, Note, Task, QuickAccess, WorkspaceVariable, PromptLibrary, UserPreference

### Phase 4 (7 models)
Memory, MemoryPermission, Collection, KnowledgeDocument, DocumentChunk, Embedding, SearchIndex

## API Endpoints (100+)

### Phase 1 (15 endpoints)
Auth (7), Users (2), Organizations (2), Teams (1), Projects (1), Health (1), API Keys (1)

### Phase 2 (9 endpoints)
AI Chat, AI Stream, AI Embeddings, AI Providers, AI Provider Config, AI Models, AI Health, AI Usage, AI Test

### Phase 3 (29+ endpoints)
Chats (8), Messages (4), Reactions (2), Share (3), Branch (1), Export (1), Streaming (1), Folders (5), Tags (4), Artifacts (5), Notes (5), Tasks (5), Files (5), Projects (7), Search (1), Quick Access (3), Preferences (2), Prompts (4)

### Phase 4 (20 endpoints)
Memory (7), Collections (2), Documents (5), Embeddings (2), RAG (2), Smart Search (1), Index Status (1)
