# Moataz AI — Migration Report

## Migration: SQLite → PostgreSQL 16+

| Property | Before | After |
|----------|--------|-------|
| **Provider** | SQLite | PostgreSQL 16+ |
| **ID Type** | cuid() (string) | uuid() (@db.Uuid) |
| **JSON Storage** | String (manual parse) | Native JSONB |
| **Text Fields** | Unlimited TEXT | TEXT with @db.Text annotation |
| **Soft Delete** | Not implemented | deletedAt on 6 core entities |
| **Partial Indexes** | Not supported | 5 partial indexes added |
| **Composite Indexes** | Limited | 4 performance-critical composites |
| **Full-Text Search** | Not available | Preview feature enabled |
| **Connection Pooling** | N/A | PgBouncer/Supavisor ready |
| **Binary Targets** | native only | native + linux-musl + debian |

---

## Changes Summary

### Schema Changes

#### 1. Provider Switch
```diff
- provider = "sqlite"
- url      = env("DATABASE_URL")  // file:./db/custom.db
+ provider = "postgresql"
+ url      = env("DATABASE_URL")  // postgresql://...
```

#### 2. Primary Key Strategy
```diff
- id String @id @default(cuid())
+ id String @id @default(uuid()) @db.Uuid
```

All 37 tables converted to UUID v4 with native PostgreSQL UUID type.

#### 3. Foreign Key Types
All foreign key columns now explicitly annotated with `@db.Uuid`:
```diff
- userId String
+ userId String @db.Uuid
```

#### 4. Soft Delete Added
Core entities now have `deletedAt DateTime?`:
- User
- Organization
- Project
- Chat
- Message
- KnowledgeDocument

#### 5. JSON Fields Upgraded
All `String` fields storing JSON converted to native `Json?` type:
```diff
- properties String?  // JSON string
+ properties Json?
```

Affected columns (17 total):
- Analytics.properties
- Workspace.layout
- Chat.modelParams
- Message.metadata
- Provider.config
- Model.pricing, Model.capabilities
- PromptTemplate.variables
- File.metadata
- ApiKey.permissions
- FeatureFlag.value
- UserSetting.value, OrganizationSetting.value
- UserPreference.settings
- Memory.embedding, Memory.tags, Memory.metadata
- And others...

#### 6. Text Annotations
Large content fields annotated with `@db.Text` for clarity:
- Message.content
- KnowledgeDocument.content, summary
- DocumentChunk.content
- Artifact.content
- Note.content
- Task.description
- WorkspaceVariable.value
- PromptLibrary.content
- Memory.content
- SearchIndex.content, summary
- KnowledgeDocument.processingError

#### 7. Index Optimizations

**New Indexes Added:**
| Table | Index | Purpose |
|-------|-------|---------|
| User | deletedAt | Soft delete filter |
| User | isSuperAdmin | Admin lookups |
| Organization | ownerId | Owner queries |
| Organization | deletedAt | Soft delete filter |
| Chat | lastMessageAt | Recent chats sorting |
| Chat | parentChatId | Branch navigation |
| Chat | deletedAt | Soft delete filter |
| Message | userId | User message history |
| Message | status | Processing pipeline |
| Message | deletedAt | Soft delete filter |
| Provider | isActive | Active provider filter |
| File | status | Processing pipeline |
| File | storageKey | Storage lookups |
| ApiKey | organizationId | Org-level key management |
| ApiKey | isRevoked | Active key filter |
| ApiKey | expiresAt | Expiry management |
| Notification | userId+isRead | Unread count (composite) |
| AuditLog | resourceId | Resource audit trail |
| AuditLog | org+createdAt | Org audit timeline |
| SearchIndex | itemType+itemId | Unique dedup |
| SearchIndex | org+itemType | Org-scoped search |

**Partial Indexes (PostgreSQL-specific):**
| Name | Condition | Purpose |
|------|-----------|---------|
| User_active_not_deleted | WHERE deletedAt IS NULL | Skip soft-deleted users |
| Organization_active_not_deleted | WHERE deletedAt IS NULL | Skip soft-deleted orgs |
| Project_active_not_deleted | WHERE deletedAt IS NULL | Skip soft-deleted projects |
| Chat_active_not_deleted | WHERE deletedAt IS NULL | Skip soft-deleted chats |
| Message_active_not_deleted | WHERE deletedAt IS NULL | Skip soft-deleted messages |

**Composite Performance Indexes:**
| Name | Columns | Purpose |
|------|---------|---------|
| Chat_user_org_recent | userId, orgId, lastMessageAt DESC | Chat list loading |
| Message_chat_recent | chatId, createdAt DESC | Message pagination |
| Memory_user_active | userId, status WHERE ACTIVE | Memory retrieval |
| AuditLog_org_recent | organizationId, createdAt DESC | Audit timeline |

#### 8. Constraint Additions

- `Provider`: Added `@@unique([organizationId, type])` — one provider config per type per org
- `ChatTag`: Changed from `@@unique([chatId, tagId])` to composite `@@id([chatId, tagId])` — proper junction table
- `SearchIndex`: Added `@@unique([itemType, itemId])` — prevent duplicate search entries

#### 9. Cascade Rule Updates

- `Membership.teamId`: Changed from `CASCADE` to `SET NULL` — deleting a team shouldn't remove the membership
- `Organization.ownerId`: Uses RESTRICT (no deletion if org exists) — protects data integrity

---

## Migration Strategy

### For Fresh Deployments
```bash
# Apply the initial migration
npx prisma migrate deploy

# Seed the database
npx prisma db seed
```

### For Existing SQLite → PostgreSQL
1. Export SQLite data using `prisma db pull` + custom export script
2. Set up PostgreSQL and configure `DATABASE_URL`
3. Run `npx prisma migrate deploy` to create schema
4. Transform exported data (cuid → uuid, JSON strings → objects)
5. Import transformed data using bulk insert
6. Run `npx prisma db seed` for any missing system data
7. Verify data integrity

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data loss during migration | HIGH | Full backup before migration, dual-write period |
| UUID collision | NEGLIGIBLE | UUID v4 has 2^122 possible values |
| Performance regression | LOW | Added 20+ new indexes, partial indexes |
| Breaking changes in app code | MEDIUM | JSON fields now native (no manual parse needed) |
| Connection pool exhaustion | MEDIUM | Configure PgBouncer, set pool limits |

---

## Post-Migration Validation

```sql
-- Verify table count
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: 37

-- Verify enum count  
SELECT count(*) FROM pg_type WHERE typtype = 'e';
-- Expected: 21

-- Verify index count
SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';
-- Expected: ~150+

-- Check for orphaned records
SELECT count(*) FROM "Session" s LEFT JOIN "User" u ON s."userId" = u.id WHERE u.id IS NULL;
-- Expected: 0
```
