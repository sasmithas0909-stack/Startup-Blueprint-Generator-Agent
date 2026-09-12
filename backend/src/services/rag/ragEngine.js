// backend/src/services/rag/ragEngine.js
// RAG Engine — combines static knowledge base + live web research
// Provides grounded context to IBM Granite for each blueprint section

import logger from '../../utils/logger.js';
import { getVectorStore, queryVectorStore } from './vectorStore.js';
import {
  researchMarketSize,
  researchCompetitors,
  researchGovernmentSchemes,
  researchFunding,
  researchLegal,
  researchIndustryTrends,
  formatResearchContext,
} from '../research/webResearch.js';

// -------------------------------------------------------
// Query the static knowledge base
// -------------------------------------------------------
async function retrieveFromKnowledgeBase(query, category = null, topK = 5) {
  try {
    const store = await getVectorStore();
    const where = category ? { category: { $eq: category } } : undefined;
    const results = await queryVectorStore(store, query, topK, where);

    if (!results || results.length === 0) {
      return { context: '', sources: [] };
    }

    const context = results
      .map((r, i) => `[KB Source ${i + 1}: ${r.metadata.title}]\n${r.document}`)
      .join('\n\n---\n\n');

    const sources = results.map((r) => ({
      title: r.metadata.title,
      url: r.metadata.url || null,
      category: r.metadata.category,
      snippet: r.document.substring(0, 250),
      type: 'knowledge_base',
    }));

    logger.info(`[RAG] Knowledge base: ${results.length} chunks for query`, {
      query: query.substring(0, 60),
      category,
    });

    return { context, sources };
  } catch (err) {
    logger.warn(`[RAG] Knowledge base retrieval failed: ${err.message}`);
    return { context: '', sources: [] };
  }
}

// -------------------------------------------------------
// Combine KB context + live web context
// -------------------------------------------------------
async function buildCombinedContext(kbContext, webResearch) {
  const parts = [];
  const sources = [];

  if (kbContext?.context) {
    parts.push('=== KNOWLEDGE BASE ===\n' + kbContext.context);
    sources.push(...(kbContext.sources || []).map((s) => ({ ...s, type: 'knowledge_base' })));
  }

  if (webResearch?.results?.length > 0) {
    const webContext = formatResearchContext(webResearch);
    if (webContext) {
      parts.push('=== LIVE WEB RESEARCH (Retrieved: ' + new Date().toISOString() + ') ===\n' + webContext);
    }
    sources.push(
      ...webResearch.results.slice(0, 8).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet?.substring(0, 300) || '',
        category: webResearch.category || 'web',
        type: 'web_search',
        source: r.source,
        retrievedAt: r.retrievedAt,
      }))
    );
  }

  return {
    context: parts.join('\n\n'),
    sources,
    hasWebResearch: (webResearch?.results?.length || 0) > 0,
    hasKBContent: !!kbContext?.context,
  };
}

// -------------------------------------------------------
// Market context — KB + live market research
// -------------------------------------------------------
export async function retrieveMarketContext(idea, startupAnalysis = null) {
  logger.info(`[RAG] Retrieving market context for: ${idea.industry} / ${idea.startupName}`);

  const kbQuery = `${idea.industry} ${idea.idea} market trends opportunity India`;

  const [kb, webMarket, webTrends] = await Promise.allSettled([
    retrieveFromKnowledgeBase(kbQuery, 'market', 4),
    researchMarketSize(idea, startupAnalysis),
    researchIndustryTrends(idea, startupAnalysis),
  ]);

  const kbResult = kb.status === 'fulfilled' ? kb.value : { context: '', sources: [] };
  const webMarketResult = webMarket.status === 'fulfilled' ? webMarket.value : { results: [] };
  const webTrendsResult = webTrends.status === 'fulfilled' ? webTrends.value : { results: [] };

  // Merge web results
  const allWebResults = [
    ...(webMarketResult.results || []),
    ...(webTrendsResult.results || []),
  ];

  const combined = await buildCombinedContext(kbResult, {
    results: allWebResults,
    category: 'market',
  });

  logger.info(`[RAG] Market context ready — KB: ${kbResult.sources.length} docs, Web: ${allWebResults.length} results`);
  return combined;
}

