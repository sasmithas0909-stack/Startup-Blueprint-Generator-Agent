// backend/src/services/granite/promptBuilder.js
// Builds structured prompts for each agent module
// Uses IBM Granite instruction format

const SYSTEM_CONTEXT = `You are an expert startup advisor and business analyst with deep knowledge of entrepreneurship, market research, business modeling, and startup ecosystems. You provide accurate, actionable, and well-structured analysis.

IMPORTANT RULES:
- Always respond with valid JSON only (no prose before or after the JSON).
- Do not invent statistics without clearly labeling them as estimates.
- Be specific and practical, not generic.
- For government schemes and funding, only mention real programs that are known to exist.
- Mark all financial estimates clearly as "AI-estimated".`;

// -------------------------------------------------------
// Problem & Solution Analysis
// -------------------------------------------------------
export function buildProblemSolutionPrompt(idea) {
  return `${SYSTEM_CONTEXT}

Analyze the following startup idea and provide a structured problem-solution analysis.

STARTUP DETAILS:
- Name: ${idea.startupName}
- Idea: ${idea.idea}
- Industry: ${idea.industry}
- Target Location: ${idea.targetLocation}
- Target Customer: ${idea.targetCustomer}
- Stage: ${idea.stage}

Respond with ONLY this JSON structure:
{
  "problem": {
    "mainProblem": "concise statement of core problem",
    "whoExperiences": "who faces this problem",
    "whyItMatters": "why this problem is significant",
    "problemScale": "estimated scale/impact of the problem",
    "currentAlternatives": ["existing solutions or workarounds"],
    "gapInMarket": "what gap exists"
  },
  "solution": {
    "proposedSolution": "clear description of the solution",
    "howItSolves": "how it addresses the problem",
    "keyFeatures": ["feature 1", "feature 2", "feature 3"],
    "technologyApproach": "technology or methodology used",
    "innovationFactor": "what makes this approach innovative"
  },
  "usp": {
    "uniqueSellingPropositions": ["USP 1", "USP 2", "USP 3"],
    "differentiationFactors": ["how this differs from competitors"],
    "valueProposition": "core value proposition statement",
    "competitiveAdvantage": "sustainable competitive advantage"
  }
}`;
}

// -------------------------------------------------------
// Customer Analysis
// -------------------------------------------------------
export function buildCustomerPrompt(idea, problemSolution = null) {
  const context = problemSolution
    ? `\nPREVIOUS ANALYSIS:\n- Problem: ${problemSolution.problem?.mainProblem}\n- Proposed Solution: ${problemSolution.solution?.proposedSolution}\n- USP: ${problemSolution.usp?.valueProposition}\n`
    : '';

  return `${SYSTEM_CONTEXT}

Analyze target customers for this startup idea.
${context}
STARTUP DETAILS:
- Name: ${idea.startupName}
- Idea: ${idea.idea}
- Industry: ${idea.industry}
- Target Location: ${idea.targetLocation}
- Target Customer: ${idea.targetCustomer}

Respond with ONLY this JSON structure:
{
  "primaryCustomers": {
    "segment": "primary customer segment name",
    "demographics": "age, income, education, location",
    "psychographics": "values, interests, lifestyle",
    "behaviors": "purchasing behavior, technology usage",
    "painPoints": ["pain point 1", "pain point 2", "pain point 3"],
    "willingness_to_pay": "estimated willingness to pay",
    "size": "estimated segment size (labeled as estimate)"
  },
  "secondaryCustomers": {
    "segment": "secondary customer segment name",
    "demographics": "demographics description",
    "painPoints": ["pain point 1", "pain point 2"],
    "opportunity": "why they are a secondary target"
  },
  "customerPersonas": [
    {
      "name": "Persona name",
      "age": "age range",
      "occupation": "job/role",
      "goals": ["goal 1", "goal 2"],
      "frustrations": ["frustration 1", "frustration 2"],
      "howProductHelps": "how this startup helps them"
    }
  ],
  "customerJourney": {
    "awareness": "how customers discover the product",
    "consideration": "how they evaluate it",
    "decision": "what drives purchase decision",
    "retention": "what keeps them coming back",
    "advocacy": "what makes them recommend it"
  }
}`;
}

