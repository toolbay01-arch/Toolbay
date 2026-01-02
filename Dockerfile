## Dockerfile for Next.js standalone + Payload CMS
# Uses Bun for faster builds, and runs the standalone server with Node
# Updated: 2026-01-02 - Using Bun with bun.lock
FROM oven/bun:1 AS deps
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build Next.js (output: 'standalone' expected in next.config.mjs)
RUN bun run build

# Verify standalone build was created
RUN ls -la .next/standalone && \
    test -f .next/standalone/server.js || (echo "ERROR: server.js not found in standalone build!" && exit 1)

FROM node:20-alpine AS runner
WORKDIR /app

# Install production dependencies that may be missing from standalone
# ws is required by web-push but not always included in standalone
RUN apk add --no-cache libc6-compat

# Copy standalone output and static assets
COPY --from=builder /app/.next/standalone .
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy node_modules for packages not included in standalone
# This ensures ws and other native modules are available
COPY --from=builder /app/node_modules ./node_modules

# Copy startup script
COPY start-server.sh ./start-server.sh
RUN chmod +x ./start-server.sh

ENV NODE_ENV=production

# Railway provides PORT dynamically - don't hardcode it
# Default to 3000 for local testing, but Railway will override
ENV PORT=3000

# Expose port (Railway will use its own PORT env var)
EXPOSE 3000

# Start the standalone server using the startup script
CMD ["./start-server.sh"]
