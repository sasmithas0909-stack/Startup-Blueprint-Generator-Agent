// backend/src/services/research/webResearch.js
// Live web research with Tavily and DuckDuckGo HTML search
// Dynamically tailored to the user's specific startup idea, location, and domain

import fetch from 'node-fetch';
import logger from '../../utils/logger.js';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_URL = 'https://api.tavily.com/search';

// Helper to extract clean domain name
export function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url || 'web';
  }
}

// Decode DuckDuckGo redirect URLs: /l/?uddg=https%3A%2F%2F...
function decodeDDGUrl(rawUrl) {
  try {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('//')) rawUrl = 'https:' + rawUrl;
    if (rawUrl.includes('duckduckgo.com/l/?uddg=')) {
      const match = rawUrl.match(/uddg=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

// Strip HTML tags and decode HTML entities
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// -------------------------------------------------------
// Tavily search — returns rich structured results
// -------------------------------------------------------
async function tavilySearch(query, options = {}) {
  if (!TAVILY_API_KEY || TAVILY_API_KEY.includes('your_tavily')) {
    throw new Error('TAVILY_API_KEY not configured');
  }

  logger.info(`[WebResearch] Tavily search: "${query.substring(0, 80)}"`);

  const body = {
    api_key: TAVILY_API_KEY,
    query,
    search_depth: options.depth || 'basic',
    include_answer: true,
    include_raw_content: false,
    max_results: options.maxResults || 6,
    include_domains: options.includeDomains || [],
    exclude_domains: options.excludeDomains || [
      'pinterest.com', 'instagram.com', 'facebook.com', 'twitter.com',
      'reddit.com', 'quora.com', 'youtube.com',
    ],
  };

  const response = await fetch(TAVILY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Tavily API error: HTTP ${response.status} — ${errBody.substring(0, 200)}`);
  }

  const data = await response.json();
  const results = (data.results || []).map((r) => ({
    title: stripHtml(r.title || 'Untitled'),
    url: r.url || '',
    snippet: stripHtml(r.content || r.description || ''),
    score: r.score || 0.9,
    publishedDate: r.published_date || null,
    source: extractDomain(r.url),
    retrievedAt: new Date().toISOString(),
  }));

  return {
    query,
    answer: data.answer || null,
    results,
    source: 'tavily',
    retrievedAt: new Date().toISOString(),
    totalResults: results.length,
  };
}

// -------------------------------------------------------
// DuckDuckGo HTML web search scraper (fully working fallback)
// -------------------------------------------------------
async function duckduckgoSearch(query, maxResults = 5) {
  logger.info(`[WebResearch] DuckDuckGo web search: "${query.substring(0, 80)}"`);

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  try {
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;

    const response = await fetch(searchUrl, { headers });
    if (!response.ok) {
      throw new Error(`DuckDuckGo returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const results = [];

    // Match each result block
    // Format: <div class="result results_links results_links_deep web-result ">
    //   <a class="result__a" href="...">Title</a>
    //   <a class="result__snippet" ...>Snippet</a>
    const resultBlockRegex = /<div[^>]*class="[^"]*web-result[^"]*"[\s\S]*?<\/div>\s*<\/div>/g;
    let blockMatch;

    while ((blockMatch = resultBlockRegex.exec(html)) !== null && results.length < maxResults) {
      const block = blockMatch[0];

      const urlMatch = block.match(/<a[^>]*class="[^"]*result__url[^"]*"[^>]*href="([^"]+)"|<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"/);
      const titleMatch = block.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = block.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>|<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/);

      const rawUrl = urlMatch ? (urlMatch[1] || urlMatch[2]) : '';
      const cleanUrl = decodeDDGUrl(rawUrl);
      const cleanTitle = stripHtml(titleMatch ? titleMatch[1] : '');
      const cleanSnippet = stripHtml(snippetMatch ? (snippetMatch[1] || snippetMatch[2]) : '');

      if (cleanUrl && cleanTitle) {
        results.push({
          title: cleanTitle,
          url: cleanUrl,
          snippet: cleanSnippet || cleanTitle,
          score: 0.85 - results.length * 0.05,
          source: extractDomain(cleanUrl),
          retrievedAt: new Date().toISOString(),
        });
      }
    }

    // Secondary fallback parse if block regex was strict
    if (results.length === 0) {
      const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      let lm, sm;
      while ((lm = linkRegex.exec(html)) !== null && results.length < maxResults) {
        sm = snippetRegex.exec(html);
        const url = decodeDDGUrl(lm[1]);
        const title = stripHtml(lm[2]);
        const snippet = sm ? stripHtml(sm[1]) : title;
        if (url && title) {
          results.push({
            title,
            url,
            snippet,
            score: 0.8,
            source: extractDomain(url),
            retrievedAt: new Date().toISOString(),
          });
        }
      }
    }

    logger.info(`[WebResearch] DuckDuckGo found ${results.length} real web results for "${query.substring(0, 60)}"`);

    return {
      query,
      answer: results[0]?.snippet || null,
      results,
      source: 'duckduckgo',
      retrievedAt: new Date().toISOString(),
      totalResults: results.length,
    };
  } catch (err) {
    logger.warn(`[WebResearch] DuckDuckGo scraping failed for "${query}": ${err.message}`);
    return {
      query,
      answer: null,
      results: [],
      source: 'duckduckgo',
      error: err.message,
      retrievedAt: new Date().toISOString(),
      totalResults: 0,
    };
  }
}