// -------------------------------------------------------
// Market Research
// -------------------------------------------------------
export function buildMarketResearchPrompt(idea, ragContext = '') {
  return `${SYSTEM_CONTEXT}

Conduct market research for this startup idea. Use the research context below.

${ragContext ? `MARKET CONTEXT (from live research and knowledge base):\n${ragContext}\n` : ''}

STARTUP DETAILS:
- Name: ${idea.startupName}
- Idea: ${idea.idea}
- Industry: ${idea.industry}
- Target Location: ${idea.targetLocation}

IMPORTANT: For market size (TAM, SAM, SOM), do not invent arbitrary numbers. If estimated, clearly specify:
- Value
- Source
- Assumptions
- Calculation formula

Respond with ONLY this JSON structure:
{
  "marketOverview": "comprehensive overview of the industry and market in target geography",
  "marketOpportunity": "specific commercial opportunity for this startup",
  "keyTrends": [
    {"trend": "trend name", "description": "impact on startup", "relevance": "high/medium/low"}
  ],
  "marketSize": {
    "tam": {
      "value": "Total Addressable Market value with currency",
      "source": "official report or empirical benchmark source",
      "assumption": "explicit assumption used in sizing",
      "calculation": "TAM = Population × Annual Value formula"
    },
    "sam": {
      "value": "Serviceable Addressable Market value with currency",
      "source": "regional market data or sector benchmark",
      "assumption": "serviceable target segment criteria",
      "calculation": "SAM = Target Segment × Annual Value formula"
    },
    "som": {
      "value": "Serviceable Obtainable Market value (first 3 years)",
      "source": "startup 3-year adoption forecast",
      "assumption": "obtainable market share assumptions",
      "calculation": "SOM = Obtainable Users × Projected ARPU formula"
    },
    "note": "Empirical estimates calculated from industry benchmarks and market research."
  },
  "marketGrowthRate": "estimated CAGR (e.g. 24.5% CAGR 2024-2029)",
  "keyDrivers": ["driver 1", "driver 2", "driver 3"],
  "keyBarriers": ["barrier 1", "barrier 2", "barrier 3"],
  "regulatoryEnvironment": "relevant regulations or policies in target geography"
}`;
}

// -------------------------------------------------------
// Competitor Analysis
// -------------------------------------------------------
export function buildCompetitorPrompt(idea, ragContext = '') {
  return `${SYSTEM_CONTEXT}

Analyze competitors for this startup idea. Use the research context below to identify REAL companies.

${ragContext ? `RESEARCH CONTEXT (live web research + knowledge base):\n${ragContext}\n` : ''}

STARTUP DETAILS:
- Name: ${idea.startupName}
- Idea: ${idea.idea}
- Industry: ${idea.industry}
- Location: ${idea.targetLocation}

IMPORTANT: Only include companies that appear in the research context above or that you are very confident exist. Do not fabricate company names.

Respond with ONLY this JSON structure:
{
  "directCompetitors": [
    {
      "name": "competitor name",
      "website": "website URL",
      "productService": "product or service description",
      "targetCustomers": "target customer segment",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "pricing": "pricing model if publicly available",
      "differentiationOpportunity": "how this startup can differentiate",
      "source": "official website or intelligence source"
    }
  ],
  "indirectCompetitors": [
    {
      "name": "competitor or substitute",
      "description": "how they indirectly compete",
      "threat_level": "high/medium/low"
    }
  ],
  "competitiveAnalysis": {
    "ourAdvantages": ["advantage over competitors"],
    "ourDisadvantages": ["areas where we are weaker"],
    "differentiationOpportunities": ["opportunities to stand out"],
    "competitivePositioning": "recommended positioning statement"
  },
  "competitorMatrix": {
    "dimensions": ["Price", "Quality", "Innovation", "Customer Service", "Scalability"],
    "ourScore": [7, 8, 9, 7, 8],
    "avgCompetitorScore": [6, 7, 6, 6, 7],
    "note": "Scores are AI-estimated on a scale of 1-10"
  }
}`;
}

