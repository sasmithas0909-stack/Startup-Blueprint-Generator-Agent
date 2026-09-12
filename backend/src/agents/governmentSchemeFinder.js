// backend/src/agents/governmentSchemeFinder.js
// RAG-enhanced government scheme retrieval + IBM Granite synthesis

import { generateWithRetry } from '../services/granite/graniteClient.js';
import { buildGovernmentSchemesPrompt } from '../services/granite/promptBuilder.js';
import { parseGraniteResponse, createFallbackSection } from '../services/granite/responseValidator.js';
import { retrieveSchemesContext } from '../services/rag/ragEngine.js';
import logger from '../utils/logger.js';

export async function findGovernmentSchemes(idea, startupAnalysis = null) {
  logger.info(`[governmentSchemeFinder] Finding schemes for: "${idea.startupName}" (${idea.industry}, ${idea.targetLocation})`);

  try {
    const { context: ragContext, sources } = await retrieveSchemesContext(idea, startupAnalysis);
    logger.info(`[governmentSchemeFinder] RAG retrieved ${sources.length} scheme documents`);

    const prompt = buildGovernmentSchemesPrompt(idea, ragContext);
    const raw = await generateWithRetry(prompt, { max_new_tokens: 2500 });
    const { data, valid, error } = parseGraniteResponse(raw, ['schemes']);

    if (!valid || !data) {
      logger.warn('[governmentSchemeFinder] Invalid JSON from Granite', { error });
      return {
        data: createFallbackSection('schemes', `IBM Granite returned invalid JSON: ${error}`),
        sources,
      };
    }

    // Ensure no invented schemes — every scheme gets a confidence flag
    if (data.schemes) {
      data.schemes = data.schemes.map((s) => ({
        ...s,
        _ragBacked: sources.some((src) =>
          (src.title || '').toLowerCase().includes(s.name?.toLowerCase().split(' ')[0] || '')
        ),
        _retrievedAt: new Date().toISOString(),
      }));
    }

    logger.info(`[governmentSchemeFinder] ✓ Found ${data.schemes?.length || 0} schemes`);
    return {
      data: { ...data, _graniteStatus: 'success', _generatedAt: new Date().toISOString(), _ragSourceCount: sources.length },
      sources,
    };
  } catch (err) {
    logger.error('[governmentSchemeFinder] ✗ Failed', { error: err.message });
    return {
      data: createFallbackSection('schemes', err.message),
      sources: [],
    };
  }
}
