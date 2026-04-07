# syntax=docker/dockerfile:1

# ===========================================
# Base Stage (shared by dev and prod)
# ===========================================
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    wget \
    openssl

# Create data directory for GeoIP
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# ===========================================
# Development Stage
# ===========================================
FROM base AS development

# Copy API package files from apps/api
COPY apps/api/package*.json ./

# Copy root package-lock.json for npm workspaces
COPY package-lock.json ./

# Copy API source code
COPY apps/api .

# Install dependencies (include dev for development)
RUN npm ci

# Generate Prisma client
RUN node ./node_modules/prisma/build/index.js generate

# Development start command (skip migrations, start server directly)
CMD ["sh", "-c", "npm run dev"]

# ===========================================
# Production Stage
# ===========================================
FROM base AS production

# Copy API package files
COPY apps/api/package*.json ./

# Copy root package-lock.json for npm workspaces
COPY package-lock.json ./

# Copy API source code
COPY apps/api .

# Install dependencies (omit dev for production)
RUN npm ci --omit=dev && npm cache clean --force

# Generate Prisma client
RUN node ./node_modules/prisma/build/index.js generate

# Production start command (runs migrations then starts server)
CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js migrate deploy && npm start"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