// -------------------------------------------------------
// Business Model Canvas
// -------------------------------------------------------
export function buildBMCPrompt(idea, problemSolution) {
  const context = problemSolution
    ? `\nPREVIOUS ANALYSIS:\n- Problem: ${problemSolution.problem?.mainProblem}\n- Solution: ${problemSolution.solution?.proposedSolution}\n- USP: ${problemSolution.usp?.valueProposition}\n`
    : '';

  return `${SYSTEM_CONTEXT}

Generate a complete Business Model Canvas for this startup.
${context}
STARTUP DETAILS:
- Name: ${idea.startupName}
- Idea: ${idea.idea}
- Industry: ${idea.industry}
- Target Customer: ${idea.targetCustomer}
- Budget: ${idea.initialBudget}

Respond with ONLY this JSON structure:
{
  "keyPartners": {
    "title": "Key Partners",
    "items": ["partner/supplier 1", "partner 2", "strategic alliance 3"],
    "description": "who we need to work with"
  },
  "keyActivities": {
    "title": "Key Activities",
    "items": ["activity 1", "activity 2", "activity 3"],
    "description": "what we must do to deliver value"
  },
  "keyResources": {
    "title": "Key Resources",
    "items": ["resource 1", "resource 2", "resource 3"],
    "description": "what assets we need"
  },
  "valuePropositions": {
    "title": "Value Propositions",
    "items": ["value 1", "value 2", "value 3"],
    "description": "what value we deliver to customers"
  },
  "customerRelationships": {
    "title": "Customer Relationships",
    "items": ["relationship type 1", "type 2"],
    "description": "how we interact with customers"
  },
  "channels": {
    "title": "Channels",
    "items": ["channel 1", "channel 2", "channel 3"],
    "description": "how we reach customers"
  },
  "customerSegments": {
    "title": "Customer Segments",
    "items": ["segment 1", "segment 2"],
    "description": "who we are creating value for"
  },
  "costStructure": {
    "title": "Cost Structure",
    "items": ["major cost 1", "cost 2", "cost 3"],
    "description": "most important costs"
  },
  "revenueStreams": {
    "title": "Revenue Streams",
    "items": ["revenue stream 1", "stream 2"],
    "description": "how we earn from each segment"
  }
}`;
}

// -------------------------------------------------------
// Revenue Model
// -------------------------------------------------------
export function buildRevenueModelPrompt(idea) {
  return `${SYSTEM_CONTEXT}

Generate a detailed revenue model analysis for this startup.

STARTUP DETAILS:
- Name: ${idea.startupName}
- Idea: ${idea.idea}
- Industry: ${idea.industry}
- Target Customer: ${idea.targetCustomer}
- Initial Budget: ${idea.initialBudget}

Respond with ONLY this JSON structure:
{
  "recommendedModels": [
    {
      "model": "revenue model name (e.g. SaaS Subscription, Marketplace, Freemium)",
      "description": "how this model works for this startup",
      "suitability": "why it fits",
      "implementation": "how to implement",
      "pros": ["pro 1", "pro 2"],
      "cons": ["con 1", "con 2"],
      "priority": "primary/secondary/tertiary"
    }
  ],
  "pricingStrategy": {
    "approach": "pricing approach name",
    "rationale": "why this pricing makes sense",
    "tiers": [
      {"name": "tier name", "price": "price range (AI-estimated)", "features": ["feature 1"]}
    ],
    "note": "Prices are AI-estimated. Validate with market research."
  },
  "revenueProjections": {
    "year1": "rough estimate (AI-estimated)",
    "year2": "rough estimate (AI-estimated)",
    "year3": "rough estimate (AI-estimated)",
    "assumptions": ["assumption 1", "assumption 2"],
    "disclaimer": "These are AI-generated estimates only. Actual results will vary."
  },
  "unitEconomics": {
    "estimatedCAC": "Customer Acquisition Cost estimate (AI-estimated)",
    "estimatedLTV": "Customer Lifetime Value estimate (AI-estimated)",
    "breakEvenEstimate": "rough break-even timeline (AI-estimated)"
  }
}`;
}

