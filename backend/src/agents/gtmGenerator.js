// backend/src/agents/gtmGenerator.js

import { generateWithRetry } from '../services/granite/graniteClient.js';
import { buildGTMPrompt } from '../services/granite/promptBuilder.js';
import { parseGraniteResponse, createFallbackSection } from '../services/granite/responseValidator.js';
import logger from '../utils/logger.js';

export async function generateGTM(idea, customers = null) {
  logger.info(`[gtmGenerator] Generating GTM strategy for: "${idea.startupName}"`);

  try {
    const prompt = buildGTMPrompt(idea, customers);
    const raw = await generateWithRetry(prompt, { max_new_tokens: 2500 });
    const { data, valid, error } = parseGraniteResponse(raw, ['gtmOverview', 'actionPlan']);

    if (!valid || !data) {
      logger.warn('[gtmGenerator] Invalid JSON from Granite', { error });
      return createFallbackSection('gtm', `IBM Granite returned invalid JSON: ${error}`);
    }

    logger.info('[gtmGenerator] ✓ Completed');
    return { ...data, _graniteStatus: 'success', _generatedAt: new Date().toISOString() };
  } catch (err) {
    logger.error('[gtmGenerator] ✗ Failed', { error: err.message });
    return createFallbackSection('gtm', err.message);
  }
}
