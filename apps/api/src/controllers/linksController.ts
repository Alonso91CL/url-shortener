// =============================================================================
// Links Controller
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { createLink, listLinks, getLinkByCodeForOwner, updateLink, deleteLink, LinkError } from '../services/linkService.js';
import { logger } from '../utils/logger.js';

export async function createLinkHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const { originalUrl, alias, expiresAt, redirectType } = req.body;

    const link = await createLink({
      originalUrl,
      userId,
      alias,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      redirectType,
    });

    res.status(201).json({
      data: link,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof LinkError) {
      const statusCode = error.code === 'ALIAS_TAKEN' ? 409 : 400;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }

    logger.error('Create link error', { error });
    res.status(500).json({
      error: 'Failed to create link',
      code: 'SERVER_ERROR',
    });
  }
}

export async function listLinksHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isActive = req.query.isActive === 'true' 
      ? true 
      : req.query.isActive === 'false' 
        ? false 
        : undefined;

    const result = await listLinks(userId, { page, limit, isActive });

    res.json({
      data: result.data,
      meta: {
        ...result.meta,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('List links error', { error });
    res.status(500).json({
      error: 'Failed to list links',
      code: 'SERVER_ERROR',
    });
  }
}

export async function getLinkHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { code } = req.params;

    const link = await getLinkByCodeForOwner(code, userId);

    res.json({
      data: {
        id: link.id,
        code: link.code,
        originalUrl: link.originalUrl,
        isActive: link.isActive,
        redirectType: link.redirectType,
        expiresAt: link.expiresAt,
        createdAt: link.createdAt,
        clickCount: link.clickCount,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof LinkError) {
      res.status(404).json({
        error: error.message,
        code: error.code,
      });
      return;
    }

    logger.error('Get link error', { error });
    res.status(500).json({
      error: 'Failed to get link',
      code: 'SERVER_ERROR',
    });
  }
}

export async function updateLinkHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { code } = req.params;
    const { isActive, redirectType, expiresAt } = req.body;

    const link = await updateLink(code, userId, {
      isActive,
      redirectType,
      expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
    });

    res.json({
      data: link,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    if (error instanceof LinkError) {
      res.status(404).json({
        error: error.message,
        code: error.code,
      });
      return;
    }

    logger.error('Update link error', { error });
    res.status(500).json({
      error: 'Failed to update link',
      code: 'SERVER_ERROR',
    });
  }
}

export async function deleteLinkHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { code } = req.params;

    await deleteLink(code, userId);

    res.status(204).send();
  } catch (error) {
    if (error instanceof LinkError) {
      res.status(404).json({
        error: error.message,
        code: error.code,
      });
      return;
    }

    logger.error('Delete link error', { error });
    res.status(500).json({
      error: 'Failed to delete link',
      code: 'SERVER_ERROR',
    });
  }
}
