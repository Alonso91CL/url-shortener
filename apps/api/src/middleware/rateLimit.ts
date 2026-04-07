// =============================================================================
// Rate Limiting Middleware
// =============================================================================

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Rate limiter for link creation
 * Configurable via environment variables
 */
export function createLinkRateLimiter() {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  const maxLinks = parseInt(process.env.RATE_LIMIT_MAX_LINKS || '10', 10);

  return rateLimit({
    windowMs,
    max: maxLinks,
    message: {
      error: `Too many link creation requests. Maximum ${maxLinks} links per minute.`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.id || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded for link creation', {
        userId: req.user?.id,
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        error: `Too many link creation requests. Maximum ${maxLinks} links per minute.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
}

/**
 * Rate limiter for authentication endpoints
 * Stricter limits to prevent brute force attacks
 */
export function createAuthRateLimiter() {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per hour per IP
    message: {
      error: 'Too many authentication attempts. Please try again in an hour.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: 3600,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      return `${req.ip}-auth`;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Auth rate limit exceeded', {
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        error: 'Too many authentication attempts. Please try again in an hour.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: 3600,
      });
    },
  });
}

/**
 * Rate limiter for general API endpoints
 */
export function createAPIRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
      error: 'Too many requests. Please slow down.',
      code: 'API_RATE_LIMIT_EXCEEDED',
      retryAfter: 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      return req.user?.id || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      logger.warn('API rate limit exceeded', {
        userId: req.user?.id,
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        error: 'Too many requests. Please slow down.',
        code: 'API_RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
      });
    },
  });
}

/**
 * Rate limiter for redirect endpoint
 * Higher limits since this is performance-critical
 */
export function createRedirectRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // 1000 redirects per minute
    message: {
      error: 'Too many redirect requests.',
      code: 'REDIRECT_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      return req.ip || 'unknown';
    },
    // Don't log every rate limit event to avoid log spam
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many redirect requests.',
        code: 'REDIRECT_RATE_LIMIT_EXCEEDED',
      });
    },
  });
}
