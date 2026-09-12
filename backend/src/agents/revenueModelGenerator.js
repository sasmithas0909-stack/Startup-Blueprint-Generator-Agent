// backend/src/agents/revenueModelGenerator.js

import { generateWithRetry } from '../services/granite/graniteClient.js';
import { buildRevenueModelPrompt } from '../services/granite/promptBuilder.js';
import { parseGraniteResponse, createFallbackSection } from '../services/granite/responseValidator.js';
import logger from '../utils/logger.js';

export async function generateRevenueModel(idea) {
  logger.info(`[revenueModelGenerator] Generating for: "${idea.startupName}"`);

  try {
    const prompt = buildRevenueModelPrompt(idea);
    const raw = await generateWithRetry(prompt, { max_new_tokens: 2000 });
    const { data, valid, error } = parseGraniteResponse(raw, ['recommendedModels']);

    if (!valid || !data) {
      logger.warn('[revenueModelGenerator] Invalid JSON from Granite', { error });
      return createFallbackSection('revenue', `IBM Granite returned invalid JSON: ${error}`);
    }

    logger.info('[revenueModelGenerator] ✓ Completed');
    return { ...data, _graniteStatus: 'success', _generatedAt: new Date().toISOString() };
  } catch (err) {
    logger.error('[revenueModelGenerator] ✗ Failed', { error: err.message });
    return createFallbackSection('revenue', err.message);
  }
}
