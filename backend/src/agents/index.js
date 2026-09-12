// backend/src/agents/index.js
// Central Startup Blueprint Agent Orchestrator
// Coordinates all specialized agents across 11 verified workflow steps

import prisma from '../db/prismaClient.js';
import logger from '../utils/logger.js';

import { analyzeStartup } from './startupAnalyzer.js';
import { analyzeCustomers } from './customerAnalyzer.js';
import { researchMarket } from './marketResearch.js';
import { analyzeCompetitors } from './competitorAnalyzer.js';
import { generateBusinessModel } from './businessModelGenerator.js';
import { generateRevenueModel } from './revenueModelGenerator.js';
import { generateBudget } from './budgetGenerator.js';
import { generateGTM } from './gtmGenerator.js';
import { findGovernmentSchemes } from './governmentSchemeFinder.js';
import { findFundingOpportunities } from './fundingFinder.js';
import { analyzeLegalRequirements } from './legalRequirementAnalyzer.js';
import { generateBlueprintSummary } from './blueprintGenerator.js';

// The 11 canonical workflow steps defined in Step 15
export const WORKFLOW_STEP_DEFINITIONS = [
  { id: 'startup_analysis', label: 'Understanding startup idea' },
  { id: 'customer_analysis', label: 'Analyzing customers' },
  { id: 'market_research', label: 'Researching market' },
  { id: 'competitor_analysis', label: 'Finding competitors' },
  { id: 'government_schemes', label: 'Finding government schemes' },
  { id: 'funding_research', label: 'Finding funding opportunities' },
  { id: 'legal_requirements', label: 'Researching legal requirements' },
  { id: 'rag_processing', label: 'Processing retrieved information' },
  { id: 'blueprint_generation', label: 'Generating blueprint with IBM Granite' },
  { id: 'bmc_building', label: 'Building Business Model Canvas' },
  { id: 'final_blueprint', label: 'Preparing final blueprint' },
];

export function createInitialWorkflowSteps() {
  return WORKFLOW_STEP_DEFINITIONS.map((s) => ({
    ...s,
    status: 'pending', // pending | running | completed | failed
    error: null,
    startedAt: null,
    completedAt: null,
  }));
}

// -------------------------------------------------------
// Save step progress to database
// -------------------------------------------------------
async function persistWorkflowProgress(blueprintId, steps) {
  try {
    await prisma.blueprint.update({
      where: { id: blueprintId },
      data: { stepProgress: JSON.stringify(steps) },
    });
  } catch (err) {
    logger.error(`[Agent] Failed to persist workflow progress for ${blueprintId}`, { error: err.message });
  }
}

// -------------------------------------------------------
// Save a section to the database
// -------------------------------------------------------
async function saveSection(blueprintId, sectionKey, title, content) {
  try {
    await prisma.blueprintSection.upsert({
      where: { blueprintId_sectionKey: { blueprintId, sectionKey } },
      update: { content: JSON.stringify(content), generatedAt: new Date() },
      create: {
        blueprintId,
        sectionKey,
        title,
        content: JSON.stringify(content),
      },
    });
  } catch (err) {
    logger.error(`Failed to save section ${sectionKey}`, { error: err.message });
  }
}

// -------------------------------------------------------
// Save sources to the database
// -------------------------------------------------------
async function saveSources(blueprintId, sources) {
  if (!sources || sources.length === 0) return;

  try {
    // Deduplicate by URL or title
    const seen = new Set();
    const cleanSources = [];

    for (const s of sources) {
      const key = (s.url || s.title || '').toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      cleanSources.push({
        blueprintId,
        title: (s.title || 'Official Source').substring(0, 200),
        url: s.url || null,
        category: s.category || 'general',
        snippet: s.snippet ? s.snippet.substring(0, 500) : null,
      });
    }

    if (cleanSources.length > 0) {
      await prisma.source.createMany({
        data: cleanSources,
        skipDuplicates: true,
      });
      logger.info(`[Agent] Saved ${cleanSources.length} unique sources for blueprint ${blueprintId}`);
    }
  } catch (err) {
    logger.error('Failed to save sources', { error: err.message });
  }
}

// -------------------------------------------------------
// Update blueprint status
// -------------------------------------------------------
async function updateBlueprintStatus(blueprintId, status, errorMessage = null) {
  try {
    await prisma.blueprint.update({
      where: { id: blueprintId },
      data: { status, errorMessage },
    });
  } catch (err) {
    logger.error(`[Agent] Failed to update blueprint status for ${blueprintId}`, { error: err.message });
  }
}

