# Build stage - run tests
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Run tests
RUN npm test -- --run

# Production image - use tsx for ESM support
FROM node:20-alpine

WORKDIR /app

# Copy package files and install all deps (tsx needed for runtime)
COPY package*.json ./
RUN npm ci

# Copy source (run directly with tsx)
COPY tsconfig.json ./
COPY src ./src

# Run as non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Environment
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

# Run with tsx for ESM/TypeScript support
CMD ["npx", "tsx", "src/index.ts"]
