## Dockerfile for Next.js standalone + Payload CMS
# Uses Bun for faster builds, and runs the standalone server with Node
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

FROM node:20-alpine AS runner
WORKDIR /app

# Copy standalone output and static assets
COPY --from=builder /app/.next/standalone .
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=10000

# Expose port for Render (optional)
EXPOSE 10000

# Start the standalone server (server.js is at root of standalone copy)
CMD ["node", "server.js"]
