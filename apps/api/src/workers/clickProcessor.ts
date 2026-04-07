// =============================================================================
// Click Processor Worker
// =============================================================================

import { prisma } from '../db/prisma.js';
import { ClickJobData } from '../lib/queue.js';
import { logger } from '../utils/logger.js';

/**
 * Process a click event and persist to database
 * This is called by the BullMQ worker
 */
export async function processClick(data: ClickJobData): Promise<void> {
  const startTime = Date.now();

  try {
    await prisma.click.create({
      data: {
        linkId: data.linkId,
        clickedAt: data.timestamp,
        ipHash: data.ipHash,
        country: data.country || null,
        city: data.city || null,
        deviceType: data.deviceType || null,
        os: data.os || null,
        browser: data.browser || null,
        referer: data.referer || null,
      },
    });

    const duration = Date.now() - startTime;
    logger.debug('Click processed', {
      linkId: data.linkId,
      linkCode: data.linkCode,
      duration,
    });
  } catch (error) {
    logger.error('Failed to process click', {
      linkId: data.linkId,
      linkCode: data.linkCode,
      error,
    });
    throw error; // Re-throw to trigger BullMQ retry
  }
}

/**
 * Batch process clicks for high-throughput scenarios
 * Can be used for bulk inserts when needed
 */
export async function processClickBatch(datas: ClickJobData[]): Promise<number> {
  if (datas.length === 0) return 0;

  try {
    const result = await prisma.click.createMany({
      data: datas.map((data) => ({
        linkId: data.linkId,
        clickedAt: data.timestamp,
        ipHash: data.ipHash,
        country: data.country || null,
        city: data.city || null,
        deviceType: data.deviceType || null,
        os: data.os || null,
        browser: data.browser || null,
        referer: data.referer || null,
      })),
    });

    logger.debug('Batch clicks processed', {
      count: result.count,
    });

    return result.count;
  } catch (error) {
    logger.error('Failed to process batch clicks', { error });
    throw error;
  }
}
