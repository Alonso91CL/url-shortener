// =============================================================================
// Authentication Routes
// =============================================================================

import { Router } from 'express';
import { registerHandler, loginHandler, getMeHandler, updateMeHandler } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { createAuthRateLimiter } from '../middleware/rateLimit.js';
import { validateBody, registerSchema, loginSchema, updateUserSchema } from '../middleware/validate.js';

const router = Router();

// Routes
router.post(
  '/register',
  createAuthRateLimiter(),
  validateBody(registerSchema),
  registerHandler
);

router.post(
  '/login',
  createAuthRateLimiter(),
  validateBody(loginSchema),
  loginHandler
);

router.get(
  '/me',
  authenticate,
  getMeHandler
);

router.put(
  '/me',
  authenticate,
  validateBody(updateUserSchema),
  updateMeHandler
);

export default router;
