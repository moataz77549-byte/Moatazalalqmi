# Moataz AI v1.0 — Deployment Guide
Generated: 2026-06-27 23:07:23

## Quick Start (Development)

```bash
# Clone the repository
git clone <repo-url> moataz-ai
cd moataz-ai

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
bun run db:push

# Start development server
bun run dev
```

## Production Deployment

### Option 1: Docker Compose

```bash
# Build and start all services
docker-compose up -d

# Services:
# - App (port 3000)
# - Redis (port 6379)
# - Qdrant (port 6333)
# - MinIO (port 9000, 9001)
# - Grafana (port 3001)
# - Prometheus (port 9090)
```

### Option 2: Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Or using Helm
helm install moataz-ai ./helm/moataz-ai
```

### Option 3: Cloud Platform (Vercel + Managed Services)

1. **Frontend**: Deploy to Vercel
   ```bash
   vercel --prod
   ```

2. **Database**: Use managed PostgreSQL (Supabase, Neon, or AWS RDS)

3. **Redis**: Use managed Redis (Upstash or Redis Cloud)

4. **Qdrant**: Use Qdrant Cloud or self-host

5. **Storage**: Use AWS S3, Cloudflare R2, or MinIO

## Environment Variables

```env
# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
DEFAULT_LOCALE=en
SESSION_TIMEOUT_HOURS=24
JWT_SECRET=your-super-secret-jwt-key

# Database
DATABASE_URL=postgresql://user:pass@host:5432/moataz

# Redis
REDIS_URL=redis://localhost:6379

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-qdrant-api-key

# Storage (S3 Compatible)
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=moataz-ai
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=us-east-1

# AI Provider Keys (optional — can be configured via UI)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=

# Encryption
ENCRYPTION_MASTER_KEY=your-32-byte-master-key

# OAuth (optional — planned for v1.1)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

## Post-Deployment Checklist

1. ✅ Health check: `curl https://your-domain.com/api/v1/health`
2. ✅ Create admin user: Register via UI
3. ✅ Configure AI providers: Add API keys via AI Gateway settings
4. ✅ Test AI chat: Send a test message
5. ✅ Verify database backups: Set up automated backups
6. ✅ Configure monitoring: Set up alerts in Grafana
7. ✅ Set up SSL: Configure HTTPS (Let's Encrypt or cloud SSL)
8. ✅ Configure CDN: For static asset delivery
9. ✅ Set up log aggregation: Forward logs to your logging service
10. ✅ Load test: Validate performance under expected load

## Scaling Guidelines

### Vertical Scaling
- Increase CPU/RAM for single instance
- Suitable for < 1000 concurrent users

### Horizontal Scaling
- Deploy multiple app instances behind load balancer
- Use Redis for shared rate limiting and caching
- Use database read replicas for read-heavy workloads
- Suitable for 1000+ concurrent users

### Multi-Region
- Deploy to multiple geographic regions
- Use geo-DNS for routing
- Implement data residency controls
- Suitable for global enterprise deployment

## Monitoring

### Health Checks
- Application: `/api/v1/health`
- Database: Checked by health endpoint
- Redis: Monitored by application
- Qdrant: Monitored by AI Gateway

### Metrics (Prometheus)
- HTTP request rate, latency, error rate
- AI provider latency, cost, error rate
- Database query performance
- Memory and CPU usage

### Dashboards (Grafana)
- Application overview
- AI Gateway metrics
- Database performance
- Infrastructure health

## Backup Strategy

### Database
- Daily full backups
- Point-in-time recovery (if supported)
- Test restore quarterly

### File Storage
- Cross-region replication
- Version retention policy

### Configuration
- Version control all configuration
- Backup environment variables securely

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"
```

#### Redis Connection
```bash
# Check Redis
redis-cli -u $REDIS_URL ping
```

#### AI Provider Issues
- Check provider health: `/api/v1/ai/health`
- Verify API keys in AI Gateway settings
- Check provider rate limits

#### Performance Issues
- Check slow queries in database
- Monitor memory usage
- Check AI provider latency
- Review rate limit logs
