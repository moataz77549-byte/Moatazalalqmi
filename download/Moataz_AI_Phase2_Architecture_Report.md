# Moataz AI — Phase 2 Architecture Report
## Enterprise AI Gateway
Generated: 2026-06-27 20:52:53

## Gateway Architecture Overview

The AI Gateway is a centralized orchestration layer that mediates ALL AI provider interactions. No component in the platform communicates with AI providers directly — every request flows through the Gateway.

```
┌──────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                              │
│   Web App  |  Mobile App  |  API Consumers  |  Agents         │
├──────────────────────────────────────────────────────────────┤
│                      API LAYER                                 │
│   /api/v1/ai/chat      /api/v1/ai/stream                     │
│   /api/v1/ai/embeddings  /api/v1/ai/providers                │
│   /api/v1/ai/models    /api/v1/ai/health                     │
│   /api/v1/ai/usage     /api/v1/ai/test                       │
├──────────────────────────────────────────────────────────────┤
│                   AI GATEWAY ORCHESTRATOR                      │
│  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │   Smart    │ │ Fallback │ │  Retry   │ │   Prompt     │  │
│  │  Router    │ │  Engine  │ │  Engine  │ │   Engine     │  │
│  └────────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │   Cache    │ │  Usage   │ │  Cost    │ │    Health    │  │
│  │  Layer     │ │ Tracker  │ │Calculator│ │   Monitor    │  │
│  └────────────┘ └──────────┘ └──────────┘ └──────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                  PROVIDER REGISTRY                             │
│   12 Provider Drivers + Model Registry (40+ models)          │
├──────────────────────────────────────────────────────────────┤
│                  PROVIDER DRIVERS                              │
│  OpenAI | Anthropic | Gemini | DeepSeek | Groq | Mistral     │
│  OpenRouter | NVIDIA NIM | HuggingFace | Cohere | Azure      │
│  Ollama | Custom (OpenAI-compatible)                          │
└──────────────────────────────────────────────────────────────┘
```

## Module Inventory

| Module | File | Purpose |
|--------|------|---------|
| Types | ai-gateway/types.ts | All shared TypeScript types and error classes |
| Token Counter | ai-gateway/token-counter.ts | Universal token counting with tiktoken + fallback |
| Cost Calculator | ai-gateway/cost-calculator.ts | Per-request cost calculation by model pricing |
| Health Monitor | ai-gateway/health-monitor.ts | Provider health tracking with circuit breaker logic |
| Prompt Cache | ai-gateway/prompt-cache.ts | Redis-backed response caching with TTL |
| Retry Engine | ai-gateway/retry-engine.ts | Exponential backoff with jitter for transient failures |
| Usage Tracker | ai-gateway/usage-tracker.ts | Analytics recording and aggregation |
| Smart Router | ai-gateway/smart-router.ts | Multi-factor model selection |
| Fallback Engine | ai-gateway/fallback-engine.ts | Cross-provider fallback chain construction |
| Prompt Engine | ai-gateway/prompt-engine.ts | Context assembly and compression |
| Gateway Orchestrator | ai-gateway/gateway.ts | Main entry point — all requests flow here |
| Provider Registry | ai-gateway/registry.ts | Driver and model registration |
| Key Vault | ai-gateway/key-vault.ts | AES-256-GCM API key encryption |
| Base Driver | ai-gateway/drivers/base-driver.ts | Abstract driver with shared utilities |
| OpenAI-Compatible | ai-gateway/drivers/openai-compatible-driver.ts | Base for OpenAI-API-speaking providers |

## Architectural Decisions

### 1. Provider Abstraction via Driver Interface
Every provider implements a common `ProviderDriver` interface with methods: initialize, validateApiKey, listModels, chat, stream, vision, embeddings, imageGeneration, speechToText, textToSpeech, health, estimateCost, cancel. This abstraction enables:
- Adding new providers without modifying Gateway code
- Smart routing across heterogeneous providers
- Consistent error handling and retry logic

### 2. OpenAI-Compatible Base Driver
8 of 12 providers (DeepSeek, Groq, Mistral, OpenRouter, NVIDIA NIM, Ollama, Custom, and Azure via extension) speak the OpenAI API format. The `OpenAICompatibleDriver` base class eliminates code duplication while allowing provider-specific model catalogs and pricing.

### 3. Smart Router Scoring Algorithm
The router scores candidate models on a weighted formula based on priority:
- **cost priority**: 70% cost, 20% quality, 10% latency
- **latency priority**: 70% latency, 20% cost, 10% quality
- **quality priority**: 70% quality, 15% cost, 15% latency
- **balanced**: 33% each

Bonus points for preferred provider (+20) and preferred models (+15).

### 4. Fallback Chain Construction
When the primary provider fails, the Gateway automatically falls back to alternative models from DIFFERENT providers, scored by capability similarity (vision, tools, JSON, streaming), context window proximity, cost similarity, and health status.

### 5. Encrypted API Key Storage
API keys are encrypted with AES-256-GCM (authenticated encryption) before database storage. The master key is derived via SHA-256 from an environment variable. In production, this should be replaced with AWS KMS or HashiCorp Vault.

### 6. Graceful Degradation
All infrastructure services (Redis, Qdrant, BullMQ) have in-memory fallbacks. The Gateway continues to function even when these services are unavailable, with reduced functionality (no caching, no background jobs).

## Request Flow (Chat Example)

1. Client POST /api/v1/ai/chat with messages + auth token
2. API route validates auth (JWT session OR mz_ API key)
3. Rate limit check (20 req/min for chat)
4. Gateway.chat() called with request + context
5. Prompt Engine assembles system prompt from context sources
6. Prompt Cache checked (skip if temperature > 0.3 or long input)
7. Smart Router selects primary model based on routing context
8. Fallback Engine builds chain of 3 alternatives
9. Retry Engine executes request with exponential backoff
10. On failure, Fallback Engine activates next provider
11. Usage Tracker records: provider, model, tokens, cost, latency, success
12. Response cached (if eligible)
13. Audit log written
14. Response returned to client
