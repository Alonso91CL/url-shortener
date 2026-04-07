// =============================================================================
// Stats Controller
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import {
  getOverviewStats,
  getTimeSeriesData,
  getDeviceDistribution,
  getCountryDistribution,
  getReferrerDistribution,
  getBrowserDistribution,
  verifyLinkOwnership,
  AnalyticsError,
} from '../services/analyticsService.js';
import { logger } from '../utils/logger.js';

export async function getOverviewHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { code } = req.params;

    const linkId = await verifyLinkOwnership(code, userId);
    const stats = await getOverviewStats(linkId);

    res.json({
      data: stats,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getTimeSeriesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { code } = req.params;
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 7, 7), 90);

    const linkId = await verifyLinkOwnership(code, userId);
    const data = await getTimeSeriesData(linkId, days);

    res.json({
      data,
      meta: { days, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getDevicesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { code } = req.params;

    const linkId = await verifyLinkOwnership(code, userId);
    const data = await getDeviceDistribution(linkId);

    res.json({
      data,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getCountriesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { code } = req.params;

    const linkId = await verifyLinkOwnership(code, userId);
    const data = await getCountryDistribution(linkId);

    res.json({
      data,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getReferrersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { code } = req.params;

    const linkId = await verifyLinkOwnership(code, userId);
    const data = await getReferrerDistribution(linkId);

    res.json({
      data,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getBrowsersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { code } = req.params;

    const linkId = await verifyLinkOwnership(code, userId);
    const data = await getBrowserDistribution(linkId);

    res.json({
      data,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(error, res);
  }
}

function handleError(error: unknown, res: Response): void {
  if (error instanceof AnalyticsError) {
    const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 404;
    res.status(statusCode).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  logger.error('Stats error', { error });
  res.status(500).json({
    error: 'Failed to get statistics',
    code: 'SERVER_ERROR',
  });
}