// -------------------------------------------------------
// Main Central Startup Blueprint Agent Orchestration
// Coordinates all 12 specialized agents across 11 steps
// -------------------------------------------------------
export async function orchestrateBlueprint(blueprintId, startupIdea) {
  logger.info(`[Agent] Starting central blueprint orchestration: ${blueprintId}`);

  const steps = createInitialWorkflowSteps();
  await persistWorkflowProgress(blueprintId, steps);

  const idea = {
    startupName: startupIdea.startupName,
    idea: startupIdea.idea,
    industry: startupIdea.industry,
    targetLocation: startupIdea.targetLocation,
    targetCustomer: startupIdea.targetCustomer,
    initialBudget: startupIdea.initialBudget,
    teamSize: startupIdea.teamSize,
    stage: startupIdea.stage,
    additionalNotes: startupIdea.additionalNotes || '',
  };

  const markStep = async (stepIndex, status, error = null) => {
    if (steps[stepIndex]) {
      steps[stepIndex].status = status;
      if (status === 'running') steps[stepIndex].startedAt = new Date().toISOString();
      if (status === 'completed' || status === 'failed') steps[stepIndex].completedAt = new Date().toISOString();
      if (error) steps[stepIndex].error = error;
      await persistWorkflowProgress(blueprintId, steps);
    }
  };

  try {
    await updateBlueprintStatus(blueprintId, 'generating');
    const allSources = [];

    // ── Step 1: Understanding startup idea (Startup Analysis Agent) ──
    logger.info('[Agent] Step 1/11: Understanding startup idea');
    await markStep(0, 'running');
    let problemData;
    try {
      problemData = await analyzeStartup(idea);
      if (problemData._status === 'failed') throw new Error(problemData._error);
      await saveSection(blueprintId, 'problem', 'Problem & Solution Analysis', problemData);
      await markStep(0, 'completed');
    } catch (err) {
      logger.error('[Agent] Step 1 failed', { error: err.message });
      await markStep(0, 'failed', `Startup analysis failed: ${err.message}`);
      throw err; // Crucial: foundational step failure aborts
    }

    // ── Step 2: Analyzing customers (Customer Analysis Agent) ──
    logger.info('[Agent] Step 2/11: Analyzing customers');
    await markStep(1, 'running');
    let customerData;
    try {
      customerData = await analyzeCustomers(idea, problemData);
      if (customerData._status === 'failed') throw new Error(customerData._error);
      await saveSection(blueprintId, 'customers', 'Target Customers', customerData);
      await markStep(1, 'completed');
    } catch (err) {
      logger.warn('[Agent] Step 2 failed', { error: err.message });
      await markStep(1, 'failed', `Customer analysis failed: ${err.message}`);
    }

    // ── Step 3: Researching market (Market Research Agent) ──
    logger.info('[Agent] Step 3/11: Researching market');
    await markStep(2, 'running');
    let marketData, marketSources = [];
    try {
      const res = await researchMarket(idea, problemData);
      marketData = res.data;
      marketSources = res.sources || [];
      allSources.push(...marketSources.map((s) => ({ ...s, category: 'market' })));
      if (marketData._status === 'failed') throw new Error(marketData._error);
      await saveSection(blueprintId, 'market', 'Market Analysis', marketData);
      await markStep(2, 'completed');
    } catch (err) {
      logger.warn('[Agent] Step 3 failed', { error: err.message });
      await markStep(2, 'failed', `Market research failed: ${err.message}`);
    }

    // ── Step 4: Finding competitors (Competitor Analysis Agent) ──
    logger.info('[Agent] Step 4/11: Finding competitors');
    await markStep(3, 'running');
    let competitorData, competitorSources = [];
    try {
      const res = await analyzeCompetitors(idea, problemData);
      competitorData = res.data;
      competitorSources = res.sources || [];
      allSources.push(...competitorSources.map((s) => ({ ...s, category: 'competitors' })));
      if (competitorData._status === 'failed') throw new Error(competitorData._error);
      await saveSection(blueprintId, 'competitors', 'Competitor Analysis', competitorData);
      await markStep(3, 'completed');
    } catch (err) {
      logger.warn('[Agent] Step 4 failed', { error: err.message });
      await markStep(3, 'failed', `Competitor research failed: ${err.message}`);
    }

    // ── Step 5: Finding government schemes (Government Scheme Agent) ──
    logger.info('[Agent] Step 5/11: Finding government schemes');
    await markStep(4, 'running');
    let schemesData, schemeSources = [];
    try {
      const res = await findGovernmentSchemes(idea, problemData);
      schemesData = res.data;
      schemeSources = res.sources || [];
      allSources.push(...schemeSources.map((s) => ({ ...s, category: 'schemes' })));
      if (schemesData._status === 'failed') throw new Error(schemesData._error);
      await saveSection(blueprintId, 'schemes', 'Government Schemes', schemesData);
      await markStep(4, 'completed');
    } catch (err) {
      logger.warn('[Agent] Step 5 failed', { error: err.message });
      await markStep(4, 'failed', `Government scheme lookup failed: ${err.message}`);
    }

    // ── Step 6: Finding funding opportunities (Funding Research Agent) ──
    logger.info('[Agent] Step 6/11: Finding funding opportunities');
    await markStep(5, 'running');
    let fundingData, fundingSources = [];
    try {
      const res = await findFundingOpportunities(idea, problemData);
      fundingData = res.data;
      fundingSources = res.sources || [];
      allSources.push(...fundingSources.map((s) => ({ ...s, category: 'funding' })));
      if (fundingData._status === 'failed') throw new Error(fundingData._error);
      await saveSection(blueprintId, 'funding', 'Funding Opportunities', fundingData);
      await markStep(5, 'completed');
    } catch (err) {
      logger.warn('[Agent] Step 6 failed', { error: err.message });
      await markStep(5, 'failed', `Funding research failed: ${err.message}`);
    }

    // ── Step 7: Researching legal requirements (Legal/Compliance Agent) ──
    logger.info('[Agent] Step 7/11: Researching legal requirements');
    await markStep(6, 'running');
    let legalData, legalSources = [];
    try {
      const res = await analyzeLegalRequirements(idea, problemData);
      legalData = res.data;
      legalSources = res.sources || [];
      allSources.push(...legalSources.map((s) => ({ ...s, category: 'legal' })));
      if (legalData._status === 'failed') throw new Error(legalData._error);
      await saveSection(blueprintId, 'legal', 'Legal Requirements', legalData);
      await markStep(6, 'completed');
    } catch (err) {
      logger.warn('[Agent] Step 7 failed', { error: err.message });
      await markStep(6, 'failed', `Legal analysis failed: ${err.message}`);
    }

    // ── Step 8: Processing retrieved information (RAG Source Processing) ──
    logger.info('[Agent] Step 8/11: Processing retrieved information');
    await markStep(7, 'running');
    try {
      await saveSources(blueprintId, allSources);
      await markStep(7, 'completed');
    } catch (err) {
      logger.warn('[Agent] Step 8 failed', { error: err.message });
      await markStep(7, 'failed', `Source processing failed: ${err.message}`);
    }

    // ── Step 9: Generating blueprint with IBM Granite (Revenue & Budget) ──
    logger.info('[Agent] Step 9/11: Generating blueprint with IBM Granite');
    await markStep(8, 'running');
    let revenueData, budgetData;
    try {
      revenueData = await generateRevenueModel(idea);
      await saveSection(blueprintId, 'revenue', 'Revenue Model', revenueData);

      budgetData = await generateBudget(idea);
      await saveSection(blueprintId, 'budget', 'Estimated Budget', budgetData);

      if (revenueData._status === 'failed' || budgetData._status === 'failed') {
        throw new Error(revenueData._error || budgetData._error);
      }
      await markStep(8, 'completed');
    } catch (err) {
      logger.warn('[Agent] Step 9 failed', { error: err.message });
      await markStep(8, 'failed', `Financial generation failed: ${err.message}`);
    }

    // ── Step 10: Building Business Model Canvas (BMC & GTM) ──
    logger.info('[Agent] Step 10/11: Building Business Model Canvas');
    await markStep(9, 'running');
    let bmcData, gtmData;
    try {
      bmcData = await generateBusinessModel(idea, problemData);
      await saveSection(blueprintId, 'bmc', 'Business Model Canvas', bmcData);

      gtmData = await generateGTM(idea, customerData);
      await saveSection(blueprintId, 'gtm', 'Go-To-Market Strategy', gtmData);

      if (bmcData._status === 'failed' || gtmData._status === 'failed') {
        throw new Error(bmcData._error || gtmData._error);
      }
      await markStep(9, 'completed');
    } catch (err) {
      logger.warn('[Agent] Step 10 failed', { error: err.message });
      await markStep(9, 'failed', `BMC / GTM generation failed: ${err.message}`);
    }

    // ── Step 11: Preparing final blueprint (Executive Summary & Synthesis) ──
    logger.info('[Agent] Step 11/11: Preparing final blueprint');
    await markStep(10, 'running');
    let summaryData;
    try {
      const allSections = {
        problem: problemData,
        customers: customerData,
        market: marketData,
        competitors: competitorData,
        bmc: bmcData,
        revenue: revenueData,
        budget: budgetData,
        gtm: gtmData,
        schemes: schemesData,
        funding: fundingData,
        legal: legalData,
      };

      summaryData = await generateBlueprintSummary(idea, allSections);
      await saveSection(blueprintId, 'executive_summary', 'Executive Summary', summaryData);
      await markStep(10, 'completed');
    } catch (err) {
      logger.warn('[Agent] Step 11 failed', { error: err.message });
      await markStep(10, 'failed', `Final synthesis failed: ${err.message}`);
    }

    // Determine final overall status
    const hasFailures = steps.some((s) => s.status === 'failed');
    if (hasFailures) {
      const failedSteps = steps.filter((s) => s.status === 'failed').map((s) => s.label).join(', ');
      await updateBlueprintStatus(blueprintId, 'completed', `Completed with warnings in: ${failedSteps}`);
    } else {
      await updateBlueprintStatus(blueprintId, 'completed');
    }

    logger.info(`[Agent] Blueprint ${blueprintId} orchestration completed`);
    return { success: true, blueprintId, steps };
  } catch (err) {
    logger.error(`[Agent] Blueprint ${blueprintId} critical failure`, { error: err.message });
    await updateBlueprintStatus(blueprintId, 'failed', err.message);
    return { success: false, blueprintId, error: err.message };
  }
}

