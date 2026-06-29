import { db } from '@/lib/db';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import crypto from 'crypto';
import { DocumentType, DocumentStatus } from '@prisma/client';

export interface ProcessDocumentInput {
  documentId: string;
  content: string;
  title: string;
  documentType: DocumentType;
  organizationId: string;
  userId: string;
  sourceUrl?: string;
  fileId?: string;
}

class DocumentProcessor {
  async process(input: ProcessDocumentInput) {
    const { documentId, content, title, documentType, organizationId, userId } = input;

    // Update status to extracting
    await db.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: DocumentStatus.EXTRACTING },
    });

    try {
      // Step 1: Compute content hash for deduplication
      const contentHash = crypto.createHash('sha256').update(content).digest('hex');

      // Check for duplicates
      const existing = await db.knowledgeDocument.findFirst({
        where: { contentHash, organizationId, id: { not: documentId } },
      });

      if (existing) {
        await db.knowledgeDocument.update({
          where: { id: documentId },
          data: {
            status: DocumentStatus.DUPLICATE,
            duplicateOfId: existing.id,
            contentHash,
            processedAt: new Date(),
          },
        });
        return { status: 'duplicate', duplicateOf: existing.id };
      }

      // Step 2: Extract metadata
      const wordCount = content.split(/\s+/).length;
      const charCount = content.length;
      const language = this.detectLanguage(content);
      const keywords = this.extractKeywords(content);
      const topics = this.detectTopics(content);

      // Update status to chunking
      await db.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: DocumentStatus.CHUNKING },
      });

      // Step 3: Chunk the document
      const chunks = this.chunkText(content, 1000, 200); // 1000 char chunks with 200 overlap
      const chunkRecords = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkRecord = await db.documentChunk.create({
          data: {
            documentId,
            content: chunk.text,
            chunkIndex: i,
            charCount: chunk.text.length,
            tokenCount: Math.ceil(chunk.text.length / 4),
            startPosition: chunk.start,
            endPosition: chunk.end,
            metadata: JSON.stringify({ chunkIndex: i, totalChunks: chunks.length }),
          },
        });
        chunkRecords.push(chunkRecord);
      }

      // Step 4: Generate AI summary
      let summary: string | null = null;
      try {
        const summaryResponse = await aiGateway.chat({
          model: 'auto',
          messages: [
            {
              role: 'system',
              content: 'Summarize the following document in 2-3 concise paragraphs. Capture key points, main arguments, and important conclusions.',
            },
            { role: 'user', content: content.substring(0, 8000) }, // Limit to avoid token overflow
          ],
          temperature: 0.3,
          maxTokens: 300,
        }, { userId, organizationId, enableCache: true, enableFallback: true });
        summary = summaryResponse.content;
      } catch (error) {
        console.warn('Summary generation failed:', error);
      }

      // Update status to embedding
      await db.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: DocumentStatus.EMBEDDING },
      });

      // Step 5: Generate embeddings for each chunk
      let embeddedCount = 0;
      for (const chunk of chunkRecords) {
        try {
          const embResponse = await aiGateway.embeddings({
            model: 'text-embedding-3-small',
            input: chunk.content,
          }, { userId, organizationId });

          if (embResponse.embeddings.length > 0) {
            const embedding = embResponse.embeddings[0];
            await db.documentChunk.update({
              where: { id: chunk.id },
              data: {
                embedding: JSON.stringify(embedding),
                embeddingModel: 'OPENAI_SMALL',
                embeddingStatus: 'COMPLETED',
              },
            });

            // Store embedding record
            await db.embedding.create({
              data: {
                organizationId,
                userId,
                documentId,
                chunkId: chunk.id,
                embedding: JSON.stringify(embedding),
                embeddingModel: 'OPENAI_SMALL',
                dimensions: embedding.length,
                textPreview: chunk.content.substring(0, 200),
                status: 'COMPLETED',
              },
            });
            embeddedCount++;
          }
        } catch (error) {
          console.warn(`Embedding failed for chunk ${chunk.id}:`, error);
          await db.documentChunk.update({
            where: { id: chunk.id },
            data: { embeddingStatus: 'FAILED' },
          });
        }
      }

      // Step 6: Mark as indexed
      await db.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.INDEXED,
          contentHash,
          wordCount,
          charCount,
          chunkCount: chunkRecords.length,
          language,
          keywords: JSON.stringify(keywords),
          topics: JSON.stringify(topics),
          summary,
          processedAt: new Date(),
          indexedAt: new Date(),
        },
      });

      // Step 7: Update search index
      await db.searchIndex.create({
        data: {
          organizationId,
          userId,
          itemType: 'document',
          itemId: documentId,
          title,
          content: content.substring(0, 5000),
          summary,
          keywords: JSON.stringify(keywords),
          topics: JSON.stringify(topics),
          language,
          metadata: JSON.stringify({ documentType, chunkCount: chunkRecords.length }),
        },
      });

      return {
        status: 'indexed',
        chunkCount: chunkRecords.length,
        embeddedCount,
        summary,
        keywords,
        topics,
        language,
      };
    } catch (error) {
      await db.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.FAILED,
          processingError: (error as Error).message,
          processedAt: new Date(),
        },
      });
      throw error;
    }
  }

  // Text chunking with overlap
  private chunkText(text: string, chunkSize: number, overlap: number): Array<{ text: string; start: number; end: number }> {
    const chunks: Array<{ text: string; start: number; end: number }> = [];
    
    if (text.length <= chunkSize) {
      return [{ text, start: 0, end: text.length }];
    }

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunkText = text.substring(start, end);

      // Try to break at sentence or paragraph boundary
      if (end < text.length) {
        const lastPeriod = chunkText.lastIndexOf('. ');
        const lastNewline = chunkText.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);
        if (breakPoint > chunkSize * 0.5) {
          chunkText = chunkText.substring(0, breakPoint + 1);
        }
      }

      chunks.push({ text: chunkText.trim(), start, end: start + chunkText.length });
      start += chunkText.length - overlap;
      if (start >= text.length) break;
    }

    return chunks;
  }

  // Simple language detection
  private detectLanguage(text: string): string {
    const lower = text.toLowerCase();
    
    // Arabic characters
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    // Chinese characters
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    // Japanese (Hiragana, Katakana)
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    // Korean
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    // Cyrillic (Russian)
    if (/[\u0400-\u04FF]/.test(text)) return 'ru';
    
    // Common English words
    const englishWords = [' the ', ' and ', ' is ', ' are ', ' was ', ' were ', ' to ', ' of ', ' in ', ' for '];
    const englishCount = englishWords.filter(w => lower.includes(w)).length;
    if (englishCount >= 3) return 'en';
    
    // Common Spanish
    const spanishWords = [' el ', ' la ', ' los ', ' las ', ' y ', ' es ', ' son ', ' de '];
    const spanishCount = spanishWords.filter(w => lower.includes(w)).length;
    if (spanishCount >= 3) return 'es';
    
    // Common French
    const frenchWords = [' le ', ' la ', ' les ', ' et ', ' est ', ' sont ', ' de ', ' en '];
    const frenchCount = frenchWords.filter(w => lower.includes(w)).length;
    if (frenchCount >= 3) return 'fr';
    
    return 'en'; // Default
  }

  // Keyword extraction using frequency analysis
  private extractKeywords(text: string, maxKeywords: number = 10): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
      'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up',
      'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
      'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
      'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
      'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now', 'this',
      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    ]);

    const words = text.toLowerCase()
      .replace(/[^a-zA-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    const frequency: Record<string, number> = {};
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  // Topic detection using keyword clustering
  private detectTopics(text: string): string[] {
    const topics: string[] = [];
    const lower = text.toLowerCase();

    const topicMap: Record<string, string[]> = {
      'technology': ['software', 'code', 'programming', 'algorithm', 'database', 'api', 'computer', 'system', 'data', 'cloud'],
      'business': ['company', 'market', 'revenue', 'profit', 'customer', 'sales', 'strategy', 'business', 'corporate', 'finance'],
      'science': ['research', 'study', 'experiment', 'hypothesis', 'theory', 'scientific', 'analysis', 'evidence', 'method'],
      'health': ['health', 'medical', 'patient', 'doctor', 'treatment', 'disease', 'symptom', 'medicine', 'clinical'],
      'legal': ['law', 'legal', 'court', 'contract', 'attorney', 'lawyer', 'case', 'statute', 'regulation'],
      'education': ['school', 'student', 'teacher', 'education', 'learning', 'course', 'university', 'academic'],
      'finance': ['money', 'bank', 'investment', 'financial', 'economy', 'stock', 'market', 'budget', 'accounting'],
    };

    for (const [topic, keywords] of Object.entries(topicMap)) {
      const matches = keywords.filter(kw => lower.includes(kw)).length;
      if (matches >= 2) topics.push(topic);
    }

    return topics;
  }
}

export const documentProcessor = new DocumentProcessor();
