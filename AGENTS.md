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
npm run docker:down  # Stop all services
docker compose logs -f api  # View API logs
```

## Database
- Prisma ORM with PostgreSQL
- Schema: `apps/api/prisma/schema.prisma`
- Always run `npx prisma generate` after modifying schema
- Migrations auto-run on Docker container start

## Environment Variables
- Copy `.env.example` to `.env` in root
- Required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- CORS_ORIGIN defaults to `http://localhost:4321` in dev

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

## Key Files
- `apps/api/src/index.ts` - Express entry point + Swagger docs
- `apps/api/src/routes/redirect.ts` - Performance-critical redirect
- `apps/api/src/lib/cache.ts` - Redis caching (TTL: 1 hour)
- `apps/api/src/lib/queue.ts` - BullMQ click processing
- `apps/frontend/src/components/` - React islands (client:load)
