// backend/src/agents/competitorAnalyzer.js

import { generateWithRetry } from '../services/granite/graniteClient.js';
import { buildCompetitorPrompt } from '../services/granite/promptBuilder.js';
import { parseGraniteResponse, createFallbackSection } from '../services/granite/responseValidator.js';
import { retrieveCompetitorContext } from '../services/rag/ragEngine.js';
import logger from '../utils/logger.js';

export async function analyzeCompetitors(idea, startupAnalysis = null) {
  logger.info(`[competitorAnalyzer] Analyzing competitors for: "${idea.startupName}" (${idea.industry})`);

  try {
    // Get live competitor research via RAG + web
    const { context: ragContext, sources } = await retrieveCompetitorContext(idea, startupAnalysis);
    logger.info(`[competitorAnalyzer] RAG retrieved ${sources.length} competitor sources`);

    const prompt = buildCompetitorPrompt(idea, ragContext);
    const raw = await generateWithRetry(prompt, { max_new_tokens: 2500 });
    const { data, valid, error } = parseGraniteResponse(raw, ['directCompetitors']);

    if (!valid || !data) {
      logger.warn('[competitorAnalyzer] Invalid JSON from Granite', { error });
      return {
        data: createFallbackSection('competitors', `IBM Granite returned invalid JSON: ${error}`),
        sources,
      };
    }

    if (Array.isArray(data.directCompetitors)) {
      data.directCompetitors = data.directCompetitors.map((c) => ({
        ...c,
        description: c.description || c.productService || '',
        pricingApproach: c.pricingApproach || c.pricing || '',
        differentiation: c.differentiation || c.differentiationOpportunity || '',
      }));
    }

    logger.info(`[competitorAnalyzer] ✓ Found ${data.directCompetitors?.length || 0} competitors`);
    return {
      data: { ...data, _graniteStatus: 'success', _generatedAt: new Date().toISOString(), _ragSourceCount: sources.length },
      sources,
    };
  } catch (err) {
    logger.error('[competitorAnalyzer] ✗ Failed', { error: err.message });
    return {
      data: createFallbackSection('competitors', err.message),
      sources: [],
    };
  }
}
