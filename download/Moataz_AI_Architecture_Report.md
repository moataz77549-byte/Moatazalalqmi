# Moataz AI — Phase 1 Architecture Report
Generated: 2026-06-26 23:56:48

## System Architecture

Moataz AI follows a **Modular Monolith** architecture with Clean Architecture principles, designed to evolve into microservices as the platform scales.

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                      │
│  Next.js 16 App Router + React + Tailwind + shadcn/ui   │
├─────────────────────────────────────────────────────────┤
│                      API LAYER                            │
│  REST API v1  |  OpenAPI/Swagger  |  Rate Limiting       │
├─────────────────────────────────────────────────────────┤
│                   APPLICATION LAYER                       │
│  Auth Service  |  User Service  |  Organization Service   │
│  Project Service  |  Chat Service  |  File Service        │
│  API Key Service  |  Audit Service  |  Feature Flags      │
├─────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE LAYER                    │
│  Prisma ORM  |  Redis Cache  |  BullMQ Queues            │
│  Qdrant Vector DB  |  S3 Storage  |  OpenTelemetry       │
├─────────────────────────────────────────────────────────┤
│                   DATA LAYER                              │
│  PostgreSQL/SQLite  |  Qdrant  |  Redis  |  S3            │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Justification |
|----------|--------|---------------|
| Architecture Style | Modular Monolith | Enables independent module development while maintaining deployment simplicity; can be split into microservices later |
| API Style | REST with versioning | Simplicity, cacheability, and broad tooling support; versioning ensures backward compatibility |
| Authentication | JWT + Refresh Tokens | Stateless authentication with secure token rotation; supports OAuth providers |
| Database | PostgreSQL (SQLite dev) | Production-grade RDBMS with JSON support; SQLite for development simplicity |
| ORM | Prisma | Type-safe database access, migrations, and schema management |
| Caching | Redis | Industry-standard in-memory cache with pub/sub for real-time features |
| Vector DB | Qdrant | Purpose-built for high-performance semantic search and RAG |
| Queue | BullMQ | Redis-backed job queue with retry, delay, and priority support |
| Frontend | Next.js 16 App Router | Server components, streaming, and optimal performance |
| UI Library | shadcn/ui + Radix | Accessible, composable, and customizable component system |

### Security Architecture

- **Zero Trust**: Every request authenticated and authorized
- **Defense in Depth**: Multiple security layers (network, application, data)
- **Password Security**: bcrypt with 12 salt rounds
- **Session Management**: JWT tokens with refresh rotation
- **Rate Limiting**: Per-IP and per-user rate limits on sensitive endpoints
- **Audit Logging**: Immutable audit trail for all security-relevant events
- **Input Validation**: Zod schema validation on all API inputs
- **CORS**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet-style headers for web security

### Design Patterns Applied

| Pattern | Application |
|---------|-------------|
| Repository Pattern | Database access through Prisma client abstraction |
| Service Layer Pattern | Business logic isolated in service modules |
| CQRS | Read/write separation for chat and analytics |
| Event-Driven | Audit logs and notifications triggered by domain events |
| API-First | Every feature exposed via versioned REST API |
| Feature Flags | Progressive feature rollout with boolean/percentage flags |
