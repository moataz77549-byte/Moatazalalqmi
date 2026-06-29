# Moataz AI — Phase 3 Component Tree
Generated: 2026-06-27 22:09:21

```
src/
├── app/
│   ├── page.tsx                          # Entry point (auth bootstrap)
│   ├── layout.tsx                        # Root layout with ThemeProvider
│   ├── globals.css                       # Global styles
│   └── api/v1/
│       ├── chats/
│       │   ├── route.ts                  # GET, POST chats
│       │   └── [id]/
│       │       ├── route.ts              # GET, PATCH, DELETE chat
│       │       ├── messages/
│       │       │   ├── route.ts          # GET, POST messages
│       │       │   └── [messageId]/
│       │       │       ├── route.ts      # GET, PATCH, DELETE message
│       │       │       └── react/
│       │       │           └── route.ts  # POST, DELETE reaction
│       │       ├── share/route.ts        # GET, POST, DELETE share
│       │       ├── branch/route.ts       # POST branch
│       │       ├── export/route.ts       # GET export
│       │       └── stream/route.ts       # POST SSE streaming
│       ├── folders/
│       │   ├── route.ts                  # GET, POST folders
│       │   └── [id]/route.ts             # GET, PATCH, DELETE folder
│       ├── tags/
│       │   ├── route.ts                  # GET, POST tags
│       │   └── [id]/route.ts             # PATCH, DELETE tag
│       ├── artifacts/
│       │   ├── route.ts                  # GET, POST artifacts
│       │   └── [id]/route.ts             # GET, PATCH, DELETE artifact
│       ├── notes/
│       │   ├── route.ts                  # GET, POST notes
│       │   └── [id]/route.ts             # GET, PATCH, DELETE note
│       ├── tasks/
│       │   ├── route.ts                  # GET, POST tasks
│       │   └── [id]/route.ts             # GET, PATCH, DELETE task
│       ├── files/
│       │   ├── route.ts                  # GET, POST files
│       │   └── [id]/route.ts             # GET, PATCH, DELETE file
│       ├── projects/
│       │   ├── route.ts                  # GET, POST projects
│       │   └── [id]/
│       │       ├── route.ts              # GET, PATCH, DELETE project
│       │       └── variables/route.ts    # GET, POST variables
│       ├── search/route.ts               # GET global search
│       ├── quick-access/route.ts         # GET, POST, DELETE
│       ├── preferences/route.ts          # GET, PUT preferences
│       └── prompts/
│           ├── route.ts                  # GET, POST prompts
│           └── [id]/route.ts             # PATCH, DELETE prompt
├── components/
│   ├── workspace/
│   │   ├── workspace-shell.tsx           # Main layout orchestrator
│   │   ├── sidebar.tsx                   # Left navigation
│   │   ├── top-bar.tsx                   # Top navigation
│   │   ├── right-panel.tsx               # Context panel
│   │   ├── status-bar.tsx                # Bottom status
│   │   ├── chat-view.tsx                 # Chat interface
│   │   ├── chat-message.tsx              # Message component
│   │   ├── chat-input.tsx                # Input area
│   │   ├── command-palette.tsx           # ⌘K modal
│   │   ├── model-selector.tsx            # Model dropdown
│   │   ├── markdown.tsx                  # Markdown renderer
│   │   ├── files-view.tsx                # File manager
│   │   ├── notes-view.tsx                # Notes editor
│   │   ├── tasks-view.tsx                # Kanban board
│   │   ├── artifacts-view.tsx            # Artifact gallery
│   │   ├── settings-view.tsx             # Settings panel
│   │   ├── gateway-view.tsx              # AI Gateway dashboard
│   │   ├── landing.tsx                   # Marketing page
│   │   └── auth-dialogs.tsx              # Login/Register modals
│   └── ui/                               # shadcn/ui components
└── lib/
    ├── store.ts                          # Zustand store (expanded)
    ├── api-client.ts                     # API helper functions
    ├── i18n.ts                           # Internationalization
    ├── db.ts                             # Prisma client
    ├── auth.ts                           # Auth utilities
    ├── api.ts                            # API response helpers
    ├── audit.ts                          # Audit logging
    ├── middleware.ts                     # Auth middleware
    ├── config.ts                         # Configuration
    ├── validators.ts                     # Zod schemas
    ├── rate-limit.ts                     # Rate limiting
    ├── feature-flags.ts                  # Feature flags
    ├── redis.ts                          # Redis client
    ├── qdrant.ts                         # Qdrant client
    ├── storage.ts                        # S3 storage
    ├── bullmq.ts                         # Job queue
    └── ai-gateway/                       # Phase 2 AI Gateway
        ├── gateway.ts
        ├── types.ts
        ├── registry.ts
        ├── smart-router.ts
        ├── fallback-engine.ts
        ├── retry-engine.ts
        ├── prompt-engine.ts
        ├── prompt-cache.ts
        ├── health-monitor.ts
        ├── usage-tracker.ts
        ├── cost-calculator.ts
        ├── token-counter.ts
        ├── key-vault.ts
        └── drivers/                      # 12 provider drivers
```
