# Moataz AI — Production Database Checklist

## Pre-Deployment

### Infrastructure
- [ ] PostgreSQL 16+ instance provisioned (Supabase / Neon / RDS)
- [ ] Connection string configured in environment variables
- [ ] Connection pooling configured (PgBouncer / Supavisor)
- [ ] SSL/TLS enabled for database connections
- [ ] Database user created with minimal required privileges
- [ ] Network access restricted (VPC / allowlist)

### Schema Deployment
- [ ] Run `npx prisma migrate deploy` successfully
- [ ] Verify all 37 tables created
- [ ] Verify all 21 enums created
- [ ] Verify all indexes exist (~150+)
- [ ] Verify foreign key constraints
- [ ] Run `npx prisma db seed` for initial data

### Security
- [ ] Default admin password changed immediately after first login
- [ ] `Provider.apiKey` values encrypted at application level
- [ ] OAuth tokens encrypted at application level
- [ ] RLS policies enabled (for Supabase)
- [ ] Database audit logging enabled
- [ ] Secrets not stored in plain text anywhere in codebase

### Backups
- [ ] Automated daily backups configured
- [ ] Point-in-time recovery (PITR) enabled
- [ ] Backup restore tested successfully
- [ ] Backup retention policy defined (minimum 30 days)
- [ ] Cross-region backup replication (if applicable)

---

## Application Configuration

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/moataz_ai?sslmode=require

# Connection Pool (if using external pooler)
DATABASE_POOL_URL=postgresql://user:password@pooler-host:6543/moataz_ai?pgbouncer=true

# Direct connection (for migrations only)
DIRECT_DATABASE_URL=postgresql://user:password@host:5432/moataz_ai?sslmode=require
```

### Prisma Configuration
- [ ] `prisma generate` runs without errors
- [ ] Binary targets include deployment platform
- [ ] Preview features documented and tested
- [ ] Prisma client properly instantiated (singleton pattern)

### Scripts
- [ ] `scripts/start.sh` uses `prisma migrate deploy` (not `db push`)
- [ ] Migration runs are idempotent (safe to re-run)
- [ ] Seed script uses upserts (safe to re-run)
- [ ] Health check endpoint verifies DB connectivity

---

## Performance

### Indexes Verified
- [ ] All foreign key columns indexed
- [ ] Slug columns have unique indexes
- [ ] Timestamp columns used for sorting are indexed
- [ ] Partial indexes active for soft-delete queries
- [ ] Composite indexes cover hot query paths

### Query Performance
- [ ] Chat listing query <50ms (p95)
- [ ] Message loading query <30ms (p95)
- [ ] Memory retrieval query <20ms (p95)
- [ ] Search queries <100ms (p95)
- [ ] No N+1 queries in critical paths

### Connection Management
- [ ] Pool size appropriate for workload (recommended: 20 per instance)
- [ ] Idle connection timeout configured (10s)
- [ ] Connection timeout configured (5s)
- [ ] Max connections won't exceed PostgreSQL limit

---

## Monitoring

### Metrics to Track
- [ ] Active connections count
- [ ] Query latency (p50, p95, p99)
- [ ] Slow query log enabled (>1s threshold)
- [ ] Table bloat monitoring
- [ ] Index usage statistics
- [ ] Replication lag (if using replicas)
- [ ] Disk usage and growth rate

### Alerts to Configure
- [ ] Connection pool exhaustion (>80% utilization)
- [ ] Query latency spike (p95 > 500ms)
- [ ] Disk usage > 80%
- [ ] Replication lag > 10s
- [ ] Failed migrations
- [ ] Dead tuples > 10% of table size

---

## Maintenance

### Regular Tasks
- [ ] Weekly: Review slow query log
- [ ] Weekly: Check index usage (drop unused indexes)
- [ ] Monthly: Run VACUUM ANALYZE on high-write tables
- [ ] Monthly: Review and rotate credentials
- [ ] Quarterly: Test backup restore procedure
- [ ] Quarterly: Review and optimize query patterns

### Table Maintenance Priority
| Table | Write Frequency | Maintenance Priority |
|-------|----------------|---------------------|
| Message | Very High | Weekly VACUUM |
| AuditLog | High | Weekly VACUUM |
| Analytics | High | Weekly VACUUM |
| Session | High | Daily cleanup of expired |
| Embedding | Medium | Monthly |
| Memory | Medium | Monthly |
| Others | Low | Quarterly |

---

## Disaster Recovery

### Recovery Objectives
- [ ] RPO (Recovery Point Objective): Define (recommended: <1 hour)
- [ ] RTO (Recovery Time Objective): Define (recommended: <15 minutes)

### Procedures Documented
- [ ] Full database restore from backup
- [ ] Point-in-time recovery steps
- [ ] Failover to read replica
- [ ] Schema rollback procedure
- [ ] Data corruption recovery

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Database Architect | — | — | ✅ Schema approved |
| DevOps Engineer | — | — | ⬜ Infrastructure ready |
| Security Engineer | — | — | ⬜ Security review passed |
| Backend Lead | — | — | ⬜ Application code updated |
| QA Lead | — | — | ⬜ Integration tests passing |
