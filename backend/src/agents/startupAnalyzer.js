// backend/src/agents/startupAnalyzer.js

import { generateWithRetry } from '../services/granite/graniteClient.js';
import { buildProblemSolutionPrompt } from '../services/granite/promptBuilder.js';
import { parseGraniteResponse, createFallbackSection } from '../services/granite/responseValidator.js';
import logger from '../utils/logger.js';

export async function analyzeStartup(idea) {
  logger.info(`[startupAnalyzer] Analyzing: "${idea.startupName}" (${idea.industry})`);

  try {
    const prompt = buildProblemSolutionPrompt(idea);
    const raw = await generateWithRetry(prompt, { max_new_tokens: 2000 });
    const { data, valid, error } = parseGraniteResponse(raw, ['problem', 'solution', 'usp']);

    if (!valid || !data) {
      logger.warn('[startupAnalyzer] Invalid JSON from Granite', { error, rawPreview: raw.substring(0, 300) });
      return createFallbackSection('problem', `IBM Granite returned invalid JSON: ${error}`);
    }

    logger.info('[startupAnalyzer] ✓ Completed');
    return { ...data, _graniteStatus: 'success', _generatedAt: new Date().toISOString() };
  } catch (err) {
    logger.error('[startupAnalyzer] ✗ Failed', { error: err.message });
    return createFallbackSection('problem', err.message);
  }
}
