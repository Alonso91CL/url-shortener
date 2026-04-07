// =============================================================================
// Stats Routes
// =============================================================================

import { Router } from 'express';
import {
  getOverviewHandler,
  getTimeSeriesHandler,
  getDevicesHandler,
  getCountriesHandler,
  getReferrersHandler,
  getBrowsersHandler,
} from '../controllers/statsController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Routes - all require authentication
router.get('/:code/overview', authenticate, getOverviewHandler);
router.get('/:code/timeseries', authenticate, getTimeSeriesHandler);
router.get('/:code/devices', authenticate, getDevicesHandler);
router.get('/:code/countries', authenticate, getCountriesHandler);
router.get('/:code/referrers', authenticate, getReferrersHandler);
router.get('/:code/browsers', authenticate, getBrowsersHandler);

export default router;
