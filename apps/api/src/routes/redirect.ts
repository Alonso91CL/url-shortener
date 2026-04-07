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
 */
router.get('/:code', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const { code } = req.params;

  try {
    const result = await processRedirect(code, {
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      forwardedFor: req.headers['x-forwarded-for'] as string | string[] | undefined,
      realIP: req.headers['x-real-ip'] as string | undefined,
    });

    if (!result) {
      // Link not found - serve 404 page
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4321';
      res.status(404);
      
      if (req.headers.accept?.includes('text/html')) {
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Link Not Found - URL Shortener</title>
            <style>
              body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
              .container { text-align: center; padding: 2rem; }
              h1 { color: #1e293b; margin-bottom: 0.5rem; }
              p { color: #64748b; margin-bottom: 1.5rem; }
              a { color: #3b82f6; text-decoration: none; }
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
      } else {
        res.json({ error: 'Link not found', code: 'LINK_NOT_FOUND' });
      }
      return;
    }

    if (!result.isActive) {
      // Link inactive or expired - serve info page
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4321';
      const reason = result.isExpired ? 'expired' : 'deactivated';
      res.status(410); // Gone
      
      if (req.headers.accept?.includes('text/html')) {
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Link ${reason.charAt(0).toUpperCase() + reason.slice(1)} - URL Shortener</title>
            <style>
              body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
              .container { text-align: center; padding: 2rem; }
              h1 { color: #1e293b; margin-bottom: 0.5rem; }
              p { color: #64748b; margin-bottom: 1.5rem; }
              a { color: #3b82f6; text-decoration: none; }
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
      } else {
        res.json({ error: `Link ${reason}`, code: `LINK_${reason.toUpperCase()}` });
      }
      return;
    }

    // Log redirect performance
    const duration = Date.now() - startTime;
    logger.debug('Redirect completed', { code, duration, status: result.redirectType });

    // Perform the redirect
    res.redirect(result.redirectType, result.originalUrl);
  } catch (error) {
    logger.error('Redirect error', { code, error });
    
    res.status(500);
    if (req.headers.accept?.includes('text/html')) {
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4321';
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error - URL Shortener</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
            .container { text-align: center; padding: 2rem; }
            h1 { color: #ef4444; margin-bottom: 0.5rem; }
            p { color: #64748b; margin-bottom: 1.5rem; }
            a { color: #3b82f6; text-decoration: none; }
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
    } else {
      res.json({ error: 'Internal server error', code: 'SERVER_ERROR' });
    }
  }
});

export default router;
