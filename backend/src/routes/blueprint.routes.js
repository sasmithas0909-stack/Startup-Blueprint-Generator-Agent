// backend/src/routes/blueprint.routes.js

import express from 'express';
import {
  generateBlueprint,
  getBlueprint,
  getBlueprintStatus,
  regenerateSectionHandler,
  deleteBlueprint,
  createBlueprintValidation,
} from '../controllers/blueprint.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { handleValidation } from '../middleware/validate.middleware.js';
import { generateLimiter } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.post(
  '/generate',
  generateLimiter,
  createBlueprintValidation,
  handleValidation,
  generateBlueprint
);

router.get('/:id', getBlueprint);
router.get('/:id/status', getBlueprintStatus);
router.post('/:id/section/:key/regenerate', generateLimiter, regenerateSectionHandler);
router.delete('/:id', deleteBlueprint);

export default router;