// -------------------------------------------------------
// Budget Estimation
// -------------------------------------------------------
export function buildBudgetPrompt(idea) {
  return `${SYSTEM_CONTEXT}

Generate a startup budget estimation based on the provided details.

STARTUP DETAILS:
- Name: ${idea.startupName}
- Idea: ${idea.idea}
- Industry: ${idea.industry}
- Location: ${idea.targetLocation}
- Initial Budget: ${idea.initialBudget}
- Team Size: ${idea.teamSize}
- Stage: ${idea.stage}

IMPORTANT: All figures must be clearly marked as AI-estimated.

Respond with ONLY this JSON structure:
{
  "totalEstimatedBudget": "total budget range (AI-estimated)",
  "currency": "INR or USD based on location",
  "breakdown": [
    {
      "category": "Product Development",
      "percentage": 25,
      "estimatedAmount": "amount range (AI-estimated)",
      "items": ["item 1", "item 2"],
      "priority": "high/medium/low"
    },
    {
      "category": "Technology & Infrastructure",
      "percentage": 15,
      "estimatedAmount": "amount range (AI-estimated)",
      "items": ["hosting", "software licenses", "tools"],
      "priority": "high"
    },
    {
      "category": "Marketing & Sales",
      "percentage": 20,
      "estimatedAmount": "amount range (AI-estimated)",
      "items": ["digital marketing", "content creation", "events"],
      "priority": "high"
    },
    {
      "category": "Operations",
      "percentage": 15,
      "estimatedAmount": "amount range (AI-estimated)",
      "items": ["office/workspace", "utilities", "logistics"],
      "priority": "medium"
    },
    {
      "category": "Human Resources",
      "percentage": 15,
      "estimatedAmount": "amount range (AI-estimated)",
      "items": ["salaries", "recruitment", "training"],
      "priority": "high"
    },
    {
      "category": "Legal & Compliance",
      "percentage": 5,
      "estimatedAmount": "amount range (AI-estimated)",
      "items": ["registration", "IP protection", "contracts"],
      "priority": "medium"
    },
    {
      "category": "Miscellaneous / Contingency",
      "percentage": 5,
      "estimatedAmount": "amount range (AI-estimated)",
      "items": ["unexpected expenses", "buffer"],
      "priority": "low"
    }
  ],
  "burnRate": "estimated monthly burn rate (AI-estimated)",
  "runway": "estimated runway in months based on budget",
  "disclaimer": "All figures are AI-generated estimates. Actual costs depend on location, vendors, and specific requirements. Consult a financial advisor."
}`;
}

