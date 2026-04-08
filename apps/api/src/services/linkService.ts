// =============================================================================
// Link Service
// =============================================================================

import { prisma } from '../db/prisma.js';
import { cacheGet, cacheSet, cacheDelete, CACHE_KEYS, CACHE_TTL } from '../lib/cache.js';
import { enqueueClick, ClickJobData } from '../lib/queue.js';
import { hashIP, extractClientIP } from '../lib/hash.js';
import { lookupGeoIP } from '../lib/geo.js';
import { logger } from '../utils/logger.js';

export interface CreateLinkInput {
  originalUrl: string;
  userId?: string;
  alias?: string;
  expiresAt?: Date;
  redirectType?: 301 | 302;
}

export interface UpdateLinkInput {
  isActive?: boolean;
  redirectType?: 301 | 302;
  expiresAt?: Date | null;
}

export interface LinkFilters {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Base62 characters for short code generation
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate a unique short code
 */
export function generateShortCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += BASE62_CHARS[Math.floor(Math.random() * BASE62_CHARS.length)];
  }
  return code;
}

/**
 * Create a new shortened link
 */
export async function createLink(input: CreateLinkInput): Promise<{
  id: string;
  code: string;
  originalUrl: string;
  isActive: boolean;
  redirectType: number;
  expiresAt: Date | null;
  createdAt: Date;
}> {
  // Generate unique code (with alias or random)
  let code = input.alias || generateShortCode();
  
  // Ensure code is unique and follows format
  if (input.alias) {
    code = code.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (code.length > 20) {
      throw new LinkError('Alias must be at most 20 characters', 'INVALID_ALIAS');
    }
  }

  // Check if code already exists
  const existingLink = await prisma.link.findUnique({
    where: { code },
  });

  if (existingLink) {
    if (input.alias) {
      throw new LinkError('This alias is already taken', 'ALIAS_TAKEN');
    }
    // Generate new random code if collision
    code = generateShortCode();
  }

  const link = await prisma.link.create({
    data: {
      code,
      originalUrl: input.originalUrl,
      userId: input.userId || 'anonymous', // For anonymous links
      isActive: true,
      redirectType: input.redirectType || 302,
      expiresAt: input.expiresAt || null,
    },
  });

  logger.info('Link created', { linkId: link.id, code: link.code });

  // Cache the new link
  await cacheSet(CACHE_KEYS.link(code), {
    id: link.id,
    originalUrl: link.originalUrl,
    isActive: link.isActive,
    redirectType: link.redirectType,
    expiresAt: link.expiresAt,
  }, CACHE_TTL.LINK);

  return {
    id: link.id,
    code: link.code,
    originalUrl: link.originalUrl,
    isActive: link.isActive,
    redirectType: link.redirectType,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
  };
}

/**
 * Get link by code (with cache)
 */
export async function getLinkByCode(code: string): Promise<{
  id: string;
  code: string;
  originalUrl: string;
  isActive: boolean;
  redirectType: number;
  expiresAt: Date | null;
} | null> {
  // Try cache first
  const cached = await cacheGet<{
    id: string;
    originalUrl: string;
    isActive: boolean;
    redirectType: number;
    expiresAt: string | null;
  }>(CACHE_KEYS.link(code));

  if (cached) {
    return {
      id: cached.id,
      code,
      originalUrl: cached.originalUrl,
      isActive: cached.isActive,
      redirectType: cached.redirectType,
      expiresAt: cached.expiresAt ? new Date(cached.expiresAt) : null,
    };
  }

  // Cache miss - query database
  const link = await prisma.link.findUnique({
    where: { code },
  });

  if (!link) {
    return null;
  }

  // Cache for future requests
  await cacheSet(CACHE_KEYS.link(code), {
    id: link.id,
    originalUrl: link.originalUrl,
    isActive: link.isActive,
    redirectType: link.redirectType,
    expiresAt: link.expiresAt?.toISOString() || null,
  }, CACHE_TTL.LINK);

  return link;
}

/**
 * Get link details for owner (always from DB)
 */
