// backend/src/agents/businessModelGenerator.js

import { generateWithRetry } from '../services/granite/graniteClient.js';
import { buildBMCPrompt } from '../services/granite/promptBuilder.js';
import { parseGraniteResponse, createFallbackSection } from '../services/granite/responseValidator.js';
import logger from '../utils/logger.js';

export async function generateBusinessModel(idea, problemSolution = null) {
  logger.info(`[businessModelGenerator] Generating BMC for: "${idea.startupName}"`);

  try {
    const prompt = buildBMCPrompt(idea, problemSolution);
    const raw = await generateWithRetry(prompt, { max_new_tokens: 2500 });
    const { data, valid, error } = parseGraniteResponse(raw, ['keyPartners', 'valuePropositions']);

    if (!valid || !data) {
      logger.warn('[businessModelGenerator] Invalid JSON from Granite', { error });
      return createFallbackSection('bmc', `IBM Granite returned invalid JSON: ${error}`);
    }

    logger.info('[businessModelGenerator] ✓ Completed');
    return { ...data, _graniteStatus: 'success', _generatedAt: new Date().toISOString() };
  } catch (err) {
    logger.error('[businessModelGenerator] ✗ Failed', { error: err.message });
    return createFallbackSection('bmc', err.message);
  }
}
