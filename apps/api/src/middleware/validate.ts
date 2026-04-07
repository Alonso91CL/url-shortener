// =============================================================================
// Validation Middleware using Zod
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger.js';

// =============================================================================
// Auth Schemas
// =============================================================================

/**
 * Registration validation schema
 * - Email: valid email format
 * - Password: min 8 chars, at least 1 uppercase, at least 1 number
 * - Name: optional, max 100 chars
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine(
      (password) => /[A-Z]/.test(password),
      'Password must contain at least 1 uppercase letter'
    )
    .refine(
      (password) => /[0-9]/.test(password),
      'Password must contain at least 1 number'
    ),
  name: z.string().max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login validation schema
 * - Email: valid email format
 * - Password: required
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Update user validation schema
 * - Name: optional, max 100 chars
 * - Password: optional, min 8 chars, at least 1 uppercase, at least 1 number
 */
export const updateUserSchema = z.object({
  name: z.string().max(100).optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine(
      (password) => /[A-Z]/.test(password),
      'Password must contain at least 1 uppercase letter'
    )
    .refine(
      (password) => /[0-9]/.test(password),
      'Password must contain at least 1 number'
    )
    .optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// =============================================================================
// Link Schemas
// =============================================================================

/**
 * URL validation - ensures proper http/https format
 */
function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Create link validation schema
 */
export const createLinkSchema = z.object({
  originalUrl: z
    .string()
    .url('Invalid URL format')
    .refine(
      (url) => validateURL(url),
      { message: 'URL must be a valid HTTP or HTTPS URL' }
    ),
  alias: z.string().max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Alias can only contain letters, numbers, underscore and hyphen').optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  redirectType: z.number().int().min(301).max(302).default(302),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;

/**
 * Update link validation schema
 */
export const updateLinkSchema = z.object({
  isActive: z.boolean().optional(),
  redirectType: z.number().int().min(301).max(302).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;

// =============================================================================
// Validation Middleware
// =============================================================================

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        
        res.status(422).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details,
        });
        return;
      }
      
      logger.error('Validation error', { error });
      res.status(500).json({
        error: 'Validation error',
        code: 'SERVER_ERROR',
      });
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        
        res.status(422).json({
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details,
        });
        return;
      }
      
      logger.error('Query validation error', { error });
      res.status(500).json({
        error: 'Validation error',
        code: 'SERVER_ERROR',
      });
    }
  };
}
