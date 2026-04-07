# URL Shortener with Analytics

A production-ready URL shortener API built with Express, Prisma, Redis, and BullMQ. Features include user authentication, link management, and comprehensive click analytics.

![Node.js](https://img.shields.io/badge/Node.js-20%2B-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.10-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- npm or yarn

### Installation

1. **Clone and navigate to the API directory:**
   ```bash
   cd apps/api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp ../../.env.example .env
   ```
   
   Update the `.env` file with your configuration. At minimum:
   - `DATABASE_URL` - PostgreSQL connection string
   - `REDIS_URL` - Redis connection string
   - `JWT_SECRET` - A secure secret for JWT signing (min 32 characters)

4. **Generate Prisma client and run migrations:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### Development

- **Watch mode with auto-reload:**
  ```bash
  npm run dev
  ```

- **Run tests:**
  ```bash
  npm run test
  ```

- **Run tests with coverage:**
  ```bash
  npm run test:coverage
  ```

- **Build for production:**
  ```bash
  npm run build
  npm start
  ```

- **Run Prisma Studio (database GUI):**
  ```bash
  npm run prisma:studio
  ```

### Production

For production deployment, use Docker Compose:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

---

## Environment Variables

All configuration is done through environment variables. Copy `.env.example` to `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | (required, min 32 chars) |
| `JWT_EXPIRES_IN` | JWT token expiration | `24h` |
| `SALT_ROUNDS` | Bcrypt salt rounds | `12` |
| `IP_HASH_SALT` | Salt for IP hashing | (required) |
| `APP_BASE_URL` | Frontend base URL | `http://localhost:4321` |
| `API_PORT` | API server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:4321` |
| `GEOIP_DB_PATH` | MaxMind GeoLite2 database path | `./data/GeoLite2-City.mmdb` |
| `BULL_CONCURRENCY` | BullMQ worker concurrency | `5` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `60000` |
| `RATE_LIMIT_MAX_LINKS` | Max links per user per window | `10` |

---

## API Documentation

### Swagger UI

Interactive API documentation is available at:
```
http://localhost:3000/api/docs
```

### OpenAPI Spec

The OpenAPI specification (JSON) is available at:
```
http://localhost:3000/api/docs.json
```

### Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### Health Check
```
GET /health
```

#### Authentication
```
POST /api/v1/auth/register    - Register new user
POST /api/v1/auth/login       - Login and get token
GET  /api/v1/auth/me          - Get current user profile
PUT  /api/v1/auth/me          - Update user profile
```

#### Links
```
GET    /api/v1/links                - List user's links (paginated)
POST   /api/v1/links                - Create a new short link
GET    /api/v1/links/:code          - Get link details
PATCH  /api/v1/links/:code          - Update link
DELETE /api/v1/links/:code         - Delete link
```

#### Analytics
```
GET /api/v1/stats/:code/overview    - Overview stats (total/unique clicks)
GET /api/v1/stats/:code/timeseries - Click time series (7/30/90 days)
GET /api/v1/stats/:code/devices     - Device distribution
GET /api/v1/stats/:code/countries   - Country distribution (top 10)
GET /api/v1/stats/:code/referrers   - Referrer distribution (top 10)
GET /api/v1/stats/:code/browsers   - Browser distribution (top 5)
```

#### Redirects
```
GET /r/:code                        - Follow short URL and redirect
```

---

## Architecture

### Technology Stack

- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Cache:** Redis with ioredis
- **Queue:** BullMQ for async click processing
- **Authentication:** JWT with bcrypt password hashing

### API Structure

```
src/
├── controllers/        # Request handlers
│   ├── authController.ts
│   ├── linksController.ts
│   └── statsController.ts
├── services/          # Business logic
│   ├── authService.ts
│   ├── linkService.ts
│   └── analyticsService.ts
├── routes/            # Route definitions
│   ├── auth.ts
│   ├── links.ts
│   ├── stats.ts
│   └── redirect.ts
├── middleware/        # Express middleware
│   ├── auth.ts
│   ├── rateLimit.ts
│   └── validate.ts
├── lib/               # Utilities
│   ├── cache.ts        # Redis caching
│   ├── queue.ts        # BullMQ queue
│   ├── geo.ts         # GeoIP lookup
│   └── hash.ts        # IP hashing
├── db/
│   └── prisma.ts      # Prisma client
└── index.ts           # App entry point
```

### Redis Caching

The API uses Redis for caching to improve performance:
- Link data (short codes) - TTL: 1 hour
- Analytics stats - TTL: 5 minutes

Cache is automatically invalidated when links are updated or deleted.

### BullMQ Workers

Click tracking is processed asynchronously via BullMQ:
- Click data is enqueued on each redirect
- Workers process clicks in batches
- GeoIP lookup and device parsing happens in the background

### Database Schema

```
User
├── id (UUID)
├── email (unique)
├── passwordHash
├── name
└── createdAt

Link
├── id (UUID)
├── code (unique, indexed)
├── originalUrl
├── userId (FK)
├── isActive
├── redirectType (301/302)
├── expiresAt (optional)
└── createdAt

Click
├── id (UUID)
├── linkId (FK)
├── clickedAt
├── ipHash (anonymized)
├── country
├── city
├── deviceType
├── os
├── browser
├── referer
└── timestamp
```

---

## Deployment

### Docker Compose (Recommended)

The easiest way to run the full stack:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- API on port 3000
- Prisma Studio on port 5555

### Manual Deployment

1. Set up PostgreSQL and Redis
2. Configure environment variables
3. Build: `npm run build`
4. Run migrations: `npm run prisma:migrate:prod`
5. Start: `npm start`

### Platform Deployment

#### Railway/Render
- Set environment variables in dashboard
- Add PostgreSQL and Redis addons
- Set build command: `npm run build`
- Set start command: `npm run prisma:migrate:prod && npm start`

#### Vercel/Netlify
- Deploy as a serverless function (API only)
- Requires external PostgreSQL and Redis (e.g., Neon, Upstash)

---

## Testing

### Test Structure

```
tests/
├── setup.ts         # Test configuration and utilities
├── auth.test.ts     # Authentication tests
├── links.test.ts    # Link management tests
└── analytics.test.ts # Analytics tests
```

### Running Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/auth.test.ts

# Watch mode
npx vitest
```

### Test Coverage

The test suite targets 60% coverage on services. Run with coverage to see detailed reports.

---

## License

MIT License - see [LICENSE](../../LICENSE) for details.
