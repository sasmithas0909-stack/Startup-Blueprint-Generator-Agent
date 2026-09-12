// backend/src/agents/legalRequirementAnalyzer.js

import { generateWithRetry } from '../services/granite/graniteClient.js';
import { buildLegalPrompt } from '../services/granite/promptBuilder.js';
import { parseGraniteResponse, createFallbackSection } from '../services/granite/responseValidator.js';
import { retrieveLegalContext } from '../services/rag/ragEngine.js';
import logger from '../utils/logger.js';

export async function analyzeLegalRequirements(idea, startupAnalysis = null) {
  logger.info(`[legalRequirementAnalyzer] Analyzing legal for: "${idea.startupName}" (${idea.targetLocation})`);

  try {
    const { context: ragContext, sources } = await retrieveLegalContext(idea, startupAnalysis);
    logger.info(`[legalRequirementAnalyzer] RAG retrieved ${sources.length} legal documents`);

    const prompt = buildLegalPrompt(idea, ragContext);
    const raw = await generateWithRetry(prompt, { max_new_tokens: 2000 });
    const { data, valid, error } = parseGraniteResponse(raw, ['businessRegistration']);

    if (!valid || !data) {
      logger.warn('[legalRequirementAnalyzer] Invalid JSON from Granite', { error });
      return {
        data: createFallbackSection('legal', `IBM Granite returned invalid JSON: ${error}`),
        sources,
      };
    }

    logger.info('[legalRequirementAnalyzer] ✓ Completed');
    return {
      data: { ...data, _graniteStatus: 'success', _generatedAt: new Date().toISOString(), _ragSourceCount: sources.length },
      sources,
    };
  } catch (err) {
    logger.error('[legalRequirementAnalyzer] ✗ Failed', { error: err.message });
    return {
      data: createFallbackSection('legal', err.message),
      sources: [],
    };
  }
}
