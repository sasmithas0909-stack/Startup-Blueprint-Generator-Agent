// backend/src/agents/blueprintGenerator.js

import { generateWithRetry } from '../services/granite/graniteClient.js';
import { buildExecutiveSummaryPrompt } from '../services/granite/promptBuilder.js';
import { parseGraniteResponse, createFallbackSection } from '../services/granite/responseValidator.js';
import logger from '../utils/logger.js';

export async function generateBlueprintSummary(idea, allSections) {
  logger.info(`[blueprintGenerator] Generating executive summary for: "${idea.startupName}"`);

  try {
    const prompt = buildExecutiveSummaryPrompt(idea, allSections);
    const raw = await generateWithRetry(prompt, { max_new_tokens: 1500 });
    const { data, valid, error } = parseGraniteResponse(raw, ['executiveSummary']);

    if (!valid || !data) {
      logger.warn('[blueprintGenerator] Invalid JSON from Granite', { error });
      return createFallbackSection('executive_summary', `IBM Granite returned invalid JSON: ${error}`);
    }

    logger.info('[blueprintGenerator] ✓ Completed');
    return { ...data, _graniteStatus: 'success', _generatedAt: new Date().toISOString() };
  } catch (err) {
    logger.error('[blueprintGenerator] ✗ Failed', { error: err.message });
    return createFallbackSection('executive_summary', err.message);
  }
}
