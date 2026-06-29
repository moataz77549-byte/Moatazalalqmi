# Moataz AI — Phase 2 API Summary

## AI Gateway Endpoints

### Chat (Non-Streaming)
| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | /api/v1/ai/chat | Bearer | 20/min | Smart-routed chat completion with fallback |

**Request Body:**
```json
{
  "messages": [{"role": "user", "content": "Hello"}],
  "model": "auto",  // or specific model ID
  "temperature": 0.7,
  "maxTokens": 1000,
  "tools": [...],
  "preferredProvider": "OPENAI",
  "priority": "balanced",
  "context": {
    "systemPrompt": "...",
    "projectContext": "...",
    "memoryContext": "...",
    "knowledgeBaseContext": "..."
  }
}
```

### Streaming Chat (SSE)
| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | /api/v1/ai/stream | Bearer | 10/min | Server-Sent Events streaming chat |

**Response:** `text/event-stream` with `data: {"id":"...","delta":"text","done":false}\n\n`

### Embeddings
| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | /api/v1/ai/embeddings | Bearer | 50/min | Generate text embeddings |

### Provider Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/ai/providers | Bearer | List all providers + models |
| GET | /api/v1/ai/providers/[type] | Bearer | Get provider health + models |
| PUT | /api/v1/ai/providers/[type] | Bearer | Configure provider (API key, base URL) |

### Model Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/ai/models | Bearer | List all models (optional ?provider= filter) |

### Health & Monitoring
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/ai/health | Bearer | All provider health statuses |
| GET | /api/v1/ai/usage | Bearer | Usage analytics with filters |

### Testing
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/ai/test | Bearer | Test provider connection with minimal request |

## Authentication

All AI endpoints require authentication via either:
1. **Session JWT**: `Authorization: Bearer <session-token>`
2. **API Key**: `Authorization: Bearer mz_<api-key>`

API keys are hashed with SHA-256 and stored in the database. They support scoping to organizations and expiration dates.

## Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Chat completion successful"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error description"
}
```
