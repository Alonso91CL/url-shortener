// =============================================================================
// Links Routes
// =============================================================================

import { Router } from 'express';
import {
  createLinkHandler,
  listLinksHandler,
  getLinkHandler,
  updateLinkHandler,
  deleteLinkHandler,
} from '../controllers/linksController.js';
import { authenticate } from '../middleware/auth.js';
import { createLinkRateLimiter } from '../middleware/rateLimit.js';
import { validateBody, createLinkSchema, updateLinkSchema } from '../middleware/validate.js';

const router = Router();

// Routes
router.get(
  '/',
  authenticate,
  listLinksHandler
);

router.post(
  '/',
  authenticate,
  createLinkRateLimiter(),
  validateBody(createLinkSchema),
  createLinkHandler
);

router.get(
  '/:code',
  authenticate,
  getLinkHandler
);

router.patch(
  '/:code',
  authenticate,
  validateBody(updateLinkSchema),
  updateLinkHandler
);

router.delete(
  '/:code',
  authenticate,
  deleteLinkHandler
);

export default router;
