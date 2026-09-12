// backend/src/routes/auth.routes.js

import express from 'express';
import {
  signup,
  login,
  getMe,
  signupValidation,
  loginValidation,
} from '../controllers/auth.controller.js';
import { handleValidation } from '../middleware/validate.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

router.post('/signup', authLimiter, signupValidation, handleValidation, signup);
router.post('/login', authLimiter, loginValidation, handleValidation, login);
router.get('/me', requireAuth, getMe);

export default router;