// -------------------------------------------------------
// Regenerate a single section
// -------------------------------------------------------
export async function regenerateSection(blueprintId, sectionKey, startupIdea) {
  logger.info(`[Agent] Regenerating section: ${sectionKey} for blueprint: ${blueprintId}`);

  const idea = startupIdea;

  const sectionHandlers = {
    problem: () => analyzeStartup(idea).then((d) => ({ data: d, sources: [] })),
    customers: () => analyzeCustomers(idea).then((d) => ({ data: d, sources: [] })),
    market: () => researchMarket(idea),
    competitors: () => analyzeCompetitors(idea),
    bmc: () => generateBusinessModel(idea).then((d) => ({ data: d, sources: [] })),
    revenue: () => generateRevenueModel(idea).then((d) => ({ data: d, sources: [] })),
    budget: () => generateBudget(idea).then((d) => ({ data: d, sources: [] })),
    gtm: () => generateGTM(idea).then((d) => ({ data: d, sources: [] })),
    schemes: () => findGovernmentSchemes(idea),
    funding: () => findFundingOpportunities(idea),
    legal: () => analyzeLegalRequirements(idea),
    executive_summary: () =>
      generateBlueprintSummary(idea, {}).then((d) => ({ data: d, sources: [] })),
  };

  const sectionTitles = {
    problem: 'Problem & Solution Analysis',
    customers: 'Target Customers',
    market: 'Market Analysis',
    competitors: 'Competitor Analysis',
    bmc: 'Business Model Canvas',
    revenue: 'Revenue Model',
    budget: 'Estimated Budget',
    gtm: 'Go-To-Market Strategy',
    schemes: 'Government Schemes',
    funding: 'Funding Opportunities',
    legal: 'Legal Requirements',
    executive_summary: 'Executive Summary',
  };

  if (!sectionHandlers[sectionKey]) {
    throw new Error(`Unknown section: ${sectionKey}`);
  }

  const { data, sources } = await sectionHandlers[sectionKey]();
  await saveSection(blueprintId, sectionKey, sectionTitles[sectionKey], data);

  if (sources && sources.length > 0) {
    await saveSources(blueprintId, sources.map((s) => ({ ...s, category: sectionKey })));
  }

  return data;
}
