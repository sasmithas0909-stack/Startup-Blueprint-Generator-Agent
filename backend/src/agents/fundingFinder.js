// backend/src/agents/fundingFinder.js

import { generateWithRetry } from '../services/granite/graniteClient.js';
import { buildFundingPrompt } from '../services/granite/promptBuilder.js';
import { parseGraniteResponse, createFallbackSection } from '../services/granite/responseValidator.js';
import { retrieveFundingContext } from '../services/rag/ragEngine.js';
import logger from '../utils/logger.js';

export async function findFundingOpportunities(idea, startupAnalysis = null) {
  logger.info(`[fundingFinder] Finding funding for: "${idea.startupName}" (stage: ${idea.stage})`);

  try {
    const { context: ragContext, sources } = await retrieveFundingContext(idea, startupAnalysis);
    logger.info(`[fundingFinder] RAG retrieved ${sources.length} funding documents`);

    const prompt = buildFundingPrompt(idea, ragContext);
    const raw = await generateWithRetry(prompt, { max_new_tokens: 2500 });
    const { data, valid, error } = parseGraniteResponse(raw, ['fundingOpportunities']);

    if (!valid || !data) {
      logger.warn('[fundingFinder] Invalid JSON from Granite', { error });
      return {
        data: createFallbackSection('funding', `IBM Granite returned invalid JSON: ${error}`),
        sources,
      };
    }

    logger.info(`[fundingFinder] ✓ Found ${data.fundingOpportunities?.length || 0} opportunities`);
    return {
      data: { ...data, _graniteStatus: 'success', _generatedAt: new Date().toISOString(), _ragSourceCount: sources.length },
      sources,
    };
  } catch (err) {
    logger.error('[fundingFinder] ✗ Failed', { error: err.message });
    return {
      data: createFallbackSection('funding', err.message),
      sources: [],
    };
  }
}
