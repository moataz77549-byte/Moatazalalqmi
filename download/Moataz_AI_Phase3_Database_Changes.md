# Moataz AI — Phase 3 Database Changes

## New Models Added (13)

### 1. Folder
Hierarchical folder system for organizing chats, files, and projects.
- Fields: id, name, type (CHAT/FILE/PROJECT), parentId, organizationId, userId, icon, color, sortOrder
- Self-referential relation for hierarchy
- Cascade delete to children

### 2. Tag
User-defined tags with colors for categorizing chats.
- Fields: id, name, color, organizationId, userId
- Unique per (organization, name, user)

### 3. ChatTag
Join table between Chat and Tag (many-to-many).
- Fields: chatId, tagId
- Unique constraint on (chatId, tagId)

### 4. ChatShare
Share links for conversations.
- Fields: id, chatId, userId, shareToken (unique), isPublic, expiresAt, viewCount

### 5. MessageVersion
Version history for edited messages.
- Fields: id, messageId, content, version, editedBy, createdAt

### 6. MessageReaction
User reactions on messages.
- Fields: id, messageId, userId, type (LIKE/DISLIKE/LOVE/THUMBS_UP/THUMBS_DOWN)
- Unique per (message, user, type)

### 7. Artifact
AI-generated content artifacts.
- Fields: id, title, artifactType, content, language, metadata, organizationId, userId, projectId, chatId, messageId, isPublic, version, parentArtifactId

### 8. Note
User notes with markdown content.
- Fields: id, title, content, organizationId, projectId, userId, isPinned, tags

### 9. Task
Task management with Kanban board support.
- Fields: id, title, description, status, priority, organizationId, projectId, userId, assigneeId, dueDate, completedAt, tags

### 10. QuickAccess
User's pinned/recent items for quick navigation.
- Fields: id, userId, itemType, itemId, label, icon, sortOrder
- Unique per (user, itemType, itemId)

### 11. WorkspaceVariable
Project-level variables (with secret support).
- Fields: id, key, value, description, isSecret, organizationId, projectId
- Unique per (project, key)

### 12. PromptLibrary
User's saved prompts.
- Fields: id, title, description, content, category, tags, organizationId, userId, isPublic, isFavorite

### 13. UserPreference
User preferences by category.
- Fields: id, userId, category, settings (JSON)
- Unique per (user, category)

## Modified Models

### Chat (expanded)
- Added: folderId, isPinned, isFavorite, isShared, parentChatId, modelParams, lastMessageAt
- Added relations: folder, parentChat (self-ref), branches, tags, shares, artifacts

### Message (expanded)
- Added: status (PENDING/STREAMING/COMPLETED/FAILED/STOPPED), parentMessageId
- Added relations: versions, reactions, artifacts

### File (expanded)
- Added: folderId, version, parentFileId
- Added relations: folder, versions (self-ref), parent

### User (expanded)
- Added relations: folders, tags, artifacts, notes, tasks, chatShares, messageReactions, quickAccessItems, promptLibrary, preferences

### Organization (expanded)
- Added relations: folders, tags, artifacts, notes, tasks

### Project (expanded)
- Added relations: artifacts, notes, tasks, workspaceVariables

## New Enums
- ArtifactType: CODE, IMAGE, DOCUMENT, TABLE, CHART, MARKDOWN, PDF, JSON, CSV, HTML, SVG
- FolderType: CHAT, FILE, PROJECT
- MessageStatus: PENDING, STREAMING, COMPLETED, FAILED, STOPPED
- ReactionType: LIKE, DISLIKE, LOVE, THUMBS_UP, THUMBS_DOWN

## Migration Safety
- All changes are additive (no columns removed)
- All new fields have defaults or are nullable
- No existing data affected
- Backward compatible with Phase 1 and Phase 2
