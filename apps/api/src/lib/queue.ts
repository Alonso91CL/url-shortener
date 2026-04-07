// =============================================================================
// BullMQ Queue Setup
// =============================================================================

import { Queue, Worker, Job } from 'bullmq';
import { getRedis } from './cache.js';
import { logger } from '../utils/logger.js';
import { processClick } from '../workers/clickProcessor.js';

// Queue names
export const QUEUE_NAMES = {
  CLICKS: 'clicks',
} as const;

// Click job data interface
export interface ClickJobData {
  linkId: string;
  linkCode: string;
  timestamp: Date;
  ipHash: string;
  country?: string | null;
  city?: string | null;
  deviceType?: string;
  os?: string;
  browser?: string;
  referer?: string;
}

// Get the connection for BullMQ
function getBullMQConnection() {
  return { 
    connection: getRedis(),
    sharedConnection: true 
  };
}

// Create the clicks queue
let clicksQueue: Queue<ClickJobData> | null = null;

export function getClicksQueue(): Queue<ClickJobData> {
  if (!clicksQueue) {
    clicksQueue = new Queue<ClickJobData>(QUEUE_NAMES.CLICKS, {
      ...getBullMQConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    });

    clicksQueue.on('error', (err) => {
      logger.error('Clicks queue error', { error: err.message });
    });
  }

  return clicksQueue;
}

// Add a click job to the queue (fire-and-forget)
export async function enqueueClick(data: ClickJobData): Promise<void> {
  try {
    const queue = getClicksQueue();
    await queue.add('process-click', data, {
      priority: 1, // Lower number = higher priority
    });
    logger.debug('Click job enqueued', { linkCode: data.linkCode });
  } catch (error) {
    logger.error('Failed to enqueue click job', { error, data });
    // Don't throw - this is fire-and-forget, we don't want to block the redirect
  }
}

// Create the clicks worker
let clicksWorker: Worker<ClickJobData> | null = null;

export function getClicksWorker(): Worker<ClickJobData> {
  if (!clicksWorker) {
    const concurrency = parseInt(process.env.BULL_CONCURRENCY || '5', 10);
    
    clicksWorker = new Worker<ClickJobData>(
      QUEUE_NAMES.CLICKS,
      async (job: Job<ClickJobData>) => {
        logger.debug('Processing click job', { 
          jobId: job.id, 
          linkCode: job.data.linkCode 
        });
        
        await processClick(job.data);
        
        return { processed: true, timestamp: new Date().toISOString() };
      },
      {
        ...getBullMQConnection(),
        concurrency,
        limiter: {
          max: 10,
          duration: 1000, // Max 10 jobs per second
        },
      }
    );

    clicksWorker.on('completed', (job) => {
      logger.debug('Click job completed', { jobId: job.id });
    });

    clicksWorker.on('failed', (job, err) => {
      logger.error('Click job failed', { 
        jobId: job?.id, 
        error: err.message,
        attemptsMade: job?.attemptsMade 
      });
    });

    clicksWorker.on('error', (err) => {
      logger.error('Clicks worker error', { error: err.message });
    });
  }

  return clicksWorker;
}

// Close all queues and workers gracefully
export async function closeQueues(): Promise<void> {
  try {
    if (clicksQueue) {
      await clicksQueue.close();
      logger.info('Clicks queue closed');
    }
    if (clicksWorker) {
      await clicksWorker.close();
      logger.info('Clicks worker closed');
    }
  } catch (error) {
    logger.error('Error closing queues', { error });
  }
}
