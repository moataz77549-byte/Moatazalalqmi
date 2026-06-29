# Moataz AI - High Reliability Production Dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl bash
WORKDIR /app

# Step 1: Install Dependencies
FROM base AS deps
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN npm install -g bun && bun install

# Step 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Ensure Prisma is generated during build time
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build

# Step 3: Final Production Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 moataz

# Copy standalone build assets
COPY --from=builder --chown=moataz:nodejs /app/.next/standalone ./
COPY --from=builder --chown=moataz:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=moataz:nodejs /app/public ./public
COPY --from=builder --chown=moataz:nodejs /app/prisma ./prisma
COPY --from=builder --chown=moataz:nodejs /app/scripts/start.sh ./scripts/start.sh

# Ensure prisma internal modules are present in the runner
# We copy only necessary parts of node_modules to keep image size small
COPY --from=builder --chown=moataz:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=moataz:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER moataz
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

CMD ["sh", "./scripts/start.sh"]
