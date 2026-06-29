import { db } from '@/lib/db';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { MemoryScope, MemoryType, MemoryStatus } from '@prisma/client';

export interface MemoryCreationInput {
  content: string;
  type?: MemoryType;
  scope: MemoryScope;
  organizationId: string;
  userId: string;
  projectId?: string;
  chatId?: string;
  importance?: number;
  confidence?: number;
  expiresAt?: Date;
  tags?: string[];
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface MemorySearchInput {
  query: string;
  organizationId: string;
  userId: string;
  projectId?: string;
  scope?: MemoryScope | MemoryScope[];
  types?: MemoryType[];
  minConfidence?: number;
  minImportance?: number;
  limit?: number;
  includeExpired?: boolean;
}

export interface MemorySearchResult {
  memory: any;
  score: number;
  reason: string;
}

class MemoryEngine {
  // Create a new memory with automatic embedding generation
  async create(input: MemoryCreationInput) {
    // Generate embedding for the memory content
    let embedding: number[] | null = null;
    try {
      const embResponse = await aiGateway.embeddings({
        model: 'text-embedding-3-small',
        input: input.content,
      }, { userId: input.userId, organizationId: input.organizationId });
      if (embResponse.embeddings.length > 0) {
        embedding = embResponse.embeddings[0];
      }
    } catch (error) {
      console.warn('Failed to generate memory embedding:', error);
    }

    const memory = await db.memory.create({
      data: {
        content: input.content,
        type: input.type || 'FACT',
        scope: input.scope,
        organizationId: input.organizationId,
        userId: input.userId,
        projectId: input.projectId || null,
        chatId: input.chatId || null,
        importance: input.importance || 0.5,
        confidence: input.confidence || 0.5,
        expiresAt: input.expiresAt || null,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        source: input.source || 'manual',
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        embedding: embedding ? JSON.stringify(embedding) : null,
        embeddingModel: embedding ? 'OPENAI_SMALL' : null,
      },
    });

    return memory;
  }

  // Search memories using semantic + keyword matching
  async search(input: MemorySearchInput): Promise<MemorySearchResult[]> {
    const limit = input.limit || 10;
    const minConfidence = input.minConfidence || 0.3;
    const minImportance = input.minImportance || 0.0;

    // Build where clause
    const where: any = {
      organizationId: input.organizationId,
      status: input.includeExpired ? undefined : MemoryStatus.ACTIVE,
      confidence: { gte: minConfidence },
      importance: { gte: minImportance },
    };

    // Scope filtering: personal memories for user, plus workspace/org/project scope
    if (input.scope) {
      const scopes = Array.isArray(input.scope) ? input.scope : [input.scope];
      where.scope = { in: scopes };
    } else {
      // Default: personal + workspace + project + org (if user has access)
      where.OR = [
        { scope: MemoryScope.PERSONAL, userId: input.userId },
        { scope: MemoryScope.WORKSPACE, userId: input.userId },
        { scope: MemoryScope.PROJECT, projectId: input.projectId || undefined },
        { scope: MemoryScope.ORGANIZATION },
        { scope: MemoryScope.PINNED, userId: input.userId },
      ];
    }

    if (input.projectId) {
      where.OR = [
        { projectId: input.projectId },
        { scope: MemoryScope.PERSONAL, userId: input.userId },
        { scope: MemoryScope.ORGANIZATION },
      ];
    }

    if (input.types?.length) {
      where.type = { in: input.types };
    }

    // Get candidate memories from DB
    const memories = await db.memory.findMany({
      where,
      orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
      take: limit * 3, // Get more candidates for re-ranking
    });

    if (memories.length === 0) return [];

    // Try semantic search with embeddings
    let queryEmbedding: number[] | null = null;
    try {
      const embResponse = await aiGateway.embeddings({
        model: 'text-embedding-3-small',
        input: input.query,
      }, { userId: input.userId, organizationId: input.organizationId });
      if (embResponse.embeddings.length > 0) {
        queryEmbedding = embResponse.embeddings[0];
      }
    } catch {}

    // Score and rank memories
    const results: MemorySearchResult[] = memories.map(memory => {
      let score = 0;
      const reasons: string[] = [];

      // Semantic similarity (if embeddings available)
      if (queryEmbedding && memory.embedding) {
        try {
          const memEmb = JSON.parse(memory.embedding);
          const similarity = cosineSimilarity(queryEmbedding, memEmb);
          score += similarity * 0.6;
          if (similarity > 0.7) reasons.push('high semantic similarity');
        } catch {}
      }

      // Keyword matching
      const queryLower = input.query.toLowerCase();
      const contentLower = memory.content.toLowerCase();
      const keywordScore = this.calculateKeywordScore(queryLower, contentLower);
      score += keywordScore * 0.25;
      if (keywordScore > 0.5) reasons.push('keyword match');

      // Importance boost
      score += memory.importance * 0.1;
      if (memory.importance > 0.7) reasons.push('high importance');

      // Confidence boost
      score += memory.confidence * 0.05;

      // Recency boost (newer = slightly higher)
      const ageDays = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 0.05 - (ageDays / 365) * 0.05);
      score += recencyBoost;

      // Pinned boost
      if (memory.scope === MemoryScope.PINNED) {
        score += 0.1;
        reasons.push('pinned');
      }

      return {
        memory,
        score,
        reason: reasons.join(', ') || 'relevance',
      };
    });