// -------------------------------------------------------
// Go-To-Market Strategy
// -------------------------------------------------------
export function buildGTMPrompt(idea, customers) {
  const customerContext = customers
    ? `\nCUSTOMERS: Primary segment is ${customers.primaryCustomers?.segment}, found via ${customers.customerJourney?.awareness}\n`
    : '';

  return `${SYSTEM_CONTEXT}

Generate a Go-To-Market strategy for this startup.
${customerContext}
STARTUP DETAILS:
- Name: ${idea.startupName}
- Idea: ${idea.idea}
- Industry: ${idea.industry}
- Location: ${idea.targetLocation}
- Target Customer: ${idea.targetCustomer}
- Budget: ${idea.initialBudget}
- Stage: ${idea.stage}

Respond with ONLY this JSON structure:
{
  "gtmOverview": "overall GTM approach",
  "launchStrategy": {
    "approach": "launch strategy name",
    "description": "detailed launch plan",
    "keyMilestones": ["milestone 1", "milestone 2", "milestone 3"]
  },
  "customerAcquisition": {
    "primaryChannels": ["channel 1", "channel 2"],
    "acquisitionStrategies": ["strategy 1", "strategy 2", "strategy 3"],
    "retentionStrategies": ["retention 1", "retention 2"]
  },
  "marketingChannels": [
    {"channel": "channel name", "description": "how to use it", "priority": "high/medium/low", "estimatedCost": "cost range"}
  ],
  "pricingApproach": {
    "strategy": "pricing strategy",
    "rationale": "why this pricing works at launch",
    "introductoryOffer": "any launch pricing or offers"
  },
  "geographicStrategy": {
    "phase1": "initial geography/market",
    "phase2": "next geography/expansion",
    "phase3": "long-term geographic goal",
    "rationale": "why this geographic progression"
  },
  "actionPlan": {
    "days1to30": {
      "theme": "theme for first 30 days",
      "actions": ["action 1", "action 2", "action 3", "action 4"]
    },
    "days31to60": {
      "theme": "theme for days 31-60",
      "actions": ["action 1", "action 2", "action 3"]
    },
    "days61to90": {
      "theme": "theme for days 61-90",
      "actions": ["action 1", "action 2", "action 3"]
    }
  },
  "successMetrics": ["metric 1", "metric 2", "metric 3", "metric 4"]
}`;
}

// -------------------------------------------------------
// Government Schemes (RAG-enhanced)
// -------------------------------------------------------
export function buildGovernmentSchemesPrompt(idea, ragContext) {
  return `${SYSTEM_CONTEXT}

Identify relevant government schemes and programs for this startup.
ONLY recommend schemes that are mentioned in the context below or that you are highly confident exist.
DO NOT invent schemes.

KNOWLEDGE BASE CONTEXT:
${ragContext || 'No specific context retrieved. Use well-known schemes only.'}

STARTUP DETAILS:
- Idea: ${idea.idea}
- Industry: ${idea.industry}
- Location: ${idea.targetLocation}
- Stage: ${idea.stage}
- Team Size: ${idea.teamSize}

Respond with ONLY this JSON structure:
{
  "schemes": [
    {
      "name": "scheme name",
      "organisation": "ministry or organisation",
      "description": "what the scheme offers",
      "eligibility": "who can apply",
      "benefits": ["benefit 1", "benefit 2"],
      "relevantStage": "ideation/validation/mvp/growth",
      "applicationProcess": "how to apply",
      "deadline": "deadline or ongoing",
      "officialSource": "official government portal URL",
      "retrievedDate": "verified date",
      "confidence": "high/medium"
    }
  ],
  "disclaimer": "Scheme details are subject to change. Always verify eligibility and terms on the official government portal before applying."
}`;
}

// -------------------------------------------------------
// Funding Opportunities (RAG-enhanced)
// -------------------------------------------------------
export function buildFundingPrompt(idea, ragContext) {
  return `${SYSTEM_CONTEXT}

Identify relevant funding opportunities for this startup.
ONLY mention funding sources that exist. DO NOT fabricate investors or amounts.

KNOWLEDGE BASE CONTEXT:
${ragContext || 'No specific context retrieved. Use well-known funding sources only.'}

STARTUP DETAILS:
- Idea: ${idea.idea}
- Industry: ${idea.industry}
- Location: ${idea.targetLocation}
- Stage: ${idea.stage}
- Initial Budget: ${idea.initialBudget}
- Team Size: ${idea.teamSize}

Respond with ONLY this JSON structure:
{
  "fundingOpportunities": [
    {
      "name": "funding source or investor name",
      "organization": "organization providing capital",
      "fundingType": "grant/government/incubator/accelerator/angel/vc/msme",
      "description": "what they offer",
      "eligibility": "who qualifies",
      "fundingAmount": "typical amount (only if verified)",
      "deadline": "deadline or ongoing",
      "officialSource": "official URL or portal",
      "stage": "pre-seed/seed/series-a/any",
      "confidence": "high/medium"
    }
  ],
  "fundingRoadmap": {
    "immediate": "funding to pursue right now given current stage",
    "shortTerm": "funding to target in 3-6 months",
    "longTerm": "funding to pursue at growth stage"
  },
  "disclaimer": "Funding availability and amounts change frequently. Verify all details directly with funding providers before applying."
}`;
}

