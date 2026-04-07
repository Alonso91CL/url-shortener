// =============================================================================
// Test Setup - Database & Environment Configuration
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Test database URL - configure this in your environment or CI pipeline
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/url_shortener_test?schema=public';

// Global test database client (re-exported from Prisma)
export let prisma: PrismaClient;

/**
 * Initialize test database connection
 */
export async function setupDatabase(): Promise<void> {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
  process.env.JWT_EXPIRES_IN = '24h';
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.API_PORT = '3001';
  process.env.SALT_ROUNDS = '4'; // Faster bcrypt for tests
  process.env.IP_HASH_SALT = 'test-ip-salt';

  // Mock Redis to avoid connection issues in tests
  vi.mock('../src/lib/cache.js', () => ({
    cacheGet: vi.fn().mockResolvedValue(null),
    cacheSet: vi.fn().mockResolvedValue('OK'),
    cacheDelete: vi.fn().mockResolvedValue(1),
    CACHE_KEYS: {
      link: (code: string) => `link:${code}`,
      linkStats: (linkId: string) => `link:${linkId}:stats`,
    },
    CACHE_TTL: {
      LINK: 3600,
      STATS: 300,
    },
  }));

  // Mock BullMQ queue
  vi.mock('../src/lib/queue.js', () => ({
    enqueueClick: vi.fn().mockResolvedValue(undefined),
    getClicksWorker: vi.fn(),
    closeQueues: vi.fn().mockResolvedValue(undefined),
  }));

  // Initialize Prisma client
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: TEST_DATABASE_URL,
      },
    },
    log: ['error', 'warn'],
  });

  // Connect to database
  await prisma.$connect();
}

/**
 * Run database migrations - resets schema for testing
 */
export async function runMigrations(): Promise<void> {
  // Delete all data from tables (cleanup for fresh test state)
  try {
    await prisma.click.deleteMany({});
    await prisma.link.deleteMany({});
    await prisma.user.deleteMany({});
  } catch (error) {
    // If tables don't exist, let Prisma handle the schema
    console.log('Tables may not exist yet, Prisma will handle schema');
  }
}

/**
 * Clean up database between tests
 */
export async function cleanupDatabase(): Promise<void> {
  try {
    // Delete in order to respect foreign keys
    await prisma.click.deleteMany({});
    await prisma.link.deleteMany({});
    await prisma.user.deleteMany({});
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

/**
 * Close all connections
 */
export async function teardownDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

// =============================================================================
// Vitest Hooks
// =============================================================================

beforeAll(async () => {
  await setupDatabase();
  await runMigrations();
});

afterAll(async () => {
  await teardownDatabase();
});

beforeEach(async () => {
  await cleanupDatabase();
});

afterEach(async () => {
  vi.clearAllMocks();
});

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Generate a unique test email
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Get auth headers for requests
 */
export function getAuthHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}
