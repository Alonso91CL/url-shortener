// =============================================================================
// Authentication Controller
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { register, login, getUserById, updateUser, AuthError } from '../services/authService.js';
import { logger } from '../utils/logger.js';

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, name } = req.body;

    const result = await register({ email, password, name });

    res.status(201).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const statusCode = error.code === 'EMAIL_EXISTS' ? 409 : 400;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }

    logger.error('Register error', { error });
    res.status(500).json({
      error: 'Registration failed',
      code: 'SERVER_ERROR',
    });
  }
}

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    const result = await login({ email, password });

    res.json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(401).json({
        error: error.message,
        code: error.code,
      });
      return;
    }

    logger.error('Login error', { error });
    res.status(500).json({
      error: 'Login failed',
      code: 'SERVER_ERROR',
    });
  }
}

export async function getMeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const user = await getUserById(userId);

    res.json({
      data: user,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(404).json({
        error: error.message,
        code: error.code,
      });
      return;
    }

    logger.error('Get user error', { error });
    res.status(500).json({
      error: 'Failed to get user',
      code: 'SERVER_ERROR',
    });
  }
}

export async function updateMeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, password } = req.body;

    const user = await updateUser(userId, { name, password });

    res.json({
      data: user,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(400).json({
        error: error.message,
        code: error.code,
      });
      return;
    }

    logger.error('Update user error', { error });
    res.status(500).json({
      error: 'Failed to update user',
      code: 'SERVER_ERROR',
    });
  }
}
