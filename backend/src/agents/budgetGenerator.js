// backend/src/agents/budgetGenerator.js

import { generateWithRetry } from '../services/granite/graniteClient.js';
import { buildBudgetPrompt } from '../services/granite/promptBuilder.js';
import { parseGraniteResponse, createFallbackSection } from '../services/granite/responseValidator.js';
import logger from '../utils/logger.js';

export async function generateBudget(idea) {
  logger.info(`[budgetGenerator] Generating budget for: "${idea.startupName}"`);

  try {
    const prompt = buildBudgetPrompt(idea);
    const raw = await generateWithRetry(prompt, { max_new_tokens: 2000 });
    const { data, valid, error } = parseGraniteResponse(raw, ['breakdown']);

    if (!valid || !data) {
      logger.warn('[budgetGenerator] Invalid JSON from Granite', { error });
      return createFallbackSection('budget', `IBM Granite returned invalid JSON: ${error}`);
    }

    logger.info('[budgetGenerator] ✓ Completed');
    return { ...data, _graniteStatus: 'success', _generatedAt: new Date().toISOString() };
  } catch (err) {
    logger.error('[budgetGenerator] ✗ Failed', { error: err.message });
    return createFallbackSection('budget', err.message);
  }
}