// -------------------------------------------------------
// Legal Requirements
// -------------------------------------------------------
export function buildLegalPrompt(idea, ragContext) {
  return `${SYSTEM_CONTEXT}

Provide general legal and compliance considerations for this startup.

KNOWLEDGE BASE CONTEXT:
${ragContext || 'Provide general startup legal considerations.'}

STARTUP DETAILS:
- Idea: ${idea.idea}
- Industry: ${idea.industry}
- Location: ${idea.targetLocation}
- Team Size: ${idea.teamSize}
- Stage: ${idea.stage}

Respond with ONLY this JSON structure:
{
  "businessRegistration": {
    "recommendedStructure": "recommended legal structure (e.g. Private Limited, LLP, Sole Proprietorship)",
    "rationale": "why this structure suits this startup",
    "registrationSteps": ["step 1", "step 2", "step 3"],
    "estimatedCost": "rough cost range (AI-estimated)",
    "authority": "relevant government authority"
  },
  "complianceRequirements": [
    {
      "area": "compliance area (e.g. GST, Income Tax, Labour Laws)",
      "requirement": "what is required",
      "applicability": "when it applies",
      "authority": "regulatory body"
    }
  ],
  "intellectualProperty": {
    "recommendations": ["IP protection recommendation 1", "recommendation 2"],
    "trademarkInfo": "trademark registration guidance",
    "patentInfo": "patent considerations if applicable",
    "copyrightInfo": "copyright considerations"
  },
  "industrySpecificLicenses": [
    {
      "license": "license name",
      "requirement": "when it is needed",
      "authority": "issuing authority"
    }
  ],
  "dataProtection": "data protection and privacy compliance (e.g. IT Act, DPDP Act)",
  "employmentLaws": "key employment law considerations",
  "disclaimer": "This is general information only and does not constitute legal advice. Consult a qualified lawyer before making any legal decisions."
}`;
}

// -------------------------------------------------------
// Executive Summary (final compilation)
// -------------------------------------------------------
export function buildExecutiveSummaryPrompt(idea, allSections) {
  const summaryContext = `
Problem: ${allSections.problem?.problem?.mainProblem || 'N/A'}
Solution: ${allSections.problem?.solution?.proposedSolution || 'N/A'}
USP: ${allSections.problem?.usp?.valueProposition || 'N/A'}
Market: ${allSections.market?.marketOverview || 'N/A'}
Revenue: ${allSections.revenue?.recommendedModels?.[0]?.model || 'N/A'}
  `.trim();

  return `${SYSTEM_CONTEXT}

Write an executive summary for this startup blueprint.

STARTUP: ${idea.startupName}
IDEA: ${idea.idea}
INDUSTRY: ${idea.industry}
TARGET LOCATION: ${idea.targetLocation}
TARGET CUSTOMER: ${idea.targetCustomer}
BUDGET: ${idea.initialBudget}
STAGE: ${idea.stage}
TEAM SIZE: ${idea.teamSize}

KEY ANALYSIS FINDINGS:
${summaryContext}

Respond with ONLY this JSON structure:
{
  "executiveSummary": "A professional 3-4 paragraph executive summary suitable for investors and evaluators",
  "elevatorPitch": "A compelling 2-sentence elevator pitch",
  "keyHighlights": [
    {"label": "highlight label", "value": "highlight value"}
  ],
  "missionStatement": "one-line mission statement",
  "visionStatement": "one-line vision statement",
  "startupStage": "${idea.stage}",
  "teamSize": "${idea.teamSize} founders/team members"
}`;
}