export async function getLinkByCodeForOwner(code: string, userId: string) {
  const link = await prisma.link.findFirst({
    where: {
      code,
      userId,
    },
    include: {
      _count: {
        select: { clicks: true },
      },
    },
  });

  if (!link) {
    throw new LinkError('Link not found', 'LINK_NOT_FOUND');
  }

  return {
    ...link,
    clickCount: link._count.clicks,
  };
}

/**
 * List user's links with pagination
 */
export async function listLinks(
  userId: string,
  filters: LinkFilters = {}
): Promise<PaginatedResult<{
  id: string;
  code: string;
  originalUrl: string;
  isActive: boolean;
  redirectType: number;
  expiresAt: Date | null;
  createdAt: Date;
  clickCount: number;
}>> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  };

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      where,
      include: {
        _count: {
          select: { clicks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.link.count({ where }),
  ]);

  return {
    data: links.map((link) => ({
      id: link.id,
      code: link.code,
      originalUrl: link.originalUrl,
      isActive: link.isActive,
      redirectType: link.redirectType,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      clickCount: link._count.clicks,
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update a link
 */
export async function updateLink(
  code: string,
  userId: string,
  input: UpdateLinkInput
) {
  // Verify ownership
  const existing = await prisma.link.findFirst({
    where: { code, userId },
  });

  if (!existing) {
    throw new LinkError('Link not found', 'LINK_NOT_FOUND');
  }

  const link = await prisma.link.update({
    where: { id: existing.id },
    data: {
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.redirectType !== undefined && { redirectType: input.redirectType }),
      ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
    },
  });

  // Invalidate cache
  await cacheDelete(CACHE_KEYS.link(code));

  logger.info('Link updated', { linkId: link.id, code: link.code });

  return link;
}

/**
 * Delete a link
 */
export async function deleteLink(code: string, userId: string): Promise<void> {
  const link = await prisma.link.findFirst({
    where: { code, userId },
  });

  if (!link) {
    throw new LinkError('Link not found', 'LINK_NOT_FOUND');
  }

  await prisma.link.delete({
    where: { id: link.id },
  });

  // Invalidate cache
  await cacheDelete(CACHE_KEYS.link(code));

  logger.info('Link deleted', { linkId: link.id, code: link.code });
}

/**
 * Process a redirect - handles caching and click tracking
 */
export async function processRedirect(
  code: string,
  request: {
    ip?: string;
    userAgent?: string;
    referer?: string;
    forwardedFor?: string | string[];
    realIP?: string;
  }
): Promise<{
  originalUrl: string;
  redirectType: number;
  isExpired: boolean;
  isActive: boolean;
} | null> {
  // Get link (with cache)
  const link = await getLinkByCode(code);

  if (!link) {
    return null;
  }

  // Check if expired
  const isExpired = link.expiresAt !== null && link.expiresAt < new Date();
  const isActive = link.isActive && !isExpired;

  if (!isActive) {
    return {
      originalUrl: '',
      redirectType: 302,
      isExpired,
      isActive: false,
    };
  }

  // Enqueue click tracking (fire-and-forget)
  const salt = process.env.IP_HASH_SALT || 'default-salt-change-in-production';
  const clickData: ClickJobData = {
    linkId: link.id,
    linkCode: code,
    timestamp: new Date(),
    ipHash: hashIP(extractClientIP(
      request.forwardedFor,
      request.realIP,
      request.ip
    ), salt),
    ...lookupGeoIP(request.ip || ''),
    deviceType: parseDeviceType(request.userAgent),
    os: parseOS(request.userAgent),
    browser: parseBrowser(request.userAgent),
    referer: request.referer || undefined,
  };

  await enqueueClick(clickData);

  return {
    originalUrl: link.originalUrl,
    redirectType: link.redirectType,
    isExpired: false,
    isActive: true,
  };
}

// Simple UA parsing helpers
function parseDeviceType(userAgent?: string): string {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
    return 'mobile';
  }
  if (ua.includes('bot') || ua.includes('crawler')) return 'bot';
  return 'desktop';
}

function parseOS(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os') || ua.includes('macos')) return 'macOS';
  if (ua.includes('linux') && !ua.includes('android')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  
  return 'Other';
}

function parseBrowser(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  
  return 'Other';
}

/**
 * Custom error class for link errors
 */
export class LinkError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'LinkError';
    this.code = code;
  }
}