    // Filter and sort
    const filtered = results
      .filter(r => r.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Update access counts for retrieved memories
    await Promise.all(filtered.map(r =>
      db.memory.update({
        where: { id: r.memory.id },
        data: {
          accessCount: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      }).catch(() => null)
    ));

    return filtered;
  }

  // Generate a summary of multiple memories (compression)
  async summarize(memoryIds: string[], userId: string, organizationId: string): Promise<string> {
    const memories = await db.memory.findMany({
      where: { id: { in: memoryIds }, userId, organizationId },
    });

    if (memories.length === 0) return '';

    const combinedContent = memories.map(m => `- ${m.content}`).join('\n');
    
    try {
      const response = await aiGateway.chat({
        model: 'auto',
        messages: [
          {
            role: 'system',
            content: 'You are a memory compression assistant. Summarize the following memories into a concise, information-dense summary. Preserve key facts, decisions, and preferences. Remove redundancy.',
          },
          { role: 'user', content: combinedContent },
        ],
        temperature: 0.3,
        maxTokens: 500,
      }, { userId, organizationId, enableCache: false, enableFallback: true });

      return response.content;
    } catch (error) {
      console.error('Memory summarization failed:', error);
      return combinedContent;
    }
  }

  // Automatically extract memories from a conversation
  async extractFromConversation(chatId: string, userId: string, organizationId: string) {
    const messages = await db.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });

    if (messages.length < 4) return []; // Need at least a few messages

    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    try {
      const response = await aiGateway.chat({
        model: 'auto',
        messages: [
          {
            role: 'system',
            content: `You are a memory extraction assistant. Analyze the conversation and extract important memories that would be valuable to remember for future interactions. 

For each memory, provide:
- content: The memory text (factual, concise)
- type: One of FACT, PREFERENCE, DECISION, INSTRUCTION, CONTEXT, ENTITY
- importance: 0.0 to 1.0 (how important is this to remember)
- confidence: 0.0 to 1.0 (how confident are you this is worth remembering)

Only extract genuinely useful memories. Skip trivial information.

Respond as a JSON array:
[{"content":"...","type":"FACT","importance":0.8,"confidence":0.9}]`,
          },
          { role: 'user', content: conversationText },
        ],
        temperature: 0.2,
        maxTokens: 1000,
        responseFormat: 'json_object',
      }, { userId, organizationId, enableCache: false, enableFallback: true });

      // Parse extracted memories
      let extracted: any[] = [];
      try {
        const parsed = JSON.parse(response.content);
        extracted = Array.isArray(parsed) ? parsed : (parsed.memories || []);
      } catch {
        return [];
      }

      // Create memory records
      const created = [];
      for (const mem of extracted) {
        if (!mem.content || mem.content.length < 5) continue;
        
        const memory = await this.create({
          content: mem.content,
          type: mem.type as MemoryType,
          scope: MemoryScope.PERSONAL,
          organizationId,
          userId,
          chatId,
          importance: Math.min(1, Math.max(0, mem.importance || 0.5)),
          confidence: Math.min(1, Math.max(0, mem.confidence || 0.5)),
          source: 'auto-extracted',
          metadata: { extractedFrom: chatId },
        });
        created.push(memory);
      }

      return created;
    } catch (error) {
      console.error('Memory extraction failed:', error);
      return [];
    }
  }

  // Expire memories that have passed their expiration date
  async expireMemories() {
    const now = new Date();
    const result = await db.memory.updateMany({
      where: {
        expiresAt: { lt: now },
        status: MemoryStatus.ACTIVE,
      },
      data: {
        status: MemoryStatus.EXPIRED,
        deprecatedAt: now,
      },
    });
    return result.count;
  }

  // Deprecate a memory (soft delete with reason)
  async deprecate(memoryId: string, reason?: string) {
    return db.memory.update({
      where: { id: memoryId },
      data: {
        status: MemoryStatus.DEPRECATED,
        deprecatedAt: new Date(),
        metadata: reason ? JSON.stringify({ deprecationReason: reason }) : undefined,
      },
    });
  }

  // Create a new version of a memory (for editing)
  async createVersion(memoryId: string, newContent: string) {
    const original = await db.memory.findUnique({ where: { id: memoryId } });
    if (!original) throw new Error('Memory not found');

    return db.memory.update({
      where: { id: memoryId },
      data: {
        content: newContent,
        version: { increment: 1 },
        parentMemoryId: memoryId, // Self-reference for version tracking
      },
    });
  }

  // Set memory permissions
  async setPermission(memoryId: string, userId: string, access: 'read' | 'write' | 'admin') {
    return db.memoryPermission.upsert({
      where: { memoryId_userId: { memoryId, userId } },
      create: { memoryId, userId, access },
      update: { access },
    });
  }

  // Get context for AI interaction (the key integration point)
  async getContextForChat(query: string, userId: string, organizationId: string, projectId?: string) {
    const memories = await this.search({
      query,
      organizationId,
      userId,
      projectId,
      limit: 5,
      minConfidence: 0.4,
    });

    if (memories.length === 0) return '';

    const memoryText = memories
      .map(m => `- ${m.memory.content} (importance: ${m.memory.importance.toFixed(2)})`)
      .join('\n');

    return `The following are relevant memories from previous interactions:\n${memoryText}`;
  }

  private calculateKeywordScore(query: string, content: string): number {
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return 0;

    let matches = 0;
    for (const word of queryWords) {
      if (content.includes(word)) matches++;
    }

    return matches / queryWords.length;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

export const memoryEngine = new MemoryEngine();
