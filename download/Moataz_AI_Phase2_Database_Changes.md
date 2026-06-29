# Moataz AI — Phase 2 Database Changes

## No Schema Changes Required

Phase 2 leverages the existing Prisma schema from Phase 1. The following models are used:

### Existing Models Used by AI Gateway

| Model | Usage |
|-------|-------|
| Provider | Stores per-organization provider configurations (API keys, base URLs) |
| Model | Stores per-provider model catalog (synced from driver.listModels()) |
| ApiKey | Stores user/org API keys for platform access (Gateway auth) |
| Analytics | Stores AI usage records for billing and analytics |
| AuditLog | Records all AI provider actions for compliance |
| Chat | Stores chat conversations |
| Message | Stores individual chat messages |

### Provider Model Fields (already in schema)
- `id`, `organizationId`, `type` (ProviderType enum), `name`
- `apiKey` (encrypted with AES-256-GCM via key-vault.ts)
- `baseUrl`, `isActive`, `config` (JSON), timestamps

### Model Model Fields (already in schema)
- `id`, `providerId`, `externalId`, `name`, `description`
- `contextWindow`, `isActive`, `pricing` (JSON), `capabilities` (JSON)

### Analytics Model for Usage Tracking
Each AI request records an analytics event:
```json
{
  "organizationId": "...",
  "event": "ai_usage",
  "properties": {
    "userId": "...",
    "provider": "OPENAI",
    "model": "gpt-4o",
    "taskType": "chat",
    "promptTokens": 150,
    "completionTokens": 80,
    "totalTokens": 230,
    "cost": 0.001025,
    "latency": 850,
    "success": true,
    "retries": 0,
    "fallbacks": 0
  }
}
```

## Indexes (already present)

- Provider: organizationId, type
- Model: providerId, externalId (unique)
- ApiKey: userId, keyHash (unique), keyPrefix
- Analytics: organizationId, event, createdAt
- AuditLog: userId, organizationId, action, createdAt
