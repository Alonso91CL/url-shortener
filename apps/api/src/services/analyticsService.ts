// =============================================================================
// Analytics Service
// =============================================================================

import { prisma } from '../db/prisma.js';
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '../lib/cache.js';
import { AnalyticsError } from './analyticsError.js';

export { AnalyticsError };

export interface OverviewStats {
  totalClicks: number;
  uniqueClicks: number;
  firstClick: Date | null;
  lastClick: Date | null;
}

export interface TimeSeriesData {
  date: string;
  clicks: number;
}

export interface DistributionData {
  label: string;
  value: number;
  percentage: number;
}

export interface TopReferrer {
  referer: string;
  clicks: number;
  percentage: number;
}

/**
 * Get overview statistics for a link
 */
export async function getOverviewStats(linkId: string): Promise<OverviewStats> {
  const cacheKey = `${CACHE_KEYS.linkStats(linkId)}-overview`;
  
  // Try cache first
  const cached = await cacheGet<OverviewStats>(cacheKey);
  if (cached) {
    return cached;
  }

  const [clickStats, uniqueIPs, firstClickResult, lastClickResult] = await Promise.all([
    prisma.click.count({ where: { linkId } }),
    prisma.click.groupBy({
      by: ['ipHash'],
      where: { linkId },
    }),
    prisma.click.findFirst({
      where: { linkId },
      orderBy: { clickedAt: 'asc' },
      select: { clickedAt: true },
    }),
    prisma.click.findFirst({
      where: { linkId },
      orderBy: { clickedAt: 'desc' },
      select: { clickedAt: true },
    }),
  ]);

  const stats: OverviewStats = {
    totalClicks: clickStats,
    uniqueClicks: uniqueIPs.length,
    firstClick: firstClickResult?.clickedAt || null,
    lastClick: lastClickResult?.clickedAt || null,
  };

  // Cache the result
  await cacheSet(cacheKey, stats, CACHE_TTL.STATS);

  return stats;
}

/**
 * Get time series data (clicks per day)
 */
export async function getTimeSeriesData(
  linkId: string,
  days: number = 7
): Promise<TimeSeriesData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const clicks = await prisma.click.findMany({
    where: {
      linkId,
      clickedAt: {
        gte: startDate,
      },
    },
    select: {
      clickedAt: true,
    },
    orderBy: { clickedAt: 'asc' },
  });

  // Group by day
  const dayMap = new Map<string, number>();
  
  // Initialize all days with 0
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    dayMap.set(key, 0);
  }

  // Count clicks per day
  for (const click of clicks) {
    const key = click.clickedAt.toISOString().split('T')[0];
    dayMap.set(key, (dayMap.get(key) || 0) + 1);
  }

  // Convert to array and sort by date
  const result: TimeSeriesData[] = Array.from(dayMap.entries())
    .map(([date, clicks]) => ({ date, clicks }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

/**
 * Get device distribution
 */
export async function getDeviceDistribution(linkId: string): Promise<DistributionData[]> {
  const clicks = await prisma.click.groupBy({
    by: ['deviceType'],
    where: { linkId, deviceType: { not: null } },
    _count: { deviceType: true },
  });

  const total = clicks.reduce((sum, c) => sum + c._count.deviceType, 0);

  const deviceLabels: Record<string, string> = {
    desktop: 'Desktop',
    mobile: 'Mobile',
    tablet: 'Tablet',
    bot: 'Bot',
    unknown: 'Unknown',
  };

  return clicks
    .map((c) => ({
      label: deviceLabels[c.deviceType!] || c.deviceType || 'Unknown',
      value: c._count.deviceType,
      percentage: total > 0 ? Math.round((c._count.deviceType / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Get country distribution (top 10)
 */
export async function getCountryDistribution(linkId: string): Promise<DistributionData[]> {
  const clicks = await prisma.click.groupBy({
    by: ['country'],
    where: { linkId, country: { not: null } },
    _count: { country: true },
    orderBy: { _count: { country: 'desc' } },
    take: 10,
  });

  const total = clicks.reduce((sum, c) => sum + c._count.country, 0);

  return clicks
    .map((c) => ({
      label: c.country || 'Unknown',
      value: c._count.country,
      percentage: total > 0 ? Math.round((c._count.country / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Get referrer distribution (top 10)
 */
export async function getReferrerDistribution(linkId: string): Promise<TopReferrer[]> {
  const clicks = await prisma.click.groupBy({
    by: ['referer'],
    where: { linkId },
    _count: { referer: true },
    orderBy: { _count: { referer: 'desc' } },
    take: 10,
  });

  const total = clicks.reduce((sum, c) => sum + c._count.referer, 0);

  return clicks.map((c) => ({
    referer: c.referer || 'direct',
    clicks: c._count.referer,
    percentage: total > 0 ? Math.round((c._count.referer / total) * 100) : 0,
  }));
}

/**
 * Get browser distribution (top 5)
 */
export async function getBrowserDistribution(linkId: string): Promise<DistributionData[]> {
  const clicks = await prisma.click.groupBy({
    by: ['browser'],
    where: { linkId, browser: { not: null } },
    _count: { browser: true },
    orderBy: { _count: { browser: 'desc' } },
    take: 5,
  });

  const total = clicks.reduce((sum, c) => sum + c._count.browser, 0);

  return clicks
    .map((c) => ({
      label: c.browser || 'Unknown',
      value: c._count.browser,
      percentage: total > 0 ? Math.round((c._count.browser / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Verify link ownership for stats access
 */
export async function verifyLinkOwnership(linkCode: string, userId: string): Promise<string> {
  const link = await prisma.link.findFirst({
    where: { code: linkCode, userId },
    select: { id: true },
  });

  if (!link) {
    throw new AnalyticsError('Link not found or access denied', 'ACCESS_DENIED');
  }

  return link.id;
}
