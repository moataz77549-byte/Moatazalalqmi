# Moataz AI — Phase 3 API Summary

## Chat APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/chats | List chats (filter, search, paginate) |
| POST | /api/v1/chats | Create chat |
| GET | /api/v1/chats/[id] | Get chat with messages |
| PATCH | /api/v1/chats/[id] | Update chat (title, pin, favorite, archive) |
| DELETE | /api/v1/chats/[id] | Delete chat |
| GET | /api/v1/chats/[id]/messages | List messages |
| POST | /api/v1/chats/[id]/messages | Send message + get AI response |
| POST | /api/v1/chats/[id]/stream | Stream AI response (SSE) |
| GET | /api/v1/chats/[id]/messages/[messageId] | Get message with versions |
| PATCH | /api/v1/chats/[id]/messages/[messageId] | Edit message (creates version) |
| DELETE | /api/v1/chats/[id]/messages/[messageId] | Delete message |
| POST | /api/v1/chats/[id]/messages/[messageId]/react | Add reaction |
| DELETE | /api/v1/chats/[id]/messages/[messageId]/react | Remove reaction |
| GET | /api/v1/chats/[id]/share | Get share info |
| POST | /api/v1/chats/[id]/share | Create share link |
| DELETE | /api/v1/chats/[id]/share | Revoke share |
| POST | /api/v1/chats/[id]/branch | Branch conversation |
| GET | /api/v1/chats/[id]/export | Export chat (JSON/Markdown) |

## Folder APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/folders | List folders (filter by type, parentId) |
| POST | /api/v1/folders | Create folder |
| GET | /api/v1/folders/[id] | Get folder with children |
| PATCH | /api/v1/folders/[id] | Update folder |
| DELETE | /api/v1/folders/[id] | Delete folder (cascade) |

## Tag APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/tags | List tags |
| POST | /api/v1/tags | Create tag |
| PATCH | /api/v1/tags/[id] | Update tag |
| DELETE | /api/v1/tags/[id] | Delete tag |

## Artifact APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/artifacts | List artifacts (filter by type, project, chat) |
| POST | /api/v1/artifacts | Create artifact |
| GET | /api/v1/artifacts/[id] | Get artifact |
| PATCH | /api/v1/artifacts/[id] | Update artifact (creates version) |
| DELETE | /api/v1/artifacts/[id] | Delete artifact |

## Note APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/notes | List notes |
| POST | /api/v1/notes | Create note |
| GET | /api/v1/notes/[id] | Get note |
| PATCH | /api/v1/notes/[id] | Update note |
| DELETE | /api/v1/notes/[id] | Delete note |

## Task APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/tasks | List tasks |
| POST | /api/v1/tasks | Create task |
| GET | /api/v1/tasks/[id] | Get task |
| PATCH | /api/v1/tasks/[id] | Update task |
| DELETE | /api/v1/tasks/[id] | Delete task |

## File APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/files | List files (filter by project, folder, type) |
| POST | /api/v1/files | Upload file (multipart) |
| GET | /api/v1/files/[id] | Get file metadata |
| PATCH | /api/v1/files/[id] | Update file |
| DELETE | /api/v1/files/[id] | Delete file |

## Project APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/projects | List projects (with stats) |
| POST | /api/v1/projects | Create project |
| GET | /api/v1/projects/[id] | Get project |
| PATCH | /api/v1/projects/[id] | Update project |
| DELETE | /api/v1/projects/[id] | Delete project |
| GET | /api/v1/projects/[id]/variables | List workspace variables |
| POST | /api/v1/projects/[id]/variables | Create variable |

## Search & Navigation APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/search?q= | Global search (chats, messages, files, notes, artifacts, projects) |
| GET | /api/v1/quick-access | List quick access items |
| POST | /api/v1/quick-access | Add quick access |
| DELETE | /api/v1/quick-access | Remove quick access |

## Preferences & Prompts APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/preferences | Get user preferences |
| PUT | /api/v1/preferences | Update preferences |
| GET | /api/v1/prompts | List prompts |
| POST | /api/v1/prompts | Create prompt |
| PATCH | /api/v1/prompts/[id] | Update prompt |
| DELETE | /api/v1/prompts/[id] | Delete prompt |

## Authentication
All endpoints require `Authorization: Bearer <token>` header (JWT session or mz_ API key).
