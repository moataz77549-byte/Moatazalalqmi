# Moataz AI v1.0 — Provider Matrix

## 12+1 AI Provider Drivers

| # | Provider | Driver Class | API Format | Streaming | Vision | Tools | Embeddings | TTS/STT | Models |
|---|----------|-------------|------------|-----------|--------|-------|------------|---------|--------|
| 1 | OpenAI | OpenAIDriver | Native | ✅ | ✅ | ✅ | ✅ | ✅ | 9 |
| 2 | Anthropic | AnthropicDriver | Messages | ✅ | ✅ | ✅ | ❌ | ❌ | 3 |
| 3 | Google Gemini | GeminiDriver | generateContent | ✅ | ✅ | ✅ | ✅ | ❌ | 4 |
| 4 | DeepSeek | DeepSeekDriver | OpenAI-compat | ✅ | ❌ | ✅ | ❌ | ❌ | 2 |
| 5 | Groq | GroqDriver | OpenAI-compat | ✅ | ❌ | ✅ | ❌ | ❌ | 3 |
| 6 | Mistral | MistralDriver | OpenAI-compat | ✅ | ❌ | ✅ | ✅ | ❌ | 3 |
| 7 | OpenRouter | OpenRouterDriver | OpenAI-compat | ✅ | ✅ | ✅ | ❌ | ❌ | 3 |
| 8 | NVIDIA NIM | NvidiaNimDriver | OpenAI-compat | ✅ | ❌ | ✅ | ❌ | ❌ | 2 |
| 9 | HuggingFace | HuggingFaceDriver | TGI | ✅ | ❌ | ✅ | ✅ | ❌ | 2 |
| 10 | Cohere | CohereDriver | Native | ✅ | ❌ | ✅ | ✅ | ❌ | 3 |
| 11 | Azure OpenAI | AzureOpenAIDriver | Azure | ✅ | ✅ | ✅ | ✅ | ✅ | 2 |
| 12 | Ollama | OllamaDriver | OpenAI-compat | ✅ | ✅ | ✅ | ✅ | ❌ | 3+ |
| 13 | Custom | CustomDriver | OpenAI-compat | ✅ | varies | ✅ | ✅ | ❌ | config |

## Model Catalog: 40+ Models

### By Provider
- OpenAI: 9 models (GPT-4o, GPT-4o Mini, GPT-4 Turbo, o1 Preview, embeddings, DALL-E 3, Whisper, TTS)
- Anthropic: 3 models (Claude 3.5 Sonnet, Haiku, Opus)
- Gemini: 4 models (1.5 Pro, Flash, Flash 8B, Embedding)
- DeepSeek: 2 models (Chat, Reasoner)
- Groq: 3 models (Llama 3.3 70B, 3.1 8B, Mixtral 8x7B)
- Mistral: 3 models (Large, Small, Embed)
- OpenRouter: 3 models (GPT-4o, Claude, Gemini via OpenRouter)
- NVIDIA NIM: 2 models (Nemotron 70B, Llama 405B)
- HuggingFace: 2 models (Llama 3.3 70B, Qwen 2.5 72B)
- Cohere: 3 models (Command R+, Command R, Embed English)
- Ollama: 3+ models (Llama 3.3, Qwen 2.5, LLaVA — dynamic discovery)
- Azure OpenAI: 2 models (GPT-4o, GPT-4o Mini)

## Gateway Features

| Feature | Status |
|---------|--------|
| Smart Routing | ✅ Multi-factor (cost/latency/quality/balanced) |
| Fallback | ✅ Cross-provider chains |
| Retry | ✅ Exponential backoff with jitter |
| Streaming | ✅ SSE with backpressure |
| Caching | ✅ Redis-backed prompt cache |
| Health Monitor | ✅ Circuit breaker pattern |
| Usage Tracking | ✅ Per-request analytics |
| Cost Calculation | ✅ Per-model pricing |
| Token Counting | ✅ tiktoken + fallback |
| API Key Encryption | ✅ AES-256-GCM |