// -------------------------------------------------------
// Main search — tries Tavily first, falls back to DuckDuckGo
// -------------------------------------------------------
export async function webSearch(query, options = {}) {
  if (TAVILY_API_KEY && !TAVILY_API_KEY.includes('your_tavily')) {
    try {
      const result = await tavilySearch(query, options);
      if (result.results && result.results.length > 0) {
        return result;
      }
    } catch (err) {
      logger.warn(`[WebResearch] Tavily search error, falling back to DDG: ${err.message}`);
    }
  }

  return duckduckgoSearch(query, options.maxResults || 5);
}

// -------------------------------------------------------
// Keyword & intent extractor from startup details
// -------------------------------------------------------
function extractKeyTerms(idea, problemContext = null) {
  const text = `${idea.startupName || ''} ${idea.idea || ''} ${problemContext?.solution?.proposedSolution || ''}`.toLowerCase();

  // Extract meaningful phrases
  const terms = [];

  if (/crop|plant|farm|farmer|agri/i.test(text)) {
    terms.push('crop disease detection AI', 'smart farming agriculture');
  }
  if (/career|student|college|guidance|job|placement/i.test(text)) {
    terms.push('AI career guidance college students', 'edtech placement skill platform');
  }
  if (/health|patient|doctor|medical|clinic/i.test(text)) {
    terms.push('healthtech telemedicine AI healthcare');
  }
  if (/finance|payment|lending|credit|bank|fintech/i.test(text)) {
    terms.push('fintech digital payments lending India');
  }
  if (/waste|clean|solar|green|energy/i.test(text)) {
    terms.push('cleantech renewable energy sustainability');
  }

  const location = (idea.targetLocation || 'India').replace(/tier\s*\d/gi, '').replace(/[()]/g, '').trim();
  const industry = (idea.industry || 'Technology').replace(/\s*\/\s*.*/, '').trim();

  // Default key term from idea text if nothing matched
  if (terms.length === 0) {
    const words = (idea.idea || '').split(/\s+/).slice(0, 6).join(' ');
    terms.push(`${industry} ${words}`);
  }

  return {
    primaryTerm: terms[0],
    secondaryTerm: terms[1] || `${industry} startup innovations`,
    location: location || 'India',
    industry,
  };
}

// -------------------------------------------------------
// Dynamic domain-specific search helpers
// -------------------------------------------------------

