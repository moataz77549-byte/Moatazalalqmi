# Moataz AI v1.0 — Developer Guide
Generated: 2026-06-27 23:07:23

## Getting Started

### Prerequisites
- Node.js 20+
- Bun (package manager)
- Git

### Local Development

```bash
# Clone repository
git clone <repo-url> moataz-ai
cd moataz-ai

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with local configuration

# Initialize database
bun run db:push

# Start development server
bun run dev
```

### Default Credentials
- Create a new account via the registration page
- Or use the test account: test@moataz.ai / TestPass1

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript 5, Tailwind 4, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Cache**: Redis (with in-memory fallback)
- **Vector DB**: Qdrant (with in-memory fallback)
- **Queue**: BullMQ (with in-memory fallback)
- **Storage**: S3-compatible (with local fallback)

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Entry point
│   ├── layout.tsx         # Root layout
│   └── api/v1/            # REST API (100+ endpoints)
├── components/
│   ├── ui/                # shadcn/ui components
│   └── workspace/         # Application components
├── lib/
│   ├── ai-gateway/        # AI Gateway (Phase 2)
│   ├── memory/            # Memory Engine (Phase 4)
│   ├── knowledge/         # Knowledge Base (Phase 4)
│   ├── store.ts           # Zustand store
│   ├── db.ts              # Prisma client
│   └── ...                # Other utilities
└── prisma/
    └── schema.prisma      # Database schema (40+ models)
```

## Database

### Schema Management
```bash
# Push schema changes to database
bun run db:push

# Generate Prisma client
bun run db:generate

# Create migration
bun run db:migrate

# Reset database
bun run db:reset
```

### Models (40+)
- **Phase 1**: User, Organization, Team, Project, Chat, Message, File, etc.
- **Phase 3**: Folder, Tag, Artifact, Note, Task, QuickAccess, etc.
- **Phase 4**: Memory, Collection, KnowledgeDocument, Embedding, etc.

## AI Gateway

### Using the Gateway
```typescript
import { aiGateway } from '@/lib/ai-gateway/gateway';

// Chat
const response = await aiGateway.chat({
  model: 'auto', // or specific model ID
  messages: [{ role: 'user', content: 'Hello' }],
}, {
  userId: 'user-id',
  organizationId: 'org-id',
});

// Streaming
const stream = aiGateway.stream({
  model: 'auto',
  messages: [...],
  stream: true,
}, { userId, organizationId });

for await (const chunk of stream) {
  console.log(chunk.delta);
}

// Embeddings
const embedding = await aiGateway.embeddings({
  model: 'text-embedding-3-small',
  input: 'Text to embed',
}, { userId, organizationId });
```

### Adding a New Provider
1. Create driver in `src/lib/ai-gateway/drivers/`
2. Extend `BaseDriver` or `OpenAICompatibleDriver`
3. Implement required methods (chat, stream, embeddings, health)
4. Register in `src/lib/ai-gateway/registry.ts`

## Memory Engine

### Using the Memory Engine
```typescript
import { memoryEngine } from '@/lib/memory/memory-engine';

// Create memory
const memory = await memoryEngine.create({
  content: 'User prefers dark mode',
  type: 'PREFERENCE',
  scope: 'PERSONAL',
  organizationId: 'org-id',
  userId: 'user-id',
  importance: 0.8,
});

// Search memories
const results = await memoryEngine.search({
  query: 'user preferences',
  organizationId: 'org-id',
  userId: 'user-id',
  limit: 5,
});

// Get context for chat
const context = await memoryEngine.getContextForChat(
  'user query',
  'user-id',
  'org-id'
);
```

## Knowledge Base

### Processing Documents
```typescript
import { documentProcessor } from '@/lib/knowledge/document-processor';

await documentProcessor.process({
  documentId: 'doc-id',
  content: 'Document text content...',
  title: 'Document Title',
  documentType: 'MARKDOWN',
  organizationId: 'org-id',
  userId: 'user-id',
});
```

### RAG Retrieval
```typescript
import { ragEngine } from '@/lib/knowledge/rag-engine';

const result = await ragEngine.retrieve({
  query: 'search query',
  userId: 'user-id',
  organizationId: 'org-id',
  maxChunks: 5,
  maxMemories: 3,
});

// result.context, result.sources, result.summary
```

## API Development

### Creating a New API Route
```typescript
// src/app/api/v1/resource/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';
import { successResponse, errorResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }
    // Implementation
    return NextResponse.json(successResponse(data));
  } catch (error) {
    return NextResponse.json(errorResponse('Internal error'), { status: 500 });
  }
}
```

### API Conventions
- All routes use `export const dynamic = 'force-dynamic'`
- Authentication via `getAuthUser(request)`
- Standardized responses: `successResponse`, `errorResponse`, `paginatedResponse`
- Pagination via `parsePaginationParams`
- Audit logging for mutations
- Rate limiting on sensitive endpoints

## Frontend Development

### Adding a New View
1. Create component in `src/components/workspace/`
2. Add view type to Zustand store
3. Add navigation item in sidebar
4. Add view rendering in workspace-shell

### Using the Zustand Store
```typescript
import { useAppStore } from '@/lib/store';

function MyComponent() {
  const { activeView, setActiveView, user, theme } = useAppStore();
  // ...
}
```

### API Client
```typescript
import { apiGet, apiPost, apiDelete } from '@/lib/api-client';

const data = await apiGet('/api/v1/chats');
const result = await apiPost('/api/v1/chats', { title: 'New Chat' });
```

## Testing

### Linting
```bash
bun run lint
```

### Manual Testing
- All API endpoints testable via curl
- UI testing via Agent Browser
- Database via Prisma Studio: `bunx prisma studio`

## Deployment
See `Moataz_AI_v1_Deployment_Guide.md` for comprehensive deployment instructions.
