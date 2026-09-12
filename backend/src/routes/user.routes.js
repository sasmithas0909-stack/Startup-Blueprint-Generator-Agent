// backend/src/routes/user.routes.js

import express from 'express';
import { getProfile, getUserBlueprints } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/me', getProfile);
router.get('/blueprints', getUserBlueprints);

export default router;