export async function researchMarketSize(idea, context = null) {
  const { primaryTerm, location, industry } = extractKeyTerms(idea, context);
  const queries = [
    `${primaryTerm} market size ${location}`,
    `${industry} market growth trends India 2024 2025`,
    `${industry} TAM SAM SOM industry report India`,
  ];

  const results = await Promise.allSettled(queries.map((q) => webSearch(q, { maxResults: 4 })));
  return mergeResults(results, 'market');
}

export async function researchCompetitors(idea, context = null) {
  const { primaryTerm, industry, location } = extractKeyTerms(idea, context);
  const queries = [
    `${primaryTerm} startups companies competitors India`,
    `top ${industry} startups ${location} products`,
    `${primaryTerm} alternatives market players`,
  ];

  const results = await Promise.allSettled(queries.map((q) => webSearch(q, { maxResults: 5 })));
  return mergeResults(results, 'competitors');
}

export async function researchGovernmentSchemes(idea, context = null) {
  const { primaryTerm, location, industry } = extractKeyTerms(idea, context);
  const queries = [
    `government schemes for ${industry} startups ${location}`,
    `Startup India ${industry} grants subsidies`,
    `${location} government startup funding schemes`,
  ];

  const results = await Promise.allSettled(queries.map((q) => webSearch(q, { maxResults: 5 })));
  return mergeResults(results, 'schemes');
}

export async function researchFunding(idea, context = null) {
  const { primaryTerm, industry, location } = extractKeyTerms(idea, context);
  const queries = [
    `${industry} startup funding incubators accelerators ${location}`,
    `venture capital angel investors ${industry} startups India`,
    `Startup India Seed Fund Scheme ${industry}`,
  ];

  const results = await Promise.allSettled(queries.map((q) => webSearch(q, { maxResults: 5 })));
  return mergeResults(results, 'funding');
}

export async function researchLegal(idea, context = null) {
  const { industry, location } = extractKeyTerms(idea, context);
  const queries = [
    `${industry} startup registration compliance legal requirements India`,
    `licenses permits needed for ${industry} business India ${location}`,
    `DPIIT startup recognition IP trademark patents India`,
  ];

  const results = await Promise.allSettled(queries.map((q) => webSearch(q, { maxResults: 4 })));
  return mergeResults(results, 'legal');
}

export async function researchIndustryTrends(idea, context = null) {
  const { primaryTerm, industry } = extractKeyTerms(idea, context);
  const queries = [
    `${primaryTerm} latest technology trends 2024 2025`,
    `${industry} innovations adoption challenges India`,
  ];

  const results = await Promise.allSettled(queries.map((q) => webSearch(q, { maxResults: 4 })));
  return mergeResults(results, 'trends');
}

// -------------------------------------------------------
// Merge results from multiple search queries
// -------------------------------------------------------
function mergeResults(settledResults, category) {
  const allResults = [];
  const errors = [];

  settledResults.forEach((r) => {
    if (r.status === 'fulfilled' && r.value?.results?.length > 0) {
      allResults.push(...r.value.results.map((res) => ({ ...res, category })));
    } else if (r.status === 'rejected') {
      errors.push(r.reason?.message || 'Search request failed');
    }
  });

  // Deduplicate by URL
  const seen = new Set();
  const deduped = allResults.filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Sort by score
  deduped.sort((a, b) => (b.score || 0) - (a.score || 0));

  return {
    results: deduped.slice(0, 10),
    category,
    totalFound: deduped.length,
    errors: errors.length > 0 ? errors : undefined,
    retrievedAt: new Date().toISOString(),
  };
}

// -------------------------------------------------------
// Format web results into RAG context string
// -------------------------------------------------------
export function formatResearchContext(research) {
  if (!research?.results?.length) {
    return '';
  }

  return research.results
    .filter((r) => r.snippet && r.snippet.length > 30)
    .slice(0, 8)
    .map((r, i) =>
      `[Source ${i + 1}: ${r.title} — ${r.source}]\nURL: ${r.url}\nExcerpt: ${r.snippet}\nRetrieved: ${r.retrievedAt || new Date().toISOString()}`
    )
    .join('\n\n---\n\n');
}
