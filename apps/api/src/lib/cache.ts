// =============================================================================
// Redis Cache Utilities
// =============================================================================

import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

// Redis client singleton
let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });
  }

  return redis;
}

// Cache keys
export const CACHE_KEYS = {
  link: (code: string) => `link:${code}`,
  linkStats: (code: string) => `stats:${code}`,
} as const;

// TTL values in seconds
export const CACHE_TTL = {
  LINK: 3600, // 1 hour
  STATS: 300, // 5 minutes
} as const;

/**
 * Get a cached value
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const value = await redis.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  } catch (error) {
    logger.error('Cache get error', { key, error });
    return null;
  }
}

/**
 * Set a cached value with TTL
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.error('Cache set error', { key, error });
  }
}

/**
 * Delete a cached value
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch (error) {
    logger.error('Cache delete error', { key, error });
  }
}

/**
 * Delete all cached values matching a pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    const redis = getRedis();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    logger.error('Cache delete pattern error', { pattern, error });
  }
}

/**
 * Check if Redis is healthy
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = getRedis();
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
