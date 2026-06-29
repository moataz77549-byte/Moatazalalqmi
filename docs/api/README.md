# Moataz AI — API Reference (v1)

Base URL: `https://your-deployment.railway.app/api/v1`

## Authentication

All authenticated endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <session_token_or_api_key>
```

API keys use the `mz_` prefix format.

---

## Endpoints

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Service health check |

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login, receive token |
| POST | `/auth/logout` | Yes | Revoke session |
| POST | `/auth/refresh` | Yes | Refresh token |
| POST | `/auth/forgot-password` | No | Request password reset |
| POST | `/auth/reset-password` | No | Reset password with token |
| POST | `/auth/verify-email` | No | Verify email address |

### AI Gateway

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ai/chat` | Yes | Chat completion |
| POST | `/ai/stream` | Yes | Streaming chat |
| GET | `/ai/models` | Yes | List available models |
| GET | `/ai/providers` | Yes | List configured providers |
| GET | `/ai/health` | Yes | Provider health status |
| GET | `/ai/usage` | Yes | Usage statistics |
| POST | `/ai/embeddings` | Yes | Generate embeddings |

### Chats

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/chats` | Yes | List conversations |
| POST | `/chats` | Yes | Create conversation |
| GET | `/chats/:id` | Yes | Get conversation |
| PATCH | `/chats/:id` | Yes | Update conversation |
| DELETE | `/chats/:id` | Yes | Delete conversation |
| GET | `/chats/:id/messages` | Yes | List messages |
| POST | `/chats/:id/messages` | Yes | Send message |
| POST | `/chats/:id/stream` | Yes | Stream AI response |

### Memory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/memory` | Yes | List memories |
| POST | `/memory` | Yes | Create memory |
| GET | `/memory/:id` | Yes | Get memory |
| PATCH | `/memory/:id` | Yes | Update memory |
| DELETE | `/memory/:id` | Yes | Delete memory |
| POST | `/memory/search` | Yes | Semantic search |
| POST | `/memory/extract` | Yes | Extract facts from text |
| POST | `/memory/summarize` | Yes | Summarize memories |

### Knowledge Base (RAG)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/documents` | Yes | List documents |
| POST | `/documents` | Yes | Upload document |
| POST | `/documents/:id/process` | Yes | Process document |
| POST | `/rag/chat` | Yes | RAG-enhanced chat |
| POST | `/rag/retrieve` | Yes | Retrieve relevant chunks |
| POST | `/embeddings/search` | Yes | Vector search |

### Organizations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/organizations` | Yes | List user's organizations |
| POST | `/organizations` | Yes | Create organization |
| GET | `/organizations/:id` | Yes | Get organization |
| PATCH | `/organizations/:id` | Yes | Update organization |

### Files & Folders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/files` | Yes | List files |
| POST | `/files` | Yes | Upload file |
| GET | `/files/:id` | Yes | Get file |
| DELETE | `/files/:id` | Yes | Delete file |
| GET | `/folders` | Yes | List folders |
| POST | `/folders` | Yes | Create folder |

---

## Response Format

All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

## Rate Limiting

Rate limits are enforced per-user with token bucket algorithm:

| Plan | Limit | Window |
|------|-------|--------|
| Free | 60 req | 60s |
| Pro | 300 req | 60s |
| Enterprise | 1000 req | 60s |

When rate limited, the response includes:
- HTTP 429 status
- `Retry-After` header (seconds)

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad Request — Invalid input |
| 401 | Unauthorized — Missing/invalid token |
| 403 | Forbidden — Insufficient permissions |
| 404 | Not Found |
| 429 | Too Many Requests — Rate limited |
| 500 | Internal Server Error |
