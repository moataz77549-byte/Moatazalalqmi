# Moataz AI — Provider Matrix

## 12 Supported AI Providers

| # | Provider | Driver Class | API Format | Base URL | Auth Method | Streaming | Vision | Tools | Embeddings | TTS/STT |
|---|----------|-------------|------------|----------|-------------|-----------|--------|-------|------------|---------|
| 1 | OpenAI | OpenAIDriver | OpenAI native | api.openai.com/v1 | Bearer token | ✅ SSE | ✅ | ✅ | ✅ | ✅ |
| 2 | Anthropic | AnthropicDriver | Anthropic Messages | api.anthropic.com/v1 | x-api-key | ✅ SSE | ✅ | ✅ | ❌ | ❌ |
| 3 | Google Gemini | GeminiDriver | Gemini generateContent | generativelanguage.googleapis.com/v1beta | API key (query) | ✅ SSE | ✅ | ✅ | ✅ | ❌ |
| 4 | DeepSeek | DeepSeekDriver | OpenAI-compatible | api.deepseek.com/v1 | Bearer token | ✅ | ❌ | ✅ | ❌ | ❌ |
| 5 | Groq | GroqDriver | OpenAI-compatible | api.groq.com/openai/v1 | Bearer token | ✅ | ❌ | ✅ | ❌ | ❌ |
| 6 | Mistral | MistralDriver | OpenAI-compatible | api.mistral.ai/v1 | Bearer token | ✅ | ❌ | ✅ | ✅ | ❌ |
| 7 | OpenRouter | OpenRouterDriver | OpenAI-compatible | openrouter.ai/api/v1 | Bearer token | ✅ | ✅ | ✅ | ❌ | ❌ |
| 8 | NVIDIA NIM | NvidiaNimDriver | OpenAI-compatible | integrate.api.nvidia.com/v1 | Bearer token | ✅ | ❌ | ✅ | ❌ | ❌ |
| 9 | Hugging Face | HuggingFaceDriver | TGI /v1/chat | api-inference.huggingface.co/models | Bearer token | ✅ | ❌ | ✅ | ✅ | ❌ |
| 10 | Cohere | CohereDriver | Cohere native | api.cohere.com/v1 | Bearer token | ✅ | ❌ | ✅ | ✅ | ❌ |
| 11 | Azure OpenAI | AzureOpenAIDriver | Azure deployment | {endpoint}/openai | api-key header | ✅ | ✅ | ✅ | ✅ | ✅ |
| 12 | Ollama | OllamaDriver | OpenAI-compatible | localhost:11434/v1 | None (local) | ✅ | ✅ (LLaVA) | ✅ | ✅ | ❌ |
| 13 | Custom | CustomDriver | OpenAI-compatible | Configurable | Bearer token | ✅ | varies | ✅ | ✅ | ❌ |

## Model Catalog (40+ Models)

### OpenAI (9 models)
- GPT-4o (128k ctx, vision, tools, $0.0025/0.01 per 1k)
- GPT-4o Mini (128k, vision, $0.00015/0.0006)
- GPT-4 Turbo (128k, vision, $0.01/0.03)
- o1 Preview (128k, reasoning, $0.015/0.06)
- Text Embedding 3 Small (8k, $0.00002/1k)
- Text Embedding 3 Large (8k, $0.00013/1k)
- DALL-E 3 (image gen, $0.04/image)
- Whisper (transcription)
- TTS-1 (speech, $0.015/1k)

### Anthropic (3 models)
- Claude 3.5 Sonnet (200k, vision, tools, $0.003/0.015)
- Claude 3.5 Haiku (200k, vision, tools, $0.0008/0.004)
- Claude 3 Opus (200k, vision, tools, $0.015/0.075)

### Google Gemini (4 models)
- Gemini 1.5 Pro (2M ctx, vision, audio, tools, $0.00125/0.005)
- Gemini 1.5 Flash (1M, vision, audio, $0.000075/0.0003)
- Gemini 1.5 Flash 8B (1M, vision, $0.0000375/0.00015)
- Text Embedding 004 (2k, free)

### DeepSeek (2 models)
- DeepSeek Chat (64k, tools, $0.00014/0.00028)
- DeepSeek Reasoner (64k, reasoning, $0.00055/0.00219)

### Groq (3 models)
- Llama 3.3 70B (128k, tools, $0.00059/0.00079)
- Llama 3.1 8B Instant (128k, tools, $0.00005/0.00008)
- Mixtral 8x7B (32k, tools, $0.00024/0.00024)

### Mistral (3 models)
- Mistral Large (128k, tools, $0.002/0.006)
- Mistral Small (32k, tools, $0.0002/0.0006)
- Mistral Embed (8k, $0.0001/1k)

### OpenRouter (3 models)
- GPT-4o via OpenRouter (128k, vision, $0.005/0.015)
- Claude 3.5 Sonnet via OpenRouter (200k, vision, $0.003/0.015)
- Gemini Flash 1.5 via OpenRouter (1M, vision, $0.000075/0.0003)

### NVIDIA NIM (2 models)
- Llama 3.1 Nemotron 70B (131k, tools, free)
- Llama 3.1 405B (128k, tools, free)

### Hugging Face (2 models)
- Llama 3.3 70B Instruct (131k, $0.00059/0.00079)
- Qwen 2.5 72B (32k, tools, $0.00059/0.00079)

### Cohere (3 models)
- Command R+ (128k, tools, $0.0025/0.01)
- Command R (128k, tools, $0.00015/0.0006)
- Embed English v3 (512, $0.0001/1k)

### Ollama (3 default models + dynamic discovery)
- Llama 3.3 (128k, free, local)
- Qwen 2.5 (32k, free, local)
- LLaVA (4k, vision, free, local)

### Azure OpenAI (2 models)
- GPT-4o (128k, $0.0025/0.01)
- GPT-4o Mini (128k, $0.00015/0.0006)

### Custom (configurable)
- Any OpenAI-compatible endpoint with custom model list
