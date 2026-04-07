// =============================================================================
// URL Shortener API - Express Application Entry Point
// =============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import 'dotenv/config';

// Import routes
import authRoutes from './routes/auth.js';
import linksRoutes from './routes/links.js';
import statsRoutes from './routes/stats.js';
import redirectRoutes from './routes/redirect.js';

// Import utilities and services
import { logger } from './utils/logger.js';
import { isRedisHealthy } from './lib/cache.js';
import { getClicksWorker, closeQueues } from './lib/queue.js';

// =============================================================================
// Initialize Express App
// =============================================================================

const app = express();

// =============================================================================
// Security Middleware
// =============================================================================

// Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// =============================================================================
// CORS Configuration
// =============================================================================

const corsOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || 
  (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:4321']);

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
}));

// =============================================================================
// Request Parsing
// =============================================================================

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// =============================================================================
// Compression
// =============================================================================

app.use(compression());

// =============================================================================
// Logging
// =============================================================================

// Custom Morgan stream for JSON logging
morgan.token('body', (req: Request) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    return JSON.stringify(req.body);
  }
  return '-';
});

const morganFormat = process.env.NODE_ENV === 'production'
  ? ':method :url :status :res[content-length] - :response-time ms'
  : 'dev';

app.use(morgan(morganFormat, {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
}));

// =============================================================================
// Trust Proxy (for proper IP detection behind reverse proxy)
// =============================================================================

app.set('trust proxy', 1);

// =============================================================================
// Health Check Endpoint
// =============================================================================

app.get('/health', async (_req: Request, res: Response) => {
  const redisHealthy = await isRedisHealthy();
  
  const status = redisHealthy ? 'healthy' : 'degraded';
  const statusCode = redisHealthy ? 200 : 503;
  
  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      redis: redisHealthy ? 'up' : 'down',
    },
    version: process.env.npm_package_version || '1.0.0',
  });
});

// =============================================================================
// API Routes
// =============================================================================

// Auth routes
app.use('/api/v1/auth', authRoutes);

// Links routes
app.use('/api/v1/links', linksRoutes);

// Stats routes
app.use('/api/v1/stats', statsRoutes);

// Redirect route (performance critical - no /api prefix)
app.use('/r', redirectRoutes);

// =============================================================================
// API Documentation (Swagger/OpenAPI)
// =============================================================================

