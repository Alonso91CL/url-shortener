# URL Shortener with Analytics

A fullstack portfolio project demonstrating modern web development with high-performance URL shortening and real-time analytics.

## Features

- **URL Shortening**: Create short links with optional custom aliases
- **Analytics Dashboard**: Track clicks, devices, countries, browsers, and referrers
- **Authentication**: JWT-based user authentication
- **High Performance**: Sub-20ms redirects with Redis caching
- **Async Processing**: BullMQ for click event processing
- **Responsive UI**: Modern Astro + React frontend

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Astro 4 + React + Tailwind CSS |
| Backend | Node.js 20 + Express |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Queue | BullMQ |
| ORM | Prisma |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Installation

```bash
# Clone and install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start infrastructure (Postgres + Redis)
npm run docker:up

# Generate Prisma client
cd apps/api && npx prisma generate

# Run database migrations
cd apps/api && npx prisma migrate dev

# Start development
npm run dev
```

### Access Points

- **Frontend**: http://localhost:4321
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

## Project Structure

```
url-shortener/
├── apps/
│   ├── frontend/           # Astro + React + Tailwind
│   │   ├── src/
│   │   │   ├── pages/     # Astro pages
│   │   │   ├── components/ # React islands
│   │   │   └── layouts/   # Base layout
│   │   └── package.json
│   └── api/               # Express + Prisma
│       ├── src/
│       │   ├── routes/     # API endpoints
│       │   ├── services/    # Business logic
│       │   ├── middleware/  # Auth, validation
│       │   ├── lib/        # Cache, queue, geo
│       │   └── workers/    # BullMQ processors
│       ├── prisma/         # Schema & migrations
│       └── package.json
├── docker-compose.yml      # Development
├── docker-compose.prod.yml # Production
├── turbo.json             # Monorepo config
└── package.json            # Root workspace
```

## Scripts

```bash
# Development
npm run dev              # Start all services
npm run dev:frontend     # Frontend only (4321)
npm run dev:api           # API only (3000)

# Build & Test
npm run build            # Build all packages
npm run test             # Run tests
npm run lint             # Lint code

# Docker
npm run docker:up        # Start containers
npm run docker:down      # Stop containers
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/auth/me` | Get current user |
| PUT | `/api/v1/auth/me` | Update user |

### Links
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/links` | List user's links |
| POST | `/api/v1/links` | Create link |
| GET | `/api/v1/links/:code` | Get link details |
| PATCH | `/api/v1/links/:code` | Update link |
| DELETE | `/api/v1/links/:code` | Delete link |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/stats/:code/overview` | Overview stats |
| GET | `/api/v1/stats/:code/timeseries` | Clicks by day |
| GET | `/api/v1/stats/:code/devices` | Device breakdown |
| GET | `/api/v1/stats/:code/countries` | Geographic data |
| GET | `/api/v1/stats/:code/referrers` | Traffic sources |
| GET | `/api/v1/stats/:code/browsers` | Browser stats |

### Redirect
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/r/:code` | Redirect to original URL |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | - | PostgreSQL connection string |
| `REDIS_URL` | - | Redis connection string |
| `JWT_SECRET` | - | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | `24h` | Token expiration |
| `SALT_ROUNDS` | `12` | Bcrypt cost factor |
| `IP_HASH_SALT` | - | Salt for IP hashing |
| `APP_BASE_URL` | `http://localhost:4321` | Frontend URL |
| `API_PORT` | `3000` | API port |
| `CORS_ORIGIN` | `http://localhost:4321` | CORS allowed origin |
| `BULL_CONCURRENCY` | `5` | Worker concurrency |

## Architecture

### Redirect Flow (Critical Path)
1. User accesses `/r/:code`
2. Check Redis cache (`link:{code}`)
3. On cache miss, query PostgreSQL
4. Return HTTP 302 with `Location` header
5. Enqueue click event (fire-and-forget)

### Click Processing Pipeline
1. BullMQ worker receives click job
2. Parse user-agent (device, OS, browser)
3. Hash IP with SHA-256 + salt
4. Lookup geo location (GeoIP)
5. Persist to PostgreSQL `clicks` table

### Caching Strategy
- Redirects cached in Redis with 1-hour TTL
- Cache key format: `link:{code}`
- Automatic invalidation on link update/delete

## Deployment

### Development
```bash
docker compose up -d
```

### Production (Railway/Render)
1. Set environment variables in dashboard
2. Connect GitHub repository
3. Deploy with `docker-compose -f docker-compose.prod.yml`

### External Services Required
- **PostgreSQL**: Railway, Supabase, or Neon
- **Redis**: Upstash, Redis Cloud, or self-hosted

## License

MIT
