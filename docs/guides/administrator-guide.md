# Moataz AI v1.0 — Administrator Guide
Generated: 2026-06-27 23:07:23

## Overview

This guide covers the day-to-day administration of Moataz AI v1.0 for system administrators.

## User Management

### Creating Users
1. Users self-register via the login page
2. Or administrators can invite users (planned for v1.1)
3. Users verify email and complete profile

### Managing Organizations
1. Create organization via UI or API
2. Add members via membership system
3. Assign roles: SUPER_ADMIN, ADMIN, MANAGER, MEMBER, GUEST

### Role Permissions
| Role | Permissions |
|------|-------------|
| SUPER_ADMIN | Full system access |
| ADMIN | Organization management |
| MANAGER | Team and project management |
| MEMBER | Standard user access |
| GUEST | Read-only access |

## AI Provider Configuration

### Adding Providers
1. Navigate to AI Gateway → Providers
2. Select provider type
3. Enter API key (encrypted with AES-256-GCM)
4. Configure base URL (if custom)
5. Test connection

### Monitoring Providers
- Health status: healthy, degraded, unhealthy
- Latency monitoring
- Error rate tracking
- Cost analytics

### Managing API Keys
1. Navigate to Settings → API Keys
2. Create new key with name and permissions
3. Key is shown ONCE — store securely
4. Revoke keys when no longer needed

## Knowledge Base Management

### Creating Collections
1. Navigate to Knowledge Base
2. Click "New Collection"
3. Configure: name, type, description, sharing

### Uploading Documents
1. Drag & drop files or paste text
2. Configure: title, type, collection, tags
3. Document processes automatically:
   - Text extraction
   - Duplicate detection
   - Metadata extraction
   - Chunking
   - Embedding generation
   - Indexing

### Monitoring Index Status
- Navigate to Knowledge Base
- View index status bar
- Check per-document processing status
- Re-process failed documents

## Memory Management

### Viewing Memories
1. Navigate to Memory Center
2. Filter by scope, type, status
3. Search memories semantically

### Managing Memory Lifecycle
- **Create**: Manual or auto-extracted
- **Edit**: Creates new version
- **Deprecate**: Soft delete with reason
- **Expire**: Automatic or manual expiration sweep
- **Summarize**: Compress multiple memories

### Memory Permissions
- Set per-memory access: read, write, admin
- Scope-based visibility (Personal, Project, Org)

## System Monitoring

### Health Checks
- Application: `/api/v1/health`
- AI Gateway: `/api/v1/ai/health`
- Index Status: `/api/v1/index/status`

### Audit Logs
1. Navigate to Admin → Audit Logs
2. Filter by user, action, resource, date
3. Export for compliance reporting

### Usage Analytics
- AI usage by provider, model, cost
- User activity metrics
- Document processing stats

## Security Administration

### Rate Limiting
- Login: 10 attempts per 15 minutes
- Chat: 20 requests per minute
- Streaming: 10 requests per minute
- Embeddings: 50 requests per minute

### Audit Trail
All security-relevant events are logged:
- Authentication events
- Authorization changes
- Data access events
- AI interactions
- Administrative actions

## Backup and Recovery

### Database Backups
- Configure automated daily backups
- Test restore procedure quarterly
- Retain backups per compliance requirements

### Configuration Backup
- Version control all configuration files
- Securely backup environment variables
- Document recovery procedures

## Troubleshooting

### Common Issues

#### User Cannot Login
1. Check user is active
2. Verify email is confirmed
3. Check rate limit (10/15min)
4. Reset password if needed

#### AI Provider Not Responding
1. Check provider health in AI Gateway
2. Verify API key is valid
3. Check provider rate limits
4. Review fallback configuration

#### Document Processing Failed
1. Check document status in Knowledge Base
2. Review processing error
3. Re-process document
4. Check AI provider availability (for embeddings)

#### Memory Search Not Returning Results
1. Check memory scope permissions
2. Verify confidence threshold
3. Check memory status (ACTIVE vs EXPIRED/DEPRECATED)
4. Try lower confidence threshold
