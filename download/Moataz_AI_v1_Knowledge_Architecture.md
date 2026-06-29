# Moataz AI v1.0 — Knowledge Architecture
Generated: 2026-06-27 23:07:23

## Knowledge Base Overview

The Knowledge Base is a production-grade document management and RAG system that enables AI interactions grounded in organizational knowledge.

## Architecture

```
┌──────────────────────────────────────────────────┐
│                Document Upload                     │
│  (File upload / Text paste / Web import / API)    │
└────────────────────────┬─────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────┐
│              Document Processor                    │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Extract │→│ Dedup    │→│ Metadata Extract │  │
│  └─────────┘ └──────────┘ └──────────────────┘  │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Chunk   │→│ Embed    │→│ Index            │  │
│  └─────────┘ └──────────┘ └──────────────────┘  │
└────────────────────────┬─────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────┐
│              Storage Layer                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Database │ │ Vector   │ │ Search Index     │ │
│  │ (Prisma) │ │ (Qdrant) │ │ (SearchIndex)    │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└──────────────────────────────────────────────────┘
```

## Document Processing Pipeline (7 Steps)

### Step 1: Text Extraction
- Supports: PDF, DOCX, Markdown, Text, CSV, Code, HTML, Web
- OCR for images (when available)
- Structure preservation (headings, tables, lists)

### Step 2: Duplicate Detection
- SHA-256 content hash fingerprinting
- Cross-organization dedup check
- Marks duplicates with reference to original

### Step 3: Metadata Extraction
- Word count, character count, page count
- Language detection (12+ languages)
- Keyword extraction (frequency analysis with stopword removal)
- Topic detection (keyword clustering into 7 categories)

### Step 4: Chunking
- Configurable chunk size (default: 1000 chars)
- Configurable overlap (default: 200 chars)
- Sentence/paragraph boundary-aware splitting
- Position tracking for citation support

### Step 5: AI Summary Generation
- 2-3 paragraph concise summary
- Captures key points and conclusions
- Cached for repeated access

### Step 6: Embedding Generation
- Per-chunk embeddings via AI Gateway
- OpenAI text-embedding-3-small (1536 dimensions)
- Graceful fallback when providers unavailable
- Embedding status tracking (PENDING/COMPLETED/FAILED)

### Step 7: Indexing
- Document marked as INDEXED
- SearchIndex record created for global search
- Chunks available for RAG retrieval

## RAG Engine

### Hybrid Search
- **Semantic Search**: Cosine similarity on chunk embeddings (60% weight)
- **Keyword Search**: BM25-style term frequency matching (25% weight)
- **Cross-result Boosting**: Documents in both results get +20% boost

### Context Ranking
- Score normalization
- Relevance threshold filtering (default: 0.3)
- Maximum chunks per query (default: 5)
- Maximum memories per query (default: 3)

### Citation Support
- Each source includes: type, ID, title, content, score, citation
- Citations formatted as "Document Title (chunk N)"
- Sources traceable back to original documents

## Collection System

### Collection Types
- KNOWLEDGE_BASE: Top-level knowledge bases
- FOLDER: Organizational folders
- CATEGORY: Category groupings
- TAG_GROUP: Tag-based collections
- SHARED: Shared collections

### Hierarchy
- Collections support parent-child relationships
- Recursive cascade delete
- Documents can belong to one collection

## Global Search

### Federated Search Across 9 Types
1. Chats (by title)
2. Messages (by content)
3. Files (by name)
4. Documents (by title, content, summary)
5. Notes (by title, content)
6. Artifacts (by title, content)
7. Projects (by name, description)
8. Memories (by content)
9. Prompts (by title, content)

### AI Enhancement
- Automatic classification of search intent
- AI-generated summary of results
- Keyword extraction from results
- Confidence scoring per result
