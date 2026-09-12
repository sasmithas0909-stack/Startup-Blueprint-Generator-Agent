// backend/src/agents/marketResearch.js

import { generateWithRetry } from '../services/granite/graniteClient.js';
import { buildMarketResearchPrompt } from '../services/granite/promptBuilder.js';
import { parseGraniteResponse, createFallbackSection } from '../services/granite/responseValidator.js';
import { retrieveMarketContext } from '../services/rag/ragEngine.js';
import logger from '../utils/logger.js';

export async function researchMarket(idea, startupAnalysis = null) {
  logger.info(`[marketResearch] Researching market for: "${idea.startupName}" (${idea.industry})`);

  try {
    const { context: ragContext, sources } = await retrieveMarketContext(idea, startupAnalysis);
    logger.info(`[marketResearch] RAG retrieved ${sources.length} context documents`);

    const prompt = buildMarketResearchPrompt(idea, ragContext);
    const raw = await generateWithRetry(prompt, { max_new_tokens: 2000 });
    const { data, valid, error } = parseGraniteResponse(raw, ['marketOverview']);

    if (!valid || !data) {
      logger.warn('[marketResearch] Invalid JSON from Granite', { error });
      return {
        data: createFallbackSection('market', `IBM Granite returned invalid JSON: ${error}`),
        sources,
      };
    }

    logger.info('[marketResearch] ✓ Completed');
    return {
      data: { ...data, _graniteStatus: 'success', _generatedAt: new Date().toISOString(), _ragSourceCount: sources.length },
      sources,
    };
  } catch (err) {
    logger.error('[marketResearch] ✗ Failed', { error: err.message });
    return {
      data: createFallbackSection('market', err.message),
      sources: [],
    };
  }
}
