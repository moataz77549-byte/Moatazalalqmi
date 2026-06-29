# Moataz AI — Phase 2 Migration Guide

## Overview
Phase 2 adds the Enterprise AI Gateway layer ON TOP of the existing Phase 1 foundation. No Phase 1 features were removed or broken.

## What Changed

### New Files Added
- 14 files in `/src/lib/ai-gateway/` (core gateway modules)
- 12 files in `/src/lib/ai-gateway/drivers/` (provider drivers)
- 9 API route files in `/src/app/api/v1/ai/`

### Modified Files
- `/src/lib/middleware.ts` — Added API key authentication (mz_ prefix)
- `/src/lib/store.ts` — Added 'gateway' to Tab type
- `/src/lib/i18n.ts` — Added gateway translations
- `/src/app/page.tsx` — Added AI Gateway tab with 5 sub-views

### Database Changes
**None required.** Phase 2 uses existing Prisma models (Provider, Model, ApiKey, Analytics, AuditLog).

## Environment Variables

Add these to your `.env` file for Phase 2:

```env
# AI Gateway
ENCRYPTION_MASTER_KEY=your-32-byte-master-key-change-in-production

# Provider API Keys (optional — can be configured via UI)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
OPENROUTER_API_KEY=
NVIDIA_NIM_API_KEY=
HUGGINGFACE_API_KEY=
COHERE_API_KEY=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
OLLAMA_BASE_URL=http://localhost:11434
```

## Deployment Steps

1. **Install dependencies** (already done):
   ```bash
   bun install
   ```

2. **Run database push** (no schema changes, but ensures client is up to date):
   ```bash
   bun run db:push
   ```

3. **Set environment variables** (see above)

4. **Start the development server**:
   ```bash
   bun run dev
   ```

5. **Verify the AI Gateway**:
   - Login to the application
   - Click "AI Gateway" in the sidebar
   - Verify 12 providers appear in the health grid
   - Verify 40+ models appear in the models tab

## API Migration

### Before (Phase 1)
No AI endpoints existed. All AI features were stubs.

### After (Phase 2)
9 new AI endpoints under `/api/v1/ai/`:
- POST /chat — Non-streaming chat
- POST /stream — SSE streaming chat
- POST /embeddings — Text embeddings
- GET /providers — List providers
- GET/PUT /providers/[type] — Provider management
- GET /models — List models
- GET /health — Provider health
- GET /usage — Usage analytics
- POST /test — Connection testing

## Backward Compatibility

✅ All Phase 1 endpoints remain unchanged
✅ All Phase 1 frontend views remain functional
✅ No database migrations required
✅ No breaking changes to existing APIs

## Configuration

### Adding a Provider via API
```bash
curl -X PUT http://localhost:3000/api/v1/ai/providers/OPENAI \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "<org-id>",
    "name": "OpenAI Production",
    "apiKey": "sk-...",
    "baseUrl": "https://api.openai.com/v1"
  }'
```

### Testing a Provider
```bash
curl -X POST http://localhost:3000/api/v1/ai/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "OPENAI",
    "model": "gpt-4o-mini"
  }'
```
