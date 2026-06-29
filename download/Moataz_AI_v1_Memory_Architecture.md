# Moataz AI v1.0 — Memory Architecture
Generated: 2026-06-27 23:07:23

## Memory Engine Overview

The Memory Engine provides persistent, structured contextual continuity that accumulates across sessions and scopes. It eliminates the amnesia problem inherent in stateless AI interactions.

## Memory Scopes (7 levels)

```
┌─────────────────────────────────────────────────┐
│ Organization Memory (shared across all users)    │
├─────────────────────────────────────────────────┤
│ Project Memory (scoped to a project)             │
├─────────────────────────────────────────────────┤
│ Workspace Memory (scoped to user's workspace)    │
├─────────────────────────────────────────────────┤
│ Pinned Memory (user-pinned, always included)     │
├─────────────────────────────────────────────────┤
│ Personal Memory (private to user)                │
├─────────────────────────────────────────────────┤
│ Conversation Memory (per-chat, transient)        │
├─────────────────────────────────────────────────┤
│ Short-term Memory (session-only, ephemeral)      │
└─────────────────────────────────────────────────┘
```

## Memory Types (8)

| Type | Description | Example |
|------|-------------|---------|
| FACT | Factual information | "User's company is Acme Corp" |
| PREFERENCE | User preferences | "Prefers dark mode and concise answers" |
| DECISION | Decision records | "Chose PostgreSQL over MongoDB" |
| INSTRUCTION | Behavioral instructions | "Always include code examples" |
| CONTEXT | Situational context | "Working on Phase 4 release" |
| SUMMARY | Compressed summaries | "Q1 planning: prioritize AI memory" |
| ENTITY | Entity definitions | "Moataz AI is an AI Operating System" |
| RELATIONSHIP | Entity relationships | "User reports to CTO" |

## Memory Lifecycle

```
Creation → Active → [Accessed/Updated] → [Deprecated/Expired] → Archived
   ↓         ↓           ↓                      ↓
Embedded  Searchable  Versioned            Soft-deleted
```

## Features

### Memory Search (Hybrid)
- **Semantic Search**: Cosine similarity on embeddings (60% weight)
- **Keyword Matching**: TF-IDF style matching (25% weight)
- **Importance Boost**: Higher importance = higher rank (10% weight)
- **Confidence Boost**: Higher confidence = higher rank (5% weight)
- **Recency Boost**: Newer memories slightly preferred
- **Pinned Boost**: Pinned memories always included

### Memory Compression
- **Summarization**: AI-powered compression of multiple memories
- **Deduplication**: Content hash prevents duplicate storage
- **Expiration**: Time-based automatic expiration
- **Deprecation**: Manual soft-delete with reason tracking

### Memory Versioning
- Each edit creates a new version (parentMemoryId)
- Version number increments
- Previous versions preserved
- Rollback capability

### Memory Permissions
- Per-memory access control
- Three access levels: read, write, admin
- User-scoped permissions

### Automatic Extraction
- Analyzes conversations
- Uses AI to identify memorable information
- Classifies by type (FACT, PREFERENCE, DECISION, etc.)
- Assigns importance and confidence scores
- Only extracts genuinely useful memories

## Integration Points

### Chat Integration
- `memoryEngine.getContextForChat()` retrieves relevant memories before each AI call
- Memories injected into system prompt as context
- Only high-confidence (>0.4) memories included
- Limited to 5 memories per interaction to avoid token overflow

### RAG Integration
- Memory Engine provides personal context
- RAG Engine provides knowledge base context
- Both combined in the prompt engine for comprehensive context

### Knowledge Base Integration
- Memories can reference knowledge documents
- Document processing can trigger memory creation
- Cross-reference between personal memories and organizational knowledge
