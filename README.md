# Moataz AI — Enterprise AI Operating System

> Version 1.0.0 Release Candidate

Moataz AI is a production-grade Enterprise AI Operating System that unifies 13+ AI providers behind an intelligent gateway with persistent memory, knowledge management, and enterprise-grade security.

## Architecture

```
moataz-ai/
├── src/                    # Application source
│   ├── app/               # Next.js App Router (pages + API)
│   │   ├── api/v1/        # Versioned REST API
│   │   └── ...            # Frontend pages
│   ├── components/        # React components
│   │   ├── ui/            # Shared UI primitives (shadcn)
│   │   └── workspace/     # Workspace feature components
│   ├── hooks/             # Custom React hooks
│   └── lib/               # Core libraries
│       ├── ai-gateway/    # Multi-provider AI gateway
│       ├── knowledge/     # RAG & document processing
│       └── memory/        # Persistent memory engine
├── prisma/                # Database schema & migrations
├── docs/                  # Documentation
│   ├── api/               # API documentation
│   ├── audit/             # Audit reports
│   └── guides/            # User & developer guides
├── infra/                 # Infrastructure configs
├── scripts/               # Build & deploy scripts
├── tests/                 # Test suites
├── monitoring/            # Observability configs
└── .github/               # CI/CD workflows
```

## Key Features

- **AI Gateway**: 13+ provider drivers (OpenAI, Anthropic, Gemini, DeepSeek, Groq, Mistral, etc.) with smart routing, cascading failover, and cost tracking
- **Persistent Memory**: Context-aware memory engine with scoping (personal, workspace, project, organization)
- **Knowledge Base**: RAG pipeline with document processing, embeddings, and semantic search
- **Enterprise Security**: RBAC, session-based auth, API keys, rate limiting, prompt injection defense
- **Multi-tenant**: Organizations, teams, projects with role-based access control
- **Production Ready**: Docker, Railway, health checks, monitoring, CI/CD

## Quick Start

```bash
# Install dependencies
bun install

# Setup database
bun run db:push

# Start development server
bun run dev
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite/PostgreSQL connection |
| `JWT_SECRET` | Yes (prod) | Session signing secret |
| `REDIS_URL` | No | Redis for caching |
| `QDRANT_URL` | No | Vector store for RAG |

## Production Deployment

### Railway (recommended)

```bash
# Deploy with Railway CLI
railway up
```

### Docker

```bash
docker compose up -d
```

### Manual

```bash
bun install --production
bun run build
bun run start
```

## API Overview

All APIs are versioned under `/api/v1/`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Health check |
| `POST /api/v1/auth/login` | Authentication |
| `POST /api/v1/ai/chat` | AI chat completion |
| `POST /api/v1/ai/stream` | Streaming chat |
| `GET /api/v1/ai/models` | List available models |
| `POST /api/v1/memory/search` | Memory search |
| `POST /api/v1/rag/chat` | RAG-enhanced chat |

## Security

- **Authentication**: Session tokens + API keys (`mz_` prefix)
- **Authorization**: Role-based (SUPER_ADMIN, ADMIN, MANAGER, MEMBER, GUEST)
- **Rate Limiting**: Token bucket with tiered plans
- **Prompt Injection**: Multi-pattern detection and sanitization
- **Headers**: HSTS, X-Frame-Options, CSP

## Testing

```bash
bun test                        # All tests
bun test tests/prompt-injection.test.ts  # Security tests
bun test tests/smart-router-failover.test.ts  # Failover tests
```

## License

Proprietary — Moataz AI Team © 2026
