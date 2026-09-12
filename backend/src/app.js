// backend/src/app.js
// Express application setup

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { generalLimiter } from './middleware/rateLimit.middleware.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import blueprintRoutes from './routes/blueprint.routes.js';
import { checkGraniteHealth } from './services/granite/graniteClient.js';
import logger from './utils/logger.js';

const app = express();

// -------------------------------------------------------
// Security & Parsing
// -------------------------------------------------------
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// -------------------------------------------------------
// Logging
// -------------------------------------------------------
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// -------------------------------------------------------
// General rate limiting
// -------------------------------------------------------
app.use('/api/', generalLimiter);

// -------------------------------------------------------
// Health check
// -------------------------------------------------------
app.get('/api/health', async (req, res) => {
  const granite = await checkGraniteHealth();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: 'ok',
      granite: granite.healthy ? 'ok' : 'unavailable',
      graniteConfigured: granite.configured,
      graniteModel: granite.model,
      graniteError: granite.error || null,
      graniteIssues: granite.issues || null,
      graniteSetupUrl: granite.setupUrl || null,
      tavilyConfigured: !!process.env.TAVILY_API_KEY,
    },
    setup: {
      required: [
        { var: 'WATSONX_API_KEY', configured: !!process.env.WATSONX_API_KEY && process.env.WATSONX_API_KEY !== 'PLACEHOLDER_KEY', description: 'IBM Cloud API key for Granite' },
        { var: 'WATSONX_PROJECT_ID', configured: !!process.env.WATSONX_PROJECT_ID && process.env.WATSONX_PROJECT_ID !== 'PLACEHOLDER_PROJECT', description: 'watsonx.ai project ID' },
        { var: 'TAVILY_API_KEY', configured: !!process.env.TAVILY_API_KEY, description: 'Tavily web search (optional but recommended)' },
      ],
    },
  });
});

// -------------------------------------------------------
// Routes
// -------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/blueprint', blueprintRoutes);

// -------------------------------------------------------
// 404 handler
// -------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', code: 'NOT_FOUND' });
});

// -------------------------------------------------------
// Global error handler
// -------------------------------------------------------
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    logger.error('Server error', {
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
      path: req.path,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: err.isOperational ? err.message : 'An unexpected error occurred',
    code,
    ...(err.details ? { details: err.details } : {}),
    ...(process.env.NODE_ENV === 'development' && !err.isOperational
      ? { stack: err.stack }
      : {}),
  });
});

export default app;
