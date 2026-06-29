// ━━ Core Types ━━

export type ProviderType =
  | 'OPENAI' | 'GEMINI' | 'ANTHROPIC' | 'OPENROUTER'
  | 'NVIDIA_NIM' | 'HUGGING_FACE' | 'MISTRAL' | 'GROQ'
  | 'DEEPSEEK' | 'COHERE' | 'AZURE_OPENAI' | 'OLLAMA' | 'CUSTOM';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'function';
  content: string | ContentPart[];
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'audio'; input_audio: { data: string; format: 'wav' | 'mp3' } };

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  tools?: ToolDefinition[];
  toolChoice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  responseFormat?: 'text' | 'json_object' | 'json_schema';
  jsonSchema?: Record<string, unknown>;
  seed?: number;
  user?: string;
  // Gateway extensions
  preferredProvider?: ProviderType;
  taskType?: TaskType;
  priority?: 'cost' | 'latency' | 'quality' | 'balanced';
}

export type TaskType =
  | 'chat' | 'code' | 'reasoning' | 'vision' | 'audio'
  | 'embedding' | 'image_generation' | 'transcription' | 'summary';

export interface ChatResponse {
  id: string;
  model: string;
  provider: ProviderType;
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: {
    prompt: number;
    completion: number;
    total: number;
    currency: string;
  };
  latency: number; // ms
  providerMetadata?: Record<string, unknown>;
}

export interface StreamChunk {
  id: string;
  delta: string;
  toolCalls?: Partial<ToolCall>[];
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage?: Partial<ChatResponse['usage']>;
  done: boolean;
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  dimensions?: number;
  encodingFormat?: 'float' | 'base64';
  user?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  provider: ProviderType;
  usage: { promptTokens: number; totalTokens: number };
  cost: { total: number; currency: string };
  latency: number;
}

export interface ModelInfo {
  providerId: string;
  providerType: ProviderType;
  externalId: string;
  displayName: string;
  description?: string;
  contextWindow: number;
  maxOutputTokens?: number;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsStreaming: boolean;
  supportsToolCalling: boolean;
  supportsJsonMode: boolean;
  supportsThinking: boolean;
  pricing: {
    inputPer1k: number;
    outputPer1k: number;
    embeddingPer1k?: number;
    imagePer1k?: number;
    currency: string;
  };
  avgLatency?: number;
  status: 'active' | 'deprecated' | 'beta' | 'offline';
  capabilities: string[];
}

export interface ProviderConfig {
  type: ProviderType;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  organizationId?: string;
  isActive: boolean;
  priority: number;
  source?: 'DATABASE' | 'ENVIRONMENT';
  config?: Record<string, unknown>;
}

export type HealthStatusType = 
  | 'CONNECTED' 
  | 'DISABLED' 
  | 'MISSING_API_KEY' 
  | 'INVALID_API_KEY' 
  | 'RATE_LIMITED' 
  | 'UNAVAILABLE' 
  | 'CONNECTION_ERROR' 
  | 'TIMEOUT' 
  | 'UNKNOWN';

export interface HealthStatus {
  provider: ProviderType;
  status: HealthStatusType;
  latency: number;
  lastChecked: Date;
  errorRate: number;
  consecutiveErrors: number;
  quotaRemaining?: number;
  quotaLimit?: number;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
}

export interface UsageRecord {
  userId: string;
  organizationId?: string;
  provider: ProviderType;
  model: string;
  taskType: TaskType;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latency: number;
  streamingDuration?: number;
  success: boolean;
  errorMessage?: string;
  retries: number;
  fallbacks: number;
  timestamp: Date;
}

export interface ProviderDriver {
  type: ProviderType;
  initialize(config: ProviderConfig): Promise<void>;
  validateApiKey(): Promise<boolean>;
  listModels(): Promise<ModelInfo[]>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown>;
  vision?(request: ChatRequest): Promise<ChatResponse>;
  embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  imageGeneration?(prompt: string, options?: ImageGenOptions): Promise<{ url: string; cost: number }>;
  speechToText?(audio: Buffer, options?: { language?: string }): Promise<{ text: string; cost: number }>;
  textToSpeech?(text: string, options?: { voice?: string; speed?: number }): Promise<{ audio: Buffer; cost: number }>;
  health(): Promise<HealthStatus>;
  estimateCost(request: ChatRequest): Promise<{ prompt: number; completion: number; total: number }>;
  cancel?(requestId: string): Promise<void>;
}

export interface ImageGenOptions {
  model?: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'natural' | 'vivid';
  n?: number;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider: ProviderType,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class GatewayError extends Error {
  constructor(message: string, public code: string, public cause?: Error) {
    super(message);
    this.name = 'GatewayError';
  }
}
