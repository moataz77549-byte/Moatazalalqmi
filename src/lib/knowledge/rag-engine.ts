import { db } from '@/lib/db';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { memoryEngine } from '@/lib/memory/memory-engine';

export interface RAGContext {
  query: string;
  userId: string;
  organizationId: string;
  projectId?: string;
  collectionId?: string;
  maxChunks?: number;
  maxMemories?: number;
  minRelevance?: number;
}

export interface RAGResult {
  context: string;
  sources: Array<{
    type: 'document' | 'memory' | 'chunk';
    id: string;
    title: string;
    content: string;
    score: number;
    citation: string;
  }>;
  summary: string;
}

class RAGEngine {
  async retrieve(input: RAGContext): Promise<RAGResult> {
    const maxChunks = input.maxChunks || 5;
    const maxMemories = input.maxMemories || 3;
    const minRelevance = input.minRelevance || 0.3;

    // Step 1: Generate query embedding
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

    // Step 2: Semantic search across document chunks
    const chunkResults = await this.searchChunks(input, queryEmbedding, maxChunks, minRelevance);
    
    // Step 3: Keyword search (BM25-style) across documents
    const keywordResults = await this.keywordSearch(input, maxChunks);
    
    // Step 4: Merge and re-rank results
    const mergedResults = this.mergeResults(chunkResults, keywordResults, maxChunks);
    
    // Step 5: Retrieve relevant memories
    const memoryResults = await memoryEngine.search({
      query: input.query,
      organizationId: input.organizationId,
      userId: input.userId,
      projectId: input.projectId,
      limit: maxMemories,
      minConfidence: minRelevance,
    });

    // Step 6: Build context string
    const sources: RAGResult['sources'] = [];
    const contextParts: string[] = [];

    // Add document chunks
    for (const result of mergedResults) {
      const chunk = result.chunk;
      const document = result.document;
      const citation = `${document.title} (chunk ${chunk.chunkIndex + 1})`;
      
      sources.push({
        type: 'chunk',
        id: chunk.id,
        title: document.title,
        content: chunk.content,
        score: result.score,
        citation,
      });
      
      contextParts.push(`[Source: ${citation}]\n${chunk.content}`);
    }

    // Add memories
    for (const memResult of memoryResults) {
      const memory = memResult.memory;
      sources.push({
        type: 'memory',
        id: memory.id,
        title: `Memory: ${memory.content.substring(0, 50)}...`,
        content: memory.content,
        score: memResult.score,
        citation: 'User Memory',
      });
      contextParts.push(`[Memory]\n${memory.content}`);
    }

    // Generate summary
    let summary = '';
    if (sources.length > 0) {
      try {
        const summaryResponse = await aiGateway.chat({
          model: 'auto',
          messages: [
            {
              role: 'system',
              content: 'Synthesize the following retrieved context into a brief summary relevant to the user query. Be concise and factual.',
            },
            { role: 'user', content: `Query: ${input.query}\n\nContext:\n${contextParts.join('\n\n')}` },
          ],
          temperature: 0.2,
          maxTokens: 300,
        }, { userId: input.userId, organizationId: input.organizationId, enableCache: true, enableFallback: true });
        summary = summaryResponse.content;
      } catch {}
    }

    return {
      context: contextParts.join('\n\n---\n\n'),
      sources,
      summary,
    };
  }

  private async searchChunks(input: RAGContext, queryEmbedding: number[] | null, limit: number, minRelevance: number) {
    if (!queryEmbedding) return [];

    // Get all chunks with embeddings for this organization
    const where: any = {
      embeddingStatus: 'COMPLETED',
      document: {
        organizationId: input.organizationId,
        userId: input.userId,
        status: 'INDEXED',
      },
    };

    if (input.collectionId) {
      where.document.collectionId = input.collectionId;
    }
    if (input.projectId) {
      where.document.projectId = input.projectId;
    }

    const chunks = await db.documentChunk.findMany({
      where,
      include: { document: true },
      take: 500, // Limit for performance
    });

    const results: Array<{ chunk: any; document: any; score: number }> = [];

    for (const chunk of chunks) {
      if (!chunk.embedding) continue;
      
      try {
        const chunkEmb = JSON.parse(chunk.embedding);
        const similarity = cosineSimilarity(queryEmbedding, chunkEmb);
        
        if (similarity >= minRelevance) {
          results.push({
            chunk,
            document: chunk.document,
            score: similarity,
          });
        }
      } catch {}
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private async keywordSearch(input: RAGContext, limit: number) {
    const queryWords = input.query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return [];

    const where: any = {
      organizationId: input.organizationId,
      userId: input.userId,
      status: 'INDEXED',
    };

    if (input.collectionId) where.collectionId = input.collectionId;
    if (input.projectId) where.projectId = input.projectId;

    const documents = await db.knowledgeDocument.findMany({
      where,
      take: 100,
    });

    const results: Array<{ document: any; score: number }> = [];

    for (const doc of documents) {
      const content = (doc.content || '').toLowerCase();
      let matches = 0;
      for (const word of queryWords) {
        if (content.includes(word)) matches++;
      }
      const score = matches / queryWords.length;
      if (score > 0) {
        results.push({ document: doc, score });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private mergeResults(
    semanticResults: Array<{ chunk: any; document: any; score: number }>,
    keywordResults: Array<{ document: any; score: number }>,
    limit: number
  ) {
    // Deduplicate by document ID, keeping highest score
    const byDocument = new Map<string, { chunk: any; document: any; score: number }>();

    for (const result of semanticResults) {
      const docId = result.document.id;
      const existing = byDocument.get(docId);
      if (!existing || result.score > existing.score) {
        byDocument.set(docId, result);
      }
    }

    // Boost documents that appear in both semantic and keyword results
    for (const kwResult of keywordResults) {
      const docId = kwResult.document.id;
      const existing = byDocument.get(docId);
      if (existing) {
        existing.score += kwResult.score * 0.2; // Boost for appearing in both
      }
    }

    return Array.from(byDocument.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

export const ragEngine = new RAGEngine();
