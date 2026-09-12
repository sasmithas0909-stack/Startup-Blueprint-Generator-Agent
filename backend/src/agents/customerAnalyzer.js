// backend/src/agents/customerAnalyzer.js

import { generateWithRetry } from '../services/granite/graniteClient.js';
import { buildCustomerPrompt } from '../services/granite/promptBuilder.js';
import { parseGraniteResponse, createFallbackSection } from '../services/granite/responseValidator.js';
import logger from '../utils/logger.js';

export async function analyzeCustomers(idea, startupAnalysis = null) {
  logger.info(`[customerAnalyzer] Analyzing customers for: "${idea.startupName}"`);

  try {
    const prompt = buildCustomerPrompt(idea, startupAnalysis);
    const raw = await generateWithRetry(prompt, { max_new_tokens: 2000 });
    const { data, valid, error } = parseGraniteResponse(raw, ['primaryCustomers']);

    if (!valid || !data) {
      logger.warn('[customerAnalyzer] Invalid JSON from Granite', { error });
      return createFallbackSection('customers', `IBM Granite returned invalid JSON: ${error}`);
    }

    logger.info('[customerAnalyzer] ✓ Completed');
    return { ...data, _graniteStatus: 'success', _generatedAt: new Date().toISOString() };
  } catch (err) {
    logger.error('[customerAnalyzer] ✗ Failed', { error: err.message });
    return createFallbackSection('customers', err.message);
  }
}
