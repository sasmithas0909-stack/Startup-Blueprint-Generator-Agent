// backend/src/services/granite/responseValidator.js
// Validates and sanitises IBM Granite responses
// FIXED: fallbacks now explain the real error instead of showing N/A

import { extractJson } from '../../utils/helpers.js';
import logger from '../../utils/logger.js';

/**
 * Parse a Granite response — extract JSON and validate required keys.
 * Returns { data, raw, valid, error }
 */
export function parseGraniteResponse(rawText, requiredKeys = []) {
  const raw = rawText?.trim() || '';

  if (!raw) {
    return { data: null, raw, valid: false, error: 'IBM Granite returned an empty response.' };
  }

  const data = extractJson(raw);

  if (!data) {
    logger.warn('[Granite] Could not extract JSON from response', {
      preview: raw.substring(0, 400),
      length: raw.length,
    });
    return {
      data: null,
      raw,
      valid: false,
      error:
        'IBM Granite returned unstructured text instead of JSON. ' +
        `Raw preview: "${raw.substring(0, 200)}"`,
    };
  }

  // Check and log any missing required keys (not a hard failure — Granite may use different key names)
  const missingKeys = requiredKeys.filter((k) => !(k in data));
  if (missingKeys.length > 0) {
    logger.warn('[Granite] Response missing expected keys — will use what was returned', {
      missingKeys,
      returnedKeys: Object.keys(data),
    });
  }

  return { data, raw, valid: true, error: null };
}

/**
 * Validate that a section has meaningful content (not just empty shells)
 */
export function validateSectionContent(data) {
  if (!data || typeof data !== 'object') return false;
  const str = JSON.stringify(data);
  return str.length > 100;
}

/**
 * Create a diagnostic fallback for a section when AI fails.
 * Every fallback includes _error and _status so the frontend can
 * display a meaningful message instead of silent N/A.
 */
