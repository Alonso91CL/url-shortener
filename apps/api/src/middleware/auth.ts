// =============================================================================
// Authentication Middleware
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
      };
    }
  }
}

interface JWTPayload {
  id: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Authentication middleware - validates JWT token
 * Attaches user data to req.user if valid
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authorization header missing or invalid',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        error: 'Token not provided',
        code: 'TOKEN_MISSING',
      });
      return;
    }

    // Verify and decode token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({
        error: 'Server configuration error',
        code: 'SERVER_ERROR',
      });
      return;
    }

    const decoded = jwt.verify(token, secret) as JWTPayload;

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    logger.error('Authentication error', { error });
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Optional authentication - attaches user if token present but doesn't require it
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;
    
    if (!token || !secret) {
      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as JWTPayload;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true },
      });

      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore token errors for optional auth
    }

    next();
  } catch (error) {
    logger.error('Optional auth error', { error });
    next();
  }
}
