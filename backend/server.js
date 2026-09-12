// backend/server.js
// Server entry point

import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import logger from './src/utils/logger.js';
import prisma from './src/db/prismaClient.js';
import { getVectorStore } from './src/services/rag/vectorStore.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Pre-warm the RAG vector store in background (don't block startup)
    getVectorStore().then((store) => {
      logger.info(`RAG vector store ready (${store.size()} chunks)`);
    }).catch((err) => {
      logger.warn('RAG vector store failed to initialize — RAG features degraded', {
        error: err.message,
      });
    });

    app.listen(PORT, () => {
      logger.info(`🚀 Startup Blueprint API running on http://localhost:${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   Granite model: ${process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-instruct-v2'}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message });
  process.exit(1);
});

startServer();
