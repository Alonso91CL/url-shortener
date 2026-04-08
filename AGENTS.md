# AGENTS.md - URL Shortener Project

## Git Workflow
- `master` - Production branch (protected)
- `develop` - Development branch (default)
- Create feature branches from `develop`

## Quick Start
```bash
# Install dependencies
npm install

# Start infrastructure (Postgres + Redis)
npm run docker:up

# Generate Prisma client (required after schema changes)
npx prisma generate --schema=apps/api/prisma/schema.prisma

# Run migrations
npx prisma migrate dev --schema=apps/api/prisma/schema.prisma

# Start development (all services)
npm run dev
```

## Scripts

### Development
```bash
npm run dev              # Start all services
npm run dev:frontend    # Frontend only (4321)
npm run dev:api          # API only (3000)
```

### Build & Test
```bash
npm run build           # Build all packages
npm run test            # Run tests
npm run lint            # Lint code
```

### Docker
```bash
npm run docker:up       # Start containers
npm run docker:down    # Stop containers
npm run docker:build    # Build production containers
```

## Project Structure
- `apps/frontend/` - Astro + React + Tailwind (port 4321)
- `apps/api/` - Express + Prisma + BullMQ (port 3000)
- Root uses Turborepo for orchestration

## Critical Commands

### API Development
```bash
cd apps/api
npm run dev          # Start with hot-reload (tsx watch)
npx prisma generate  # After schema changes
npx prisma migrate   # After schema changes
npm run test         # Run tests with coverage
```

### Docker
```bash
npm run docker:up     # Start all services
npm run docker:down  # Stop containers
docker compose logs -f api  # View API logs
docker compose exec redis redis-cli FLUSHALL  # Clear Redis cache
```

## Database
- Prisma ORM with PostgreSQL
- Schema: `apps/api/prisma/schema.prisma`
- Always run `npx prisma generate` after modifying schema
- Migrations auto-run on Docker container start

## Environment Variables

### Root `.env` (API & Backend)
- Copy `.env.example` to `.env` in root
- Required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- CORS_ORIGIN defaults to `http://localhost:4321` in dev

### Frontend `.env` (apps/frontend/.env)
Public variables exposed to the client (must start with PUBLIC_):
```env
PUBLIC_APP_BASE_URL=http://localhost:4321
PUBLIC_API_BASE_URL=http://localhost:3000
```

### Production URLs
```env
PUBLIC_APP_BASE_URL=https://linkly.pivotit.cl
PUBLIC_API_BASE_URL=https://linkly.pivotit.cl
```

## URL Redirect Flow
1. User accesses short URL: `https://linkly.pivotit.cl/r/abc123`
2. Frontend handles redirect via `apps/frontend/src/pages/r/[code].astro`
3. Frontend calls API internally with client headers (IP, User-Agent, Referer)
4. API processes click, stores analytics, returns original URL
5. Frontend redirects user to destination

This ensures:
- Users never connect directly to API
- Client IP/User-Agent captured for analytics
- Consistent URL structure under single domain

## API Routes
- `/api/v1/auth/*` - Authentication (JWT)
- `/api/v1/links/*` - Link CRUD
- `/api/v1/stats/*` - Analytics
- `/r/:code` - High-performance redirect (no /api prefix)
- `/api/docs` - Swagger UI
- `/health` - Health check

## Frontend Routes
- `/` - Landing page
- `/login`, `/register` - Auth pages
- `/dashboard` - Links management
- `/dashboard/:code` - Analytics for specific link
- `/r/:code` - Short URL redirect (handled by frontend)

## Key Files
- `apps/api/src/index.ts` - Express entry point + Swagger docs
- `apps/api/src/routes/redirect.ts` - Redirect route with client header passthrough
- `apps/api/src/services/linkService.ts` - Link business logic
- `apps/api/src/workers/clickProcessor.ts` - Click tracking + cache invalidation
- `apps/api/src/lib/cache.ts` - Redis caching (TTL: 1 hour)
- `apps/api/src/lib/queue.ts` - BullMQ click processing
- `apps/frontend/src/pages/r/[code].astro` - Short URL redirect handler
- `apps/frontend/src/utils/config.ts` - URL configuration utilities
- `apps/frontend/src/components/` - React islands (client:load)
