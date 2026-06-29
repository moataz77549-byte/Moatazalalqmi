import { db } from '@/lib/db';
import { aiGateway } from '@/lib/ai-gateway/gateway';

export interface GlobalSearchInput {
  query: string;
  userId: string;
  organizationId: string;
  projectId?: string;
  limit?: number;
  includeAI?: boolean; // Include AI summaries
}

export interface GlobalSearchResult {
  type: 'chat' | 'message' | 'file' | 'document' | 'note' | 'artifact' | 'project' | 'memory' | 'prompt';
  id: string;
  title: string;
  content: string;
  url?: string;
  score: number;
  summary?: string;
  keywords?: string[];
  topics?: string[];
  language?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

class GlobalSearchEngine {
  async search(input: GlobalSearchInput): Promise<{
    results: GlobalSearchResult[];
    total: number;
    aiSummary?: string;
    keywords?: string[];
    classification?: string;
  }> {
    const limit = input.limit || 20;
    const query = input.query.toLowerCase();
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);

    const results: GlobalSearchResult[] = [];

    // Search chats
    const chats = await db.chat.findMany({
      where: {
        userId: input.userId,
        organizationId: input.organizationId,
        OR: [
          { title: { contains: input.query } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });

    for (const chat of chats) {
      const score = this.calculateScore(input.query, chat.title || '', queryWords);
      if (score > 0) {
        results.push({
          type: 'chat',
          id: chat.id,
          title: chat.title || 'Untitled Chat',
          content: `Chat from ${chat.createdAt.toISOString().split('T')[0]}`,
          score,
          createdAt: chat.createdAt,
          metadata: { isPinned: chat.isPinned, isFavorite: chat.isFavorite },
        });
      }
    }

    // Search messages
    const messages = await db.message.findMany({
      where: {
        chat: { userId: input.userId, organizationId: input.organizationId },
        content: { contains: input.query },
      },
      include: { chat: true },
      take: 15,
      orderBy: { createdAt: 'desc' },
    });

    for (const msg of messages) {
      const score = this.calculateScore(input.query, msg.content, queryWords);
      results.push({
        type: 'message',
        id: msg.id,
        title: `Message in "${msg.chat?.title || 'Untitled'}"`,
        content: msg.content.substring(0, 300) + (msg.content.length > 300 ? '...' : ''),
        score,
        createdAt: msg.createdAt,
        metadata: { chatId: msg.chatId, role: msg.role },
      });
    }

    // Search files
    const files = await db.file.findMany({
      where: {
        userId: input.userId,
        organizationId: input.organizationId,
        OR: [
          { name: { contains: input.query } },
          { originalName: { contains: input.query } },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    for (const file of files) {
      const score = this.calculateScore(input.query, file.name + ' ' + file.originalName, queryWords);
      results.push({
        type: 'file',
        id: file.id,
        title: file.originalName,
        content: `${file.mimeType} • ${this.formatFileSize(file.size)}`,
        score,
        createdAt: file.createdAt,
        metadata: { mimeType: file.mimeType, size: file.size },
      });
    }

    // Search knowledge documents
    const documents = await db.knowledgeDocument.findMany({
      where: {
        userId: input.userId,
        organizationId: input.organizationId,
        OR: [
          { title: { contains: input.query } },
          { content: { contains: input.query } },
          { summary: { contains: input.query } },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    for (const doc of documents) {
      const score = this.calculateScore(input.query, doc.title + ' ' + (doc.summary || '') + ' ' + doc.content, queryWords);
      results.push({
        type: 'document',
        id: doc.id,
        title: doc.title,
        content: (doc.summary || doc.content).substring(0, 300),
        score: score + 0.1, // Boost knowledge base results
        summary: doc.summary || undefined,
        keywords: doc.keywords ? JSON.parse(doc.keywords) : undefined,
        topics: doc.topics ? JSON.parse(doc.topics) : undefined,
        language: doc.language || undefined,
        createdAt: doc.createdAt,
        metadata: { documentType: doc.documentType, status: doc.status },
      });
    }

    // Search notes
    const notes = await db.note.findMany({
      where: {
        userId: input.userId,
        organizationId: input.organizationId,
        OR: [
          { title: { contains: input.query } },
          { content: { contains: input.query } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });

    for (const note of notes) {
      const score = this.calculateScore(input.query, note.title + ' ' + note.content, queryWords);
      results.push({
        type: 'note',
        id: note.id,
        title: note.title,
        content: note.content.substring(0, 300),
        score,
        createdAt: note.createdAt,
        metadata: { isPinned: note.isPinned },
      });
    }

    // Search artifacts
    const artifacts = await db.artifact.findMany({
      where: {
        userId: input.userId,
        organizationId: input.organizationId,
        OR: [
          { title: { contains: input.query } },
          { content: { contains: input.query } },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    for (const artifact of artifacts) {
      const score = this.calculateScore(input.query, artifact.title + ' ' + artifact.content, queryWords);
      results.push({
        type: 'artifact',
        id: artifact.id,
        title: artifact.title,
        content: artifact.content.substring(0, 300),
        score,
        createdAt: artifact.createdAt,
        metadata: { artifactType: artifact.artifactType, language: artifact.language },
      });
    }

    // Search projects
    const projects = await db.project.findMany({
      where: {
        organizationId: input.organizationId,
        OR: [
          { name: { contains: input.query } },
          { description: { contains: input.query } },
        ],
      },
      take: 5,
    });

    for (const project of projects) {
      const score = this.calculateScore(input.query, project.name + ' ' + (project.description || ''), queryWords);
      results.push({
        type: 'project',
        id: project.id,
        title: project.name,
        content: project.description || `Project: ${project.name}`,
        score,
        createdAt: project.createdAt,
        metadata: { slug: project.slug, color: project.color },
      });
    }

    // Search memories
    const memories = await db.memory.findMany({
      where: {
        userId: input.userId,
        organizationId: input.organizationId,
        content: { contains: input.query },
      },
      take: 10,
      orderBy: { importance: 'desc' },
    });

    for (const memory of memories) {
      const score = this.calculateScore(input.query, memory.content, queryWords);
      results.push({
        type: 'memory',
        id: memory.id,
        title: `Memory: ${memory.content.substring(0, 50)}...`,
        content: memory.content,
        score: score + (memory.importance * 0.1),
        createdAt: memory.createdAt,
        metadata: { scope: memory.scope, type: memory.type, importance: memory.importance },
      });
    }

    // Search prompts
    const prompts = await db.promptLibrary.findMany({
      where: {
        userId: input.userId,
        OR: [
          { title: { contains: input.query } },
          { content: { contains: input.query } },
          { description: { contains: input.query } },
        ],
      },
      take: 5,
    });

    for (const prompt of prompts) {
      const score = this.calculateScore(input.query, prompt.title + ' ' + prompt.content, queryWords);
      results.push({
        type: 'prompt',
        id: prompt.id,
        title: prompt.title,
        content: prompt.content.substring(0, 300),
        score,
        createdAt: prompt.createdAt,
        metadata: { category: prompt.category, isFavorite: prompt.isFavorite },
      });
    }

    // Sort by score and limit
    const sortedResults = results.sort((a, b) => b.score - a.score).slice(0, limit);

    // Generate AI summary if requested and there are results
    let aiSummary: string | undefined;
    let keywords: string[] | undefined;
    let classification: string | undefined;

    if (input.includeAI && sortedResults.length > 0) {
      try {
        const summaryResponse = await aiGateway.chat({
          model: 'auto',
          messages: [
            {
              role: 'system',
              content: 'Analyze the search results and provide: 1) A brief summary of what was found, 2) Key keywords, 3) A classification of the search intent. Respond as JSON: {"summary":"...","keywords":["..."],"classification":"..."}',
            },
            {
              role: 'user',
              content: `Query: ${input.query}\n\nResults:\n${sortedResults.map(r => `- [${r.type}] ${r.title}: ${r.content.substring(0, 100)}`).join('\n')}`,
            },
          ],
          temperature: 0.2,
          maxTokens: 300,
          responseFormat: 'json_object',
        }, { userId: input.userId, organizationId: input.organizationId, enableCache: true, enableFallback: true });

        const parsed = JSON.parse(summaryResponse.content);
        aiSummary = parsed.summary;
        keywords = parsed.keywords;
        classification = parsed.classification;
      } catch {}
    }

    return {
      results: sortedResults,
      total: sortedResults.length,
      aiSummary,
      keywords,
      classification,
    };
  }

  private calculateScore(query: string, content: string, queryWords: string[]): number {
    if (!content) return 0;
    const contentLower = content.toLowerCase();
    
    // Exact match boost
    let score = 0;
    if (contentLower.includes(query)) score += 0.5;
    
    // Word matches
    let matches = 0;
    for (const word of queryWords) {
      if (contentLower.includes(word)) matches++;
    }
    score += (matches / Math.max(1, queryWords.length)) * 0.5;
    
    return score;
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export const globalSearchEngine = new GlobalSearchEngine();