// -------------------------------------------------------
// Competitor context — live web research primary
// -------------------------------------------------------
export async function retrieveCompetitorContext(idea, startupAnalysis = null) {
  logger.info(`[RAG] Retrieving competitor context for: ${idea.industry} / ${idea.startupName}`);

  const webResult = await researchCompetitors(idea, startupAnalysis).catch((err) => {
    logger.warn(`[RAG] Competitor web research failed: ${err.message}`);
    return { results: [] };
  });

  const kbResult = await retrieveFromKnowledgeBase(
    `${idea.industry} ${idea.idea} competitors market players`,
    'market', 2
  ).catch(() => ({ context: '', sources: [] }));

  return buildCombinedContext(kbResult, { ...webResult, category: 'competitors' });
}

// -------------------------------------------------------
// Government schemes context — official sources priority
// -------------------------------------------------------
export async function retrieveSchemesContext(idea, startupAnalysis = null) {
  logger.info(`[RAG] Retrieving schemes context for: ${idea.industry} / ${idea.targetLocation}`);

  const kbQuery = `government startup schemes ${idea.industry} ${idea.targetLocation} ${idea.stage} ${idea.idea}`;

  const [kb, web] = await Promise.allSettled([
    retrieveFromKnowledgeBase(kbQuery, 'schemes', 6),
    researchGovernmentSchemes(idea, startupAnalysis),
  ]);

  const kbResult = kb.status === 'fulfilled' ? kb.value : { context: '', sources: [] };
  const webResult = web.status === 'fulfilled' ? web.value : { results: [] };

  logger.info(`[RAG] Schemes context — KB: ${kbResult.sources.length}, Web: ${webResult.results?.length || 0}`);
  return buildCombinedContext(kbResult, { ...webResult, category: 'schemes' });
}

// -------------------------------------------------------
// Funding context — live research + KB
// -------------------------------------------------------
export async function retrieveFundingContext(idea, startupAnalysis = null) {
  logger.info(`[RAG] Retrieving funding context for: ${idea.industry} / ${idea.stage}`);

  const kbQuery = `startup funding incubators accelerators grants ${idea.industry} ${idea.stage} India ${idea.targetLocation}`;

  const [kb, web] = await Promise.allSettled([
    retrieveFromKnowledgeBase(kbQuery, 'funding', 6),
    researchFunding(idea, startupAnalysis),
  ]);

  const kbResult = kb.status === 'fulfilled' ? kb.value : { context: '', sources: [] };
  const webResult = web.status === 'fulfilled' ? web.value : { results: [] };

  logger.info(`[RAG] Funding context — KB: ${kbResult.sources.length}, Web: ${webResult.results?.length || 0}`);
  return buildCombinedContext(kbResult, { ...webResult, category: 'funding' });
}

// -------------------------------------------------------
// Legal context — official government sources
// -------------------------------------------------------
export async function retrieveLegalContext(idea, startupAnalysis = null) {
  logger.info(`[RAG] Retrieving legal context for: ${idea.industry} / ${idea.targetLocation}`);

  const kbQuery = `startup legal registration compliance ${idea.industry} ${idea.targetLocation}`;

  const [kb, web] = await Promise.allSettled([
    retrieveFromKnowledgeBase(kbQuery, 'legal', 4),
    researchLegal(idea, startupAnalysis),
  ]);

  const kbResult = kb.status === 'fulfilled' ? kb.value : { context: '', sources: [] };
  const webResult = web.status === 'fulfilled' ? web.value : { results: [] };

  logger.info(`[RAG] Legal context — KB: ${kbResult.sources.length}, Web: ${webResult.results?.length || 0}`);
  return buildCombinedContext(kbResult, { ...webResult, category: 'legal' });
}

// -------------------------------------------------------
// Generic retrieve (used by old callers)
// -------------------------------------------------------
export async function retrieveContext(query, category = null, topK = 5) {
  return retrieveFromKnowledgeBase(query, category, topK);
}