export function createFallbackSection(sectionKey, errorMessage = null) {
  const errorMsg = errorMessage || 'This section could not be generated from available sources.';
  const errorInfo = {
    _status: 'failed',
    _error: errorMsg,
    _retrievedAt: new Date().toISOString(),
    _action: 'Click "Regenerate" to retry this analysis with updated parameters or live sources.',
  };

  const fallbacks = {
    problem: {
      ...errorInfo,
      problem: {
        mainProblem: `Problem analysis could not be completed: ${errorMsg}`,
        whoExperiences: 'Information unavailable from sources',
        whyItMatters: 'Information unavailable from sources',
        problemScale: 'Information unavailable from sources',
        currentAlternatives: [],
        gapInMarket: 'Information unavailable from sources',
      },
      solution: {
        proposedSolution: 'Solution synthesis failed',
        howItSolves: 'Information unavailable',
        keyFeatures: [],
        technologyApproach: 'Information unavailable',
        innovationFactor: 'Information unavailable',
      },
      usp: {
        uniqueSellingPropositions: [],
        differentiationFactors: [],
        valueProposition: 'Value proposition could not be established',
        competitiveAdvantage: 'Information unavailable',
      },
    },

    customers: {
      ...errorInfo,
      primaryCustomers: {
        segment: 'Primary customer analysis unavailable',
        demographics: 'Information unavailable',
        psychographics: 'Information unavailable',
        behaviors: 'Information unavailable',
        painPoints: [],
        willingness_to_pay: 'Information unavailable',
        size: 'Segment size estimation unavailable',
      },
      secondaryCustomers: { segment: 'Information unavailable', painPoints: [], opportunity: 'Information unavailable' },
      customerPersonas: [],
      customerJourney: {
        awareness: 'Information unavailable',
        consideration: 'Information unavailable',
        decision: 'Information unavailable',
        retention: 'Information unavailable',
        advocacy: 'Information unavailable',
      },
    },

    market: {
      ...errorInfo,
      marketOverview: `Market research failed: ${errorMsg}`,
      marketOpportunity: 'Opportunity analysis unavailable',
      keyTrends: [],
      marketSize: {
        tam: { value: 'Unavailable', source: 'N/A', assumption: 'Data could not be retrieved', calculation: 'None' },
        sam: { value: 'Unavailable', source: 'N/A', assumption: 'Data could not be retrieved', calculation: 'None' },
        som: { value: 'Unavailable', source: 'N/A', assumption: 'Data could not be retrieved', calculation: 'None' },
        note: errorMsg,
      },
      keyDrivers: [],
      keyBarriers: [],
      regulatoryEnvironment: 'Regulatory overview unavailable',
    },

    competitors: {
      ...errorInfo,
      directCompetitors: [],
      indirectCompetitors: [],
      competitiveAnalysis: {
        ourAdvantages: [],
        ourDisadvantages: [],
        differentiationOpportunities: [],
        competitivePositioning: `Competitor research failed: ${errorMsg}`,
      },
    },

    bmc: {
      ...errorInfo,
      keyPartners: { title: 'Key Partners', items: [], description: 'Analysis unavailable' },
      keyActivities: { title: 'Key Activities', items: [], description: 'Analysis unavailable' },
      keyResources: { title: 'Key Resources', items: [], description: 'Analysis unavailable' },
      valuePropositions: { title: 'Value Propositions', items: [], description: 'Analysis unavailable' },
      customerRelationships: { title: 'Customer Relationships', items: [], description: 'Analysis unavailable' },
      channels: { title: 'Channels', items: [], description: 'Analysis unavailable' },
      customerSegments: { title: 'Customer Segments', items: [], description: 'Analysis unavailable' },
      costStructure: { title: 'Cost Structure', items: [], description: 'Analysis unavailable' },
      revenueStreams: { title: 'Revenue Streams', items: [], description: 'Analysis unavailable' },
    },

    revenue: {
      ...errorInfo,
      recommendedModels: [],
      pricingStrategy: { approach: 'Pricing analysis unavailable', rationale: 'None', tiers: [] },
      revenueProjections: {
        year1: 'Unavailable', year2: 'Unavailable', year3: 'Unavailable',
        assumptions: [],
        disclaimer: errorMsg,
      },
      unitEconomics: { estimatedCAC: 'Unavailable', estimatedLTV: 'Unavailable' },
    },

    budget: {
      ...errorInfo,
      totalEstimatedBudget: 'Estimate unavailable',
      currency: 'INR',
      breakdown: [],
      burnRate: 'Unavailable',
      runway: 'Unavailable',
      disclaimer: errorMsg,
    },

    gtm: {
      ...errorInfo,
      gtmOverview: `GTM strategy generation failed: ${errorMsg}`,
      launchStrategy: { approach: 'Unavailable', description: 'None', keyMilestones: [] },
      customerAcquisition: { primaryChannels: [], acquisitionStrategies: [], retentionStrategies: [] },
      marketingChannels: [],
      pricingApproach: { strategy: 'Unavailable', rationale: 'None' },
      geographicStrategy: { phase1: 'Unavailable', phase2: 'Unavailable', phase3: 'Unavailable' },
      actionPlan: {
        first30Days: { theme: 'Unavailable', actions: [] },
        first60Days: { theme: 'Unavailable', actions: [] },
        first90Days: { theme: 'Unavailable', actions: [] },
      },
      successMetrics: [],
    },

    schemes: {
      ...errorInfo,
      schemes: [],
      disclaimer: `Government scheme lookup failed: ${errorMsg}. Please check https://www.startupindia.gov.in for official portals.`,
    },

    funding: {
      ...errorInfo,
      fundingOpportunities: [],
      fundingRoadmap: { immediate: 'Unavailable', shortTerm: 'Unavailable', longTerm: 'Unavailable' },
      disclaimer: `Funding research failed: ${errorMsg}. Please check https://seedfund.startupindia.gov.in for official schemes.`,
    },

    legal: {
      ...errorInfo,
      businessRegistration: {
        recommendedStructure: 'Private Limited Company',
        rationale: 'Standard structure for technology startups in India',
        registrationSteps: [],
        estimatedCost: 'INR 10,000 - 15,000',
        authority: 'Ministry of Corporate Affairs (mca.gov.in)',
      },
      complianceRequirements: [],
      intellectualProperty: { recommendations: [], trademarkInfo: 'Unavailable', patentInfo: 'Unavailable' },
      industrySpecificLicenses: [],
      dataProtection: 'Compliance with DPDP Act 2023 is required.',
      employmentLaws: 'Standard Indian employment regulations apply.',
      disclaimer: 'General informational guidance — not legal advice. Consult a qualified lawyer before making legal decisions.',
    },

    executive_summary: {
      ...errorInfo,
      executiveSummary: `Executive summary could not be synthesized: ${errorMsg}`,
      elevatorPitch: 'Summary unavailable',
      keyHighlights: [],
      missionStatement: 'Unavailable',
      visionStatement: 'Unavailable',
    },
  };

  return fallbacks[sectionKey] || { ...errorInfo };
}
