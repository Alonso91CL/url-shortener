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

# Frontend also needs its own .env for PUBLIC_ variables
cp .env.example apps/frontend/.env

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
- **Short URL**: http://localhost:4321/r/{code}

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

### Root `.env` (API & Backend)
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

### Frontend `.env` (apps/frontend/.env)
Public variables exposed to the client (must start with PUBLIC_):
| Variable | Default | Description |
|----------|---------|-------------|
| `PUBLIC_APP_BASE_URL` | `http://localhost:4321` | Frontend base URL |
| `PUBLIC_API_BASE_URL` | `http://localhost:3000` | API base URL |

**Production example:**
```env
PUBLIC_APP_BASE_URL=https://linkly.pivotit.cl
PUBLIC_API_BASE_URL=https://linkly.pivotit.cl
```

## Architecture

### Redirect Flow (User-facing)
1. User accesses `/r/:code` on frontend
2. Frontend calls API internally with client headers (IP, User-Agent, Referer)
3. API checks Redis cache (`link:{code}`)
4. On cache miss, query PostgreSQL
5. API returns JSON with original URL
6. Frontend performs redirect to destination
7. Enqueue click event (fire-and-forget)

### Click Processing Pipeline
1. BullMQ worker receives click job
2. Parse user-agent (device, OS, browser)
3. Hash IP with SHA-256 + salt
4. Lookup geo location (GeoIP)
5. Persist to PostgreSQL `clicks` table
6. Invalidate stats cache for real-time updates

### Caching Strategy
- Links cached in Redis with 1-hour TTL
- Cache key format: `link:{code}`
- Stats cache invalidated on new clicks (real-time analytics)
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

### VPS/EC2 Deployment (Ubuntu Server)

This guide covers deploying on a VPS or EC2 instance with Ubuntu 22.04+, using nginx as reverse proxy and PM2 for process management.

#### Prerequisites

- Ubuntu 22.04+ server
- Domain configured with DNS A records:
  - `linkly.midominio.com` → Server IP
  - `linkly-api.midominio.com` → Server IP
- SSH access to the server

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### 2. Project Setup

```bash
# Clone repository
git clone https://github.com/Alonso91CL/url-shortener.git
cd url-shortener

# Install dependencies
npm install

# Copy environment files
cp .env.example .env
mkdir -p apps/frontend && cp .env.example apps/frontend/.env
```

#### 3. Configure Environment Variables

Edit `.env` (root):
```env
# Database
DATABASE_URL=postgresql://shortener:YOUR_SECURE_PASSWORD@localhost:5432/shortener

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=YOUR_VERY_SECURE_SECRET_KEY_MIN_32_CHARS
JWT_EXPIRES_IN=7d
SALT_ROUNDS=12
IP_HASH_SALT=YOUR_IP_HASH_SALT

# Application
NODE_ENV=production
APP_BASE_URL=https://linkly.midominio.com
API_PORT=3000

# CORS
CORS_ORIGIN=https://linkly.midominio.com

# GeoIP
GEOIP_DB_PATH=./data/GeoLite2-City.mmdb

# BullMQ
BULL_CONCURRENCY=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_LINKS=10
```

Edit `apps/frontend/.env`:
```env
PUBLIC_APP_BASE_URL=https://linkly.midominio.com
PUBLIC_API_BASE_URL=https://linkly-api.midominio.com
```

#### 4. Install PostgreSQL and Redis

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE USER shortener WITH PASSWORD 'YOUR_SECURE_PASSWORD';
CREATE DATABASE shortener OWNER shortener;
GRANT ALL PRIVILEGES ON DATABASE shortener TO shortener;
\q
EOF

# Install Redis
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Configure Redis persistence
sudo nano /etc/redis/redis.conf
# Change: maxmemory 256mb
# Change: maxmemory-policy allkeys-lru
sudo systemctl restart redis-server
```

#### 5. Download GeoIP Database (Optional but recommended)

```bash
# Register at https://dev.maxmind.com/geoip/geoip2/geolite2/
# Download GeoLite2-City.tar.gz
mkdir -p data
tar -xzf GeoLite2-City.tar.gz -C data/
mv data/GeoLite2-City_*/GeoLite2-City.mmdb data/
```

#### 6. Build Applications

```bash
# Generate Prisma client
cd apps/api && npx prisma generate
cd ../..

# Build frontend
cd apps/frontend && npm run build
cd ../..

# Start with PM2
cd apps/api
pm2 start src/index.ts --name url-shortener-api --watch

cd ../frontend
pm2 start dist/server/entry.mjs --name url-shortener-frontend

# Save PM2 process list
pm2 save

# Setup PM2 startup script
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

#### 7. Configure Nginx

Create API nginx config:
```bash
sudo nano /etc/nginx/sites-available/linkly-api.midominio.com
```

```nginx
server {
    listen 80;
    server_name linkly-api.midominio.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name linkly-api.midominio.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/linkly-api.midominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/linkly-api.midominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types application/json text/plain;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /health {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
}
```

Create Frontend nginx config:
```bash
sudo nano /etc/nginx/sites-available/linkly.midominio.com
```

```nginx
server {
    listen 80;
    server_name linkly.midominio.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name linkly.midominio.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/linkly.midominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/linkly.midominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://linkly-api.midominio.com;" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    root /path/to/url-shortener/apps/frontend/dist/client;

    index index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy - forward /api/* to API server
    location /api/ {
        proxy_pass https://linkly-api.midominio.com/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Redirect /r/* to frontend (SPA handles it)
    location /r/ {
        try_files $uri /index.html;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

Enable sites and test:
```bash
sudo ln -s /etc/nginx/sites-available/linkly.midominio.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/linkly-api.midominio.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 8. SSL Certificates with Let's Encrypt

```bash
# API domain
sudo certbot --nginx -d linkly-api.midominio.com

# Frontend domain
sudo certbot --nginx -d linkly.midominio.com

# Auto-renewal (already configured by certbot)
sudo systemctl status certbot.timer
```

#### 9. Database Migrations

```bash
cd /path/to/url-shortener/apps/api
pm2 restart url-shortener-api
# Migrations run automatically on startup, or manually:
npx prisma migrate deploy
```

#### 10. Firewall Configuration

```bash
# UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

#### 11. Monitoring and Logs

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs url-shortener-api
pm2 logs url-shortener-frontend

# Restart services
pm2 restart all

# Nginx logs
sudo tail -f /var/log/nginx/linkly.midominio.com-access.log
sudo tail -f /var/log/nginx/linkly-api.midominio.com-access.log
```

#### 12. Cron Jobs (Optional)

```bash
# Add to crontab for automatic certificate renewal
sudo crontab -e

# Add this line:
0 0 * * * certbot renew --quiet
```

#### Troubleshooting

```bash
# Check if services are running
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server
pm2 status

# Check ports
sudo ss -tlnp | grep -E ':(80|443|3000|5432|6379)'

# Restart everything
sudo systemctl restart nginx postgresql redis-server
pm2 restart all

# Database connection test
psql -h localhost -U shortener -d shortener
```

### External Services Required
- **PostgreSQL**: Self-hosted (installed above) or Railway, Supabase, or Neon
- **Redis**: Self-hosted (installed above) or Upstash, Redis Cloud

## License

MIT
