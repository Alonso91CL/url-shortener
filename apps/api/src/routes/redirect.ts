// =============================================================================
// Redirect Route - Performance Critical
// =============================================================================

import { Router, Request, Response } from 'express';
import { processRedirect } from '../services/linkService.js';
import { createRedirectRateLimiter } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Apply rate limiting to redirect endpoint
router.use(createRedirectRateLimiter());

/**
 * GET /r/:code
 * 
 * Redirects to the original URL.
 * This is the performance-critical endpoint that should respond <20ms with cache hit.
 * 
 * When Accept: application/json is sent, returns JSON instead of redirecting.
 * This allows the frontend to handle the redirect.
 */
router.get('/:code', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const { code } = req.params;
  const acceptHeader = req.headers.accept;
  const wantsJson = acceptHeader?.includes('application/json');
  
  // Get client info - prioritize custom headers from frontend
  const clientIP = req.headers['x-client-ip'] as string || 
                   req.headers['x-forwarded-for'] as string ||
                   req.socket.remoteAddress;
  const userAgent = req.headers['x-user-agent'] as string || 
                    req.headers['user-agent'] as string;
  const referer = req.headers['x-referer'] as string || 
                  req.headers.referer as string;

  logger.debug('Redirect request', { 
    code, 
    clientIP,
    userAgent: userAgent?.substring(0, 50),
    referer,
    wantsJson 
  });

  try {
    const result = await processRedirect(code, {
      ip: clientIP,
      userAgent,
      referer,
      forwardedFor: req.headers['x-forwarded-for'] as string | string[] | undefined,
      realIP: req.headers['x-real-ip'] as string | undefined,
    });

    if (!result) {
      res.status(404);
      
      if (wantsJson) {
        res.json({ error: 'Link not found', code: 'LINK_NOT_FOUND' });
      } else {
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4321';
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Link Not Found - URL Shortener</title>
            <style>
              body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #1a1a1a; color: #e5e5e5; }
              .container { text-align: center; padding: 2rem; }
              h1 { color: #ef4444; margin-bottom: 0.5rem; }
              p { color: #9ca3af; margin-bottom: 1.5rem; }
              a { color: #22c55e; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>404 - Link Not Found</h1>
              <p>This short link doesn't exist or has been deleted.</p>
              <a href="${baseUrl}">Go to Homepage</a>
            </div>
          </body>
          </html>
        `);
      }
      return;
    }

    if (!result.isActive) {
      const reason = result.isExpired ? 'expired' : 'deactivated';
      res.status(410);
      
      if (wantsJson) {
        res.json({ error: `Link ${reason}`, code: `LINK_${reason.toUpperCase()}`, reason });
      } else {
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4321';
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Link ${reason.charAt(0).toUpperCase() + reason.slice(1)} - URL Shortener</title>
            <style>
              body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #1a1a1a; color: #e5e5e5; }
              .container { text-align: center; padding: 2rem; }
              h1 { color: #f59e0b; margin-bottom: 0.5rem; }
              p { color: #9ca3af; margin-bottom: 1.5rem; }
              a { color: #22c55e; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>410 - Link ${reason.charAt(0).toUpperCase() + reason.slice(1)}</h1>
              <p>This short link has been ${reason === 'expired' ? 'expired' : 'deactivated'} and is no longer available.</p>
              <a href="${baseUrl}">Go to Homepage</a>
            </div>
          </body>
          </html>
        `);
      }
      return;
    }

    // Log redirect performance
    const duration = Date.now() - startTime;
    logger.debug('Redirect completed', { code, duration, status: result.redirectType });

    // If JSON requested, return the URL data
    if (wantsJson) {
      res.json({
        originalUrl: result.originalUrl,
        redirectType: result.redirectType,
      });
      return;
    }

    // Perform the redirect (HTML fallback)
    res.redirect(result.redirectType, result.originalUrl);
  } catch (error) {
    logger.error('Redirect error', { code, error });
    
    res.status(500);
    if (wantsJson) {
      res.json({ error: 'Internal server error', code: 'SERVER_ERROR' });
    } else {
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4321';
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error - URL Shortener</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #1a1a1a; color: #e5e5e5; }
            .container { text-align: center; padding: 2rem; }
            h1 { color: #ef4444; margin-bottom: 0.5rem; }
            p { color: #9ca3af; margin-bottom: 1.5rem; }
            a { color: #22c55e; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>500 - Server Error</h1>
            <p>Something went wrong. Please try again later.</p>
            <a href="${baseUrl}">Go to Homepage</a>
          </div>
        </body>
        </html>
      `);
    }
  }
});

export default router;