if (process.env.NODE_ENV !== 'production') {
  import('swagger-ui-express').then((swaggerUi) => {
    const swaggerDocument = {
      openapi: '3.0.0',
      info: {
        title: 'URL Shortener API',
        version: '1.0.0',
        description: `API for URL Shortener with Analytics.
        
## Features
- User authentication with JWT
- Create and manage short links
- Track click analytics (devices, countries, referrers, browsers)
- Custom aliases for short links
- Link expiration

## Authentication
All protected endpoints require a Bearer token in the Authorization header.
Register a user and login to get a token.`,
        contact: {
          name: 'API Support',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
        {
          url: 'https://api.yourdomain.com',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from /api/v1/auth/login',
          },
        },
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid', description: 'User ID' },
              email: { type: 'string', format: 'email', description: 'User email' },
              name: { type: 'string', nullable: true, description: 'User name' },
              createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
            },
          },
          UserResponse: {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/User' },
              meta: { $ref: '#/components/schemas/Meta' },
            },
          },
          AuthResponse: {
            type: 'object',
            properties: {
              token: { type: 'string', description: 'JWT authentication token' },
              user: { $ref: '#/components/schemas/User' },
            },
          },
          Link: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid', description: 'Link ID' },
              code: { type: 'string', description: 'Short code' },
              originalUrl: { type: 'string', format: 'uri', description: 'Original URL' },
              isActive: { type: 'boolean', description: 'Link active status' },
              redirectType: { type: 'integer', enum: [301, 302], description: 'HTTP redirect type' },
              expiresAt: { type: 'string', format: 'date-time', nullable: true, description: 'Expiration date' },
              createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
              clickCount: { type: 'integer', description: 'Total click count' },
            },
          },
          LinkResponse: {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/Link' },
              meta: { $ref: '#/components/schemas/Meta' },
            },
          },
          LinkListResponse: {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/Link' } },
              meta: { $ref: '#/components/schemas/PaginationMeta' },
            },
          },
          OverviewStats: {
            type: 'object',
            properties: {
              totalClicks: { type: 'integer', description: 'Total clicks' },
              uniqueClicks: { type: 'integer', description: 'Unique clicks (by IP)' },
              firstClick: { type: 'string', format: 'date-time', nullable: true, description: 'First click timestamp' },
              lastClick: { type: 'string', format: 'date-time', nullable: true, description: 'Last click timestamp' },
            },
          },
          TimeSeriesData: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', description: 'Date (YYYY-MM-DD)' },
                clicks: { type: 'integer', description: 'Click count' },
              },
            },
          },
          DistributionData: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'Label (e.g., device type, country)' },
                value: { type: 'integer', description: 'Count' },
                percentage: { type: 'integer', description: 'Percentage of total' },
              },
            },
          },
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string', description: 'Error message' },
              code: { type: 'string', description: 'Error code' },
              details: { type: 'array', items: { type: 'object' }, description: 'Validation details' },
            },
          },
          Meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          PaginationMeta: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: 'Total items' },
              page: { type: 'integer', description: 'Current page' },
              limit: { type: 'integer', description: 'Items per page' },
              totalPages: { type: 'integer', description: 'Total pages' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Links', description: 'Link management endpoints' },
        { name: 'Stats', description: 'Analytics endpoints' },
        { name: 'Redirect', description: 'Short URL redirect endpoints' },
        { name: 'Health', description: 'Health check endpoints' },
      ],
      paths: {
        '/health': {
          get: {
            tags: ['Health'],
            summary: 'Health check',
            description: 'Check API health status',
            responses: {
              200: {
                description: 'API is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        timestamp: { type: 'string' },
                        services: { type: 'object' },
                        version: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/v1/auth/register': {
          post: {
            tags: ['Auth'],
            summary: 'Register a new user',
            description: 'Create a new user account',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                      email: { type: 'string', format: 'email', example: 'user@example.com' },
                      password: { type: 'string', minLength: 8, example: 'SecurePass123!' },
                      name: { type: 'string', example: 'John Doe' },
                    },
                  },
                },
              },
            },
            responses: {
              201: { description: 'User created successfully' },
              400: { description: 'Validation error' },
              409: { description: 'Email already exists' },
            },
          },
        },
        '/api/v1/auth/login': {
          post: {
            tags: ['Auth'],
            summary: 'Login user',
            description: 'Authenticate user and get JWT token',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                      email: { type: 'string', format: 'email', example: 'user@example.com' },
                      password: { type: 'string', example: 'SecurePass123!' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
              401: { description: 'Invalid credentials' },
            },
          },
        },
        '/api/v1/auth/me': {
          get: {
            tags: ['Auth'],
            summary: 'Get current user',
            description: 'Get the authenticated user profile',
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: 'User data', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserResponse' } } } },
              401: { description: 'Unauthorized' },
            },
          },
          put: {
            tags: ['Auth'],
            summary: 'Update current user',
            description: 'Update user profile (name or password)',
            security: [{ bearerAuth: [] }],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'New Name' },
                      password: { type: 'string', minLength: 8, example: 'NewPassword123!' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'User updated' },
              401: { description: 'Unauthorized' },
            },
          },
        },
        '/api/v1/links': {
          get: {
            tags: ['Links'],
            summary: 'List user links',
            description: 'Get paginated list of links owned by the authenticated user',
            security: [{ bearerAuth: [] }],
            parameters: [
              { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Items per page (max 100)' },
              { name: 'isActive', in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status' },
            ],
            responses: {
              200: { description: 'List of links', content: { 'application/json': { schema: { $ref: '#/components/schemas/LinkListResponse' } } } },
              401: { description: 'Unauthorized' },
            },
          },
          post: {
            tags: ['Links'],
            summary: 'Create a new short link',
            description: 'Create a new shortened URL',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['originalUrl'],
                    properties: {
                      originalUrl: { type: 'string', format: 'uri', example: 'https://example.com/very-long-url' },
                      alias: { type: 'string', example: 'my-alias', description: 'Custom short code (max 20 chars, alphanumeric and hyphens only)' },
                      expiresAt: { type: 'string', format: 'date-time', example: '2024-12-31T23:59:59Z', description: 'Expiration date' },
                      redirectType: { type: 'integer', enum: [301, 302], example: 302, description: '301 for permanent, 302 for temporary' },
                    },
                  },
                },
              },
            },
            responses: {
              201: { description: 'Link created', content: { 'application/json': { schema: { $ref: '#/components/schemas/LinkResponse' } } } },
              400: { description: 'Validation error' },
              401: { description: 'Unauthorized' },
              409: { description: 'Alias already taken' },
            },
          },
        },
        '/api/v1/links/{code}': {
          get: {
            tags: ['Links'],
            summary: 'Get link details',
            description: 'Get details of a specific link by code',
            security: [{ bearerAuth: [] }],
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, description: 'Short code' },
            ],
            responses: {
              200: { description: 'Link details' },
              401: { description: 'Unauthorized' },
              404: { description: 'Link not found' },
            },
          },
          patch: {
            tags: ['Links'],
            summary: 'Update link',
            description: 'Update link properties',
            security: [{ bearerAuth: [] }],
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, description: 'Short code' },
            ],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      isActive: { type: 'boolean', example: false },
                      redirectType: { type: 'integer', enum: [301, 302], example: 301 },
                      expiresAt: { type: 'string', format: 'date-time', nullable: true, example: null },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Link updated' },
              401: { description: 'Unauthorized' },
              404: { description: 'Link not found' },
            },
          },
          delete: {
            tags: ['Links'],
            summary: 'Delete link',
            description: 'Delete a link',
            security: [{ bearerAuth: [] }],
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, description: 'Short code' },
            ],
            responses: {
              204: { description: 'Link deleted' },
              401: { description: 'Unauthorized' },
              404: { description: 'Link not found' },
            },
          },
        },
        '/api/v1/stats/{code}/overview': {
          get: {
            tags: ['Stats'],
            summary: 'Get overview statistics',
            description: 'Get total clicks, unique clicks, and first/last click dates',
            security: [{ bearerAuth: [] }],
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, description: 'Short code' },
            ],
            responses: {
              200: { description: 'Overview stats', content: { 'application/json': { schema: { $ref: '#/components/schemas/OverviewStats' } } } },
              401: { description: 'Unauthorized' },
              404: { description: 'Link not found' },
            },
          },
        },
        '/api/v1/stats/{code}/timeseries': {
          get: {
            tags: ['Stats'],
            summary: 'Get clicks time series',
            description: 'Get click counts grouped by day',
            security: [{ bearerAuth: [] }],
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, description: 'Short code' },
              { name: 'days', in: 'query', schema: { type: 'integer', enum: [7, 30, 90], default: 7 }, description: 'Number of days (7, 30, or 90)' },
            ],
            responses: {
              200: { description: 'Time series data', content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeSeriesData' } } } },
              401: { description: 'Unauthorized' },
              404: { description: 'Link not found' },
            },
          },
        },
        '/api/v1/stats/{code}/devices': {
          get: {
            tags: ['Stats'],
            summary: 'Get device distribution',
            description: 'Get click counts by device type (desktop, mobile, tablet, bot)',
            security: [{ bearerAuth: [] }],
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, description: 'Short code' },
            ],
            responses: {
              200: { description: 'Device distribution', content: { 'application/json': { schema: { $ref: '#/components/schemas/DistributionData' } } } },
              401: { description: 'Unauthorized' },
              404: { description: 'Link not found' },
            },
          },
        },
        '/api/v1/stats/{code}/countries': {
          get: {
            tags: ['Stats'],
            summary: 'Get country distribution',
            description: 'Get top 10 countries by click count',
            security: [{ bearerAuth: [] }],
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, description: 'Short code' },
            ],
            responses: {
              200: { description: 'Country distribution', content: { 'application/json': { schema: { $ref: '#/components/schemas/DistributionData' } } } },
              401: { description: 'Unauthorized' },
              404: { description: 'Link not found' },
            },
          },
        },
        '/api/v1/stats/{code}/referrers': {
          get: {
            tags: ['Stats'],
            summary: 'Get referrer distribution',
            description: 'Get top 10 referrers (traffic sources)',
            security: [{ bearerAuth: [] }],
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, description: 'Short code' },
            ],
            responses: {
              200: { description: 'Referrer distribution' },
              401: { description: 'Unauthorized' },
              404: { description: 'Link not found' },
            },
          },
        },
        '/api/v1/stats/{code}/browsers': {
          get: {
            tags: ['Stats'],
            summary: 'Get browser distribution',
            description: 'Get top 5 browsers by click count',
            security: [{ bearerAuth: [] }],
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, description: 'Short code' },
            ],
            responses: {
              200: { description: 'Browser distribution', content: { 'application/json': { schema: { $ref: '#/components/schemas/DistributionData' } } } },
              401: { description: 'Unauthorized' },
              404: { description: 'Link not found' },
            },
          },
        },
        '/r/{code}': {
          get: {
            tags: ['Redirect'],
            summary: 'Redirect to original URL',
            description: 'Follow the shortened URL and redirect to the original page. Also tracks the click.',
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, description: 'Short code' },
            ],
            responses: {
              301: { description: 'Permanent redirect (301)' },
              302: { description: 'Temporary redirect (302)' },
              404: { description: 'Link not found' },
              410: { description: 'Link expired or deactivated' },
            },
          },
        },
      },
    };

    // Serve Swagger UI at /api/docs
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { font-size: 2.5em; }
      `,
      customSiteTitle: 'URL Shortener API Documentation',
      customfavIcon: '/favicon.ico',
    }));

    // Also serve OpenAPI spec as JSON
    app.get('/api/docs.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocument);
    });
  });
}

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR',
    });
  } else {
    res.status(500).json({
      error: err.message,
      code: 'SERVER_ERROR',
      stack: err.stack,
    });
  }
});

// =============================================================================
// Start Server
// =============================================================================

const PORT = parseInt(process.env.API_PORT || '3000', 10);

async function startServer() {
  try {
    // Start the BullMQ worker
    getClicksWorker();
    logger.info('BullMQ worker started');

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await closeQueues();
          logger.info('All queues closed');
        } catch (error) {
          logger.error('Error closing queues', { error });
        }

        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
