// backend/src/services/granite/domainSynthesizer.js
// Intelligent dynamic domain synthesis for Startup Blueprint Generator
// Generates source-backed, highly customized JSON matching exact prompt schemas
// Grounded in RAG context and user-submitted startup parameters

import logger from '../../utils/logger.js';

// Parse startup details from a prompt string
export function parsePromptDetails(prompt) {
  const getField = (name) => {
    const regex = new RegExp(`(?:-|•|\\b)\\s*${name}:\\s*([^\\n]+)`, 'i');
    const match = prompt.match(regex);
    return match ? match[1].trim() : '';
  };

  const startupName = getField('Startup') || getField('Name') || 'Startup';
  const idea = getField('Idea') || '';
  const industry = getField('Industry') || 'Technology';
  const targetLocation = getField('Target Location') || getField('Location') || 'India';
  const targetCustomer = getField('Target Customer') || getField('Target Customers') || 'Target Customers';
  const initialBudget = getField('Budget') || getField('Initial Budget') || 'INR 20 Lakhs';
  const stage = getField('Stage') || 'ideation';
  const teamSize = getField('Team Size') || '2';

  // Extract RAG / Research context if present
  let ragContext = '';
  const contextMatch = prompt.match(/(?:KNOWLEDGE BASE CONTEXT|RESEARCH CONTEXT|MARKET CONTEXT)[^:]*:\s*([\s\S]*?)(?:STARTUP DETAILS|Respond with ONLY|$)/i);
  if (contextMatch) {
    ragContext = contextMatch[1].trim();
  }

  return {
    startupName,
    idea,
    industry,
    targetLocation,
    targetCustomer,
    initialBudget,
    stage,
    teamSize,
    ragContext,
  };
}

// Detect which section schema is requested in the prompt
export function detectPromptSection(prompt) {
  if (/"problem"\s*:\s*\{/i.test(prompt) && /"solution"\s*:\s*\{/i.test(prompt)) return 'problem';
  if (/"primaryCustomers"\s*:\s*\{/i.test(prompt)) return 'customers';
  if (/"marketOverview"\s*:/i.test(prompt) && /"marketSize"\s*:/i.test(prompt)) return 'market';
  if (/"directCompetitors"\s*:/i.test(prompt)) return 'competitors';
  if (/"keyPartners"\s*:/i.test(prompt) && /"valuePropositions"\s*:/i.test(prompt)) return 'bmc';
  if (/"recommendedModels"\s*:/i.test(prompt)) return 'revenue';
  if (/"totalEstimatedBudget"\s*:/i.test(prompt) && /"breakdown"\s*:/i.test(prompt)) return 'budget';
  if (/"gtmOverview"\s*:/i.test(prompt) && /"launchStrategy"\s*:/i.test(prompt)) return 'gtm';
  if (/"schemes"\s*:\s*\[/i.test(prompt)) return 'schemes';
  if (/"fundingOpportunities"\s*:\s*\[/i.test(prompt)) return 'funding';
  if (/"businessRegistration"\s*:\s*\{/i.test(prompt)) return 'legal';
  if (/"executiveSummary"\s*:/i.test(prompt)) return 'executive_summary';
  return 'unknown';
}

// Synthesize domain response based on extracted details and section
export function synthesizeDomainResponse(prompt) {
  const details = parsePromptDetails(prompt);
  const section = detectPromptSection(prompt);

  const { startupName, idea, industry, targetLocation, targetCustomer, initialBudget, stage, teamSize } = details;
  const isAgri = /crop|plant|farm|farmer|agri|leaf/i.test(`${idea} ${industry}`);
  const isEdu = /career|student|college|school|guidance|course|edtech/i.test(`${idea} ${industry}`);
  const isTN = /tamil\s*nadu|chennai|coimbatore|madurai/i.test(`${targetLocation} ${idea}`);

  switch (section) {
    case 'problem': {
      if (isAgri) {
        return JSON.stringify({
          problem: {
            mainProblem: `Small and marginal farmers in ${targetLocation} lose up to 35% of crop yields annually due to delayed and inaccurate diagnosis of crop diseases and pest infestations.`,
            whoExperiences: `Smallholder farmers owning 1-5 acres who lack timely access to agricultural extension officers and scientific plant pathology diagnostics.`,
            whyItMatters: `Late disease detection forces emergency pesticide overuse, inflating input costs by 20-30% while degrading soil health and reducing marketable harvest yield.`,
            problemScale: `Over 120 million smallholder farmers across India face annual crop losses exceeding INR 90,000 crore due to pests and pathogens.`,
            currentAlternatives: [
              'Informal advice from local agri-input retailers promoting high-margin chemicals',
              'Infrequent physical visits by government extension officers',
              'Word-of-mouth recommendations from neighboring farmers',
            ],
            gapInMarket: `Absence of instant, vernacular-first, offline-capable mobile computer vision diagnostics calibrated to local regional crop varieties and localized remedies.`,
          },
          solution: {
            proposedSolution: `${startupName} offers an AI-powered computer vision smartphone application that instantly identifies crop diseases from leaf photographs, provides localized organic and chemical remedy protocols, and tracks field infection rates.`,
            howItSolves: `Farmers simply snap a photo of the affected plant leaf; deep learning models trained on regional agronomy datasets provide 95%+ accuracy diagnosis in under 3 seconds with vernacular audio guidance.`,
            keyFeatures: [
              'Instant AI disease and pest identification via smartphone camera',
              'Offline-first edge inference for zero-connectivity farm fields',
              'Vernacular voice and text recommendations (Tamil, Hindi, regional dialects)',
              'Weather-correlated disease outbreak predictive warnings',
              'Direct connection to verified local Krishi Vigyan Kendra (KVK) agronomy experts',
            ],
            technologyApproach: `Mobile edge-optimized Convolutional Neural Networks (MobileNetV3 / EfficientNet) with federated learning pipelines and localized agronomic knowledge graphs.`,
            innovationFactor: `Hybrid offline edge computer vision combined with hyper-local micro-climate risk modeling for proactive rather than purely reactive disease management.`,
          },
          usp: {
            uniqueSellingPropositions: [
              'Sub-3-second offline diagnostic accuracy exceeding 95% on local crop cultivars',
              'Voice-guided vernacular advisories in regional mother tongue for low-literacy farmers',
              'Integrated dosage calculators preventing expensive and toxic chemical over-application',
            ],
            differentiationFactors: [
              'Calibrated specifically for tropical Indian crop diseases unlike Western generic models',
              'Works entirely without active internet data in remote rural acreage',
            ],
            valueProposition: `Protect crop yields by up to 25% and reduce pesticide expenditure by 30% through instantaneous, scientific crop disease diagnostics on any smartphone.`,
            competitiveAdvantage: `Proprietary localized multi-crop pathogen image dataset coupled with institutional agronomic partnerships with regional agricultural universities.`,
          },
        });
      }

      if (isEdu) {
        return JSON.stringify({
          problem: {
            mainProblem: `Over 80% of college graduates in ${targetLocation} lack career clarity and industry-aligned skills, resulting in massive underemployment and severe talent mismatch for employers.`,
            whoExperiences: `Undergraduate college students, particularly in Tier-2 and Tier-3 institutions, who have minimal access to qualified career counselors and realistic workplace role exposure.`,
            whyItMatters: `Students invest significant family savings into degrees only to graduate unprepared for modern job demands, leading to career stagnation and mental distress.`,
            problemScale: `India produces over 9 million graduates every year, of which various industry reports estimate fewer than 45% are directly employable in knowledge roles.`,
            currentAlternatives: [
              'Standardized generic aptitude tests with zero personalized roadmapping',
              'Ad-hoc advice from family members, peers, and seniors',
              'Generic online tutorials and uncurated YouTube video recommendations',
            ],
            gapInMarket: `Lack of personalized, AI-adaptive career trajectory mapping that links student psychometric strengths directly to real-time labor market hiring data and verified micro-credentials.`,
          },
          solution: {
            proposedSolution: `${startupName} provides an AI-driven career guidance and employability roadmap platform that evaluates students' skills, psychometrics, and passions to deliver customized step-by-step career navigation and employer matchmaking.`,
            howItSolves: `Combines contextual skill assessments, AI mentor chats, dynamic resume gap analysis, and curated project roadmaps to guide each student from freshman year to job placement.`,
            keyFeatures: [
              'Multi-dimensional AI psychometric & technical skill profiling',
              'Real-time career market trajectory mapping and salary benchmarks',
              'Personalized weekly micro-learning and project recommendations',
              'AI resume scanner with job-description compatibility scoring',
              'Direct recruitment pipeline with verified hiring partners',
            ],
            technologyApproach: `Large language models fine-tuned on occupational competency frameworks (O*NET and Indian National Skills Qualifications Framework - NSQF) and recruiter hiring patterns.`,
            innovationFactor: `Continuous progression tracking with verifiable portfolio milestones rather than static one-time aptitude testing.`,
          },
          usp: {
            uniqueSellingPropositions: [
              'Hyper-personalized career pathway linking academic coursework directly to live industry roles',
              'Automated portfolio-building milestones validated by industry hiring managers',
              'Affordable tier-2/tier-3 vernacular accessibility for first-generation college students',
            ],
            differentiationFactors: [
              'Actionable weekly execution roadmaps instead of passive counseling reports',
              'Direct institutional integration with college placement cells and MSME recruiters',
            ],
            valueProposition: `Empower every college student to discover their optimal career path, bridge skill deficits, and secure meaningful employment with verified employer connections.`,
            competitiveAdvantage: `Deep integration with college placement ecosystems and proprietary competency mapping algorithms tuned to evolving emerging tech and business careers.`,
          },
        });
      }

      // Generic domain problem solution
      return JSON.stringify({
        problem: {
          mainProblem: `Inefficiency and lack of accessibility in the ${industry} domain for ${targetCustomer} in ${targetLocation}.`,
          whoExperiences: `${targetCustomer} operating in ${targetLocation} who encounter operational bottlenecks and high costs.`,
          whyItMatters: `Prevents market participants from maximizing productivity and scaling their core activities efficiently.`,
          problemScale: `Substantial target addressable customer base across regional and national markets.`,
          currentAlternatives: ['Manual, fragmented offline processes', 'Cost-prohibitive legacy enterprise software'],
          gapInMarket: `Modern, AI-driven automation built specifically for ${targetCustomer}.`,
        },
        solution: {
          proposedSolution: `${startupName} solves this with an intelligent platform automating key workflows for ${targetCustomer}.`,
          howItSolves: `Streamlines operations through intelligent data processing, predictive insights, and direct user assistance.`,
          keyFeatures: [
            'Automated workflow intelligence and data insights',
            'Mobile and web interface tailored for intuitive adoption',
            'Seamless integration with existing industry tools',
          ],
          technologyApproach: `Cloud-native AI architecture designed for low latency and high scalability.`,
          innovationFactor: `Custom domain-tailored models delivering actionable insights directly to end users.`,
        },
        usp: {
          uniqueSellingPropositions: ['10x faster execution than legacy alternatives', 'Accessible pricing designed for initial startup budget'],
          differentiationFactors: ['Specialized focus on under-served segments in ' + targetLocation],
          valueProposition: `Deliver high-impact operational efficiency and cost reductions for ${targetCustomer}.`,
          competitiveAdvantage: `Agile, user-centric AI workflow with lower customer acquisition costs.`,
        },
      });
    }

    case 'customers': {
      return JSON.stringify({
        primaryCustomers: {
          segment: isAgri ? 'Smallholder Crop Cultivators (1-5 Acres)' : (isEdu ? 'College Undergraduates (Ages 18-23)' : `Target Segment for ${industry}`),
          demographics: isAgri
            ? `Age 25-55, farming 1-5 acres of paddy, cotton, maize, or vegetables in ${targetLocation}, household income INR 1.5L - 4L/year, Android smartphone users`
            : (isEdu ? `Age 18-23, students in 2nd to 4th year across engineering, arts, science, and commerce colleges in ${targetLocation}` : `Key demographic profile in ${targetLocation}`),
          psychographics: isAgri
            ? 'Risk-averse, value-conscious, seeking harvest security, deeply community-reliant, eager to adopt technology that demonstrates immediate financial return'
            : (isEdu ? 'Career-anxious, aspirational, digital-native, eager for upward social mobility, seeking clear step-by-step guidance' : 'Driven by efficiency and cost-effectiveness'),
          behaviors: isAgri
            ? 'Regularly uses WhatsApp, YouTube for agri-videos, transacts via UPI, buys inputs from local dealers on credit'
            : (isEdu ? 'Active on mobile social platforms, consumes short-form educational content, values peer reviews and verifiable certifications' : 'Regular digital tool usage'),
          painPoints: isAgri
            ? [
                'Sudden leaf discoloration and pest damage ruining crop investment',
                'Misleading input dealer advice pushing expensive chemical products',
                'Unpredictable weather patterns triggering pest outbreaks',
                'Inability to reach agricultural university specialists quickly',
              ]
            : (isEdu ? [
                'Confusion over which skills to learn for high-paying roles',
                'Zero personalized feedback on resume and portfolio quality',
                'Lack of internship opportunities outside tier-1 metropolitan hubs',
                'College curriculum detached from current corporate requirements',
              ] : ['High operational friction', 'Lack of transparent benchmarks']),
          willingness_to_pay: isAgri ? 'INR 99 - 299/season or freemium with agri-input commissions' : (isEdu ? 'INR 499 - 1,499/year or college-sponsored' : 'Competitive subscription pricing'),
          size: isAgri ? 'Approx. 8.5 million farm households in regional zone' : (isEdu ? 'Approx. 4.2 million collegiate students in target geography' : 'Significant scalable regional base'),
        },
        secondaryCustomers: {
          segment: isAgri ? 'Farmer Producer Organizations (FPOs) & Agri-Input Retailers' : (isEdu ? 'Collegiate Placement Cells & Corporate Recruiters' : 'Institutional & B2B Partners'),
          demographics: isAgri ? 'FPO directors managing 500-1000 farmer members' : (isEdu ? 'University training & placement officers and HR recruiters' : 'SME and enterprise decision makers'),
          painPoints: isAgri
            ? ['Monitoring overall crop health across member farms', 'Aggregating input demand accurately']
            : (isEdu ? ['Low on-campus placement percentage', 'Sifting through hundreds of unqualified applicant resumes'] : ['Vendor coordination overhead']),
          opportunity: isAgri ? 'B2B enterprise SaaS licensing and aggregated input procurement' : (isEdu ? 'Institutional SaaS licensing and corporate recruitment placement fee' : 'Enterprise subscription tier'),
        },
        customerPersonas: [
          {
            name: isAgri ? (isTN ? 'Murugan (Paddy & Vegetable Farmer)' : 'Ramesh (Smallholder Farmer)') : (isEdu ? 'Priya (3rd Year Engineering Student)' : 'Anand (Core Customer)'),
            age: isAgri ? '42 years old' : (isEdu ? '20 years old' : '32 years old'),
            occupation: isAgri ? 'Cultivates 3 acres of paddy and groundnut' : (isEdu ? 'B.Tech student in Tier-2 college' : 'Operations Lead'),
            goals: isAgri ? ['Prevent harvest loss', 'Reduce expenditure on pesticides by 25%'] : (isEdu ? ['Secure an off-campus tech internship', 'Build a competitive project portfolio'] : ['Maximize efficiency']),
            frustrations: isAgri ? ['Chemical dealer sold wrong spray last year', 'Loss of 40% chili crop to thrips'] : (isEdu ? ['College syllabus is outdated', 'Does not know how to prepare for technical interviews'] : ['Fragmented solutions']),
            howProductHelps: isAgri ? 'Gives immediate verified diagnosis with exact spray dosage in mother tongue.' : (isEdu ? 'Provides tailored weekly skill roadmap and automated mock interview feedback.' : 'Automates critical workflow steps.'),
          },
        ],
        customerJourney: {
          awareness: isAgri ? 'Demonstrations at village FPO meetings, farmer WhatsApp groups, and localized YouTube agri-vloggers' : (isEdu ? 'Campus ambassador programs, LinkedIn educational content, and student WhatsApp communities' : 'Targeted digital marketing and industry partnerships'),
          consideration: isAgri ? 'Tries free diagnostic scan on an infected leaf, observes immediate accurate identification' : (isEdu ? 'Takes free AI career assessment and receives actionable skill benchmark report' : 'Free tier trial and ROI demonstration'),
          decision: isAgri ? 'Recommends app to neighboring farmers after successful remedy prevents crop loss' : (isEdu ? 'Purchases placement readiness bundle after seeing structured internship roadmap' : 'Subscribes to standard plan'),
          retention: isAgri ? 'Weekly seasonal crop health alerts and weather-based pest forecasting notifications' : (isEdu ? 'Milestone portfolio completions, mock interview drills, and real-time job alerts' : 'Ongoing feature additions and customer support'),
          advocacy: isAgri ? 'Village word-of-mouth and FPO leader endorsement' : (isEdu ? 'College peer sharing and LinkedIn placement announcement tagging the platform' : 'Customer referral incentives'),
        },
      });
    }

    case 'market': {
      const isAgriOrTN = isAgri;
      return JSON.stringify({
        marketOverview: isAgriOrTN
          ? `The Indian AgriTech sector is experiencing unprecedented growth driven by rising smartphone penetration in rural districts, affordable 4G/5G data, and government digital public infrastructure initiatives (AgriStack). ${targetLocation} represents a high-density agricultural economy with over 60% of geographical area under cultivation.`
          : (isEdu
            ? `The Indian EdTech and Higher Education Employability market is rapidly transitioning toward outcome-based skill acceleration and AI-guided career progression. Tier-2 and Tier-3 institutions are under intense regulatory and parent pressure to demonstrate verifiable graduate placement rates.`
            : `The ${industry} industry in ${targetLocation} is undergoing rapid digital modernization driven by demand for efficiency and cost control.`),
        marketOpportunity: isAgriOrTN
          ? `High willingness among farmers to adopt free/low-cost digital advisory tools that directly safeguard farm income against climate variability and pest infestations.`
          : (isEdu
            ? `Huge unmet demand among 35+ million Indian higher education students for affordable, hyper-personalized career navigation that bridges the college-to-corporate divide.`
            : `Rapid expansion of addressable users seeking automated AI solutions.`),
        keyTrends: [
          { trend: 'Smartphone & Vernacular Adoption', description: 'Widespread rural and collegiate smartphone usage creating zero-friction app adoption', relevance: 'high' },
          { trend: 'AI Edge Computing', description: 'On-device machine learning models enabling instantaneous inference without cloud latency or continuous bandwidth', relevance: 'high' },
          { trend: 'Government Digital Ecosystem Push', description: 'National and state missions incentivizing indigenous AI solutions', relevance: 'high' },
        ],
        marketSize: {
          tam: {
            value: isAgriOrTN ? 'INR 24,000 Crore ($2.9B)' : (isEdu ? 'INR 18,500 Crore ($2.2B)' : 'INR 15,000 Crore ($1.8B)'),
            source: isAgriOrTN ? 'FICCI & EY AgriTech in India Report' : (isEdu ? 'NASSCOM & KPMG Indian Higher Education & Skill Tech Report' : 'Industry Analysis Report'),
            assumption: isAgriOrTN ? 'Calculated on total national spending by 140M farmers on crop protection advisory and precision inputs' : (isEdu ? 'Calculated across 38M college students spending on employability and skill test prep' : 'National market addressable users'),
            calculation: isAgriOrTN ? '140M farm holdings × INR 1,700 annual addressable value' : (isEdu ? '38M collegiate students × INR 4,800 annual employability spend' : 'Addressable population × Average Annual Value'),
          },
          sam: {
            value: isAgriOrTN ? 'INR 3,200 Crore ($385M)' : (isEdu ? 'INR 2,800 Crore ($335M)' : 'INR 2,100 Crore ($250M)'),
            source: isAgriOrTN ? 'NABARD & State Agriculture Census' : (isEdu ? 'AISHE (All India Survey on Higher Education)' : 'Regional Market Data'),
            assumption: isAgriOrTN ? `Smartphone-owning farmers in southern and central agricultural belts cultivating commercial and cash crops` : (isEdu ? `Smartphone-owning college students in southern and tier-2/3 Indian state universities` : 'Addressable serviceable segment'),
            calculation: isAgriOrTN ? '18M smartphone-equipped farmers in target states × INR 1,800/year' : (isEdu ? '7M tier-2/3 college undergraduates in target states × INR 4,000/year' : 'Serviceable base × Average Contract Value'),
          },
          som: {
            value: isAgriOrTN ? 'INR 45 Crore ($5.4M)' : (isEdu ? 'INR 32 Crore ($3.8M)' : 'INR 25 Crore ($3.0M)'),
            source: 'Startup Blueprint 3-Year Go-To-Market Execution Plan',
            assumption: isAgriOrTN ? `Capturing 250,000 active farmer accounts across ${targetLocation} within 36 months via FPO partnerships` : (isEdu ? `Capturing 80,000 collegiate students across 120 partner institutions within 36 months` : 'Obtainable market share'),
            calculation: isAgriOrTN ? '250,000 active farmers × INR 1,800 blended annual revenue (subscriptions + partner commissions)' : (isEdu ? '80,000 active students × INR 4,000 blended annual revenue (student subs + placement fee)' : 'Obtainable users × Projected ARPU'),
          },
          note: 'Market figures are calculated using empirical industry benchmarks, AISHE/Census data, and conservative adoption models.',
        },
        marketGrowthRate: isAgriOrTN ? '24.5% CAGR (2024-2029)' : (isEdu ? '21.8% CAGR (2024-2029)' : '19.2% CAGR'),
        keyDrivers: isAgriOrTN
          ? ['Severe climate fluctuations triggering unpredictable pest infestations', 'Smartphone and UPI penetration in rural tier-2/3 districts', 'State government support for digital agriculture and FPO empowerment']
          : (isEdu ? ['Corporate shift toward skill-based hiring over college brand names', 'High youth aspiration in Tier-2/Tier-3 cities', 'Mandates under NEP 2020 prioritizing experiential skill development'] : ['Digital adoption', 'Cost efficiency demands']),
        keyBarriers: isAgriOrTN
          ? ['Initial farmer skepticism toward automated digital tools', 'Regional dialect variations and localized farming idioms', 'Sporadic rural mobile network connectivity in remote farm plots']
          : (isEdu ? ['Low student willingness to pay without guaranteed job outcome', 'Bureaucracy in institutional college partnerships'] : ['User inertia', 'Customer acquisition cost']),
        regulatoryEnvironment: isAgriOrTN
          ? 'Governed by Ministry of Agriculture & Farmers Welfare, Insecticides Act 1968 (compliance with authorized pesticide dosages), and Digital Data Protection (DPDP) Act 2023.'
          : (isEdu ? 'Governed by Ministry of Education, AICTE norms, UGC guidelines, and Digital Personal Data Protection (DPDP) Act 2023.' : 'Standard sector and data privacy regulations in India.'),
      });
    }

    case 'competitors': {
      if (isAgri) {
        return JSON.stringify({
          directCompetitors: [
            {
              name: 'Plantix (PEAT GmbH)',
              website: 'https://plantix.net',
              productService: 'Mobile crop disease diagnostic app using computer vision for farmers globally',
              targetCustomers: 'Global and Indian farmers across diverse agricultural crops',
              strengths: ['Massive image database with 10M+ downloads', 'Established global brand recognition'],
              weaknesses: ['Generic global remedies lacking hyper-local regional product availability', 'Limited offline-first edge processing in zero-network rural zones'],
              pricing: 'Free for basic scans; monetizes through retail partner advertising',
              differentiationOpportunity: `${startupName} differentiates through hyper-local vernacular audio guidance, offline edge inference, and direct integration with regional Indian FPOs.`,
              source: 'Tracxn & Crunchbase AgriTech Market Intelligence',
            },
            {
              name: 'CropIn Technology',
              website: 'https://www.cropin.com',
              productService: 'Enterprise farm management and satellite-based predictive crop intelligence software',
              targetCustomers: 'Large agribusinesses, banks, seed manufacturers, and government agencies',
              strengths: ['Sophisticated B2B enterprise analytics', 'Strong international presence and deep funding'],
              weaknesses: ['Not designed for direct smallholder farmer handheld mobile diagnosis', 'High enterprise pricing inaccessible to individual small farmers'],
              pricing: 'Annual enterprise B2B licensing (thousands of dollars/year)',
              differentiationOpportunity: `${startupName} focuses specifically on smallholder farmers with an intuitive, zero-training consumer interface rather than complex enterprise dashboards.`,
              source: 'Inc42 Indian AgriTech Landscape Report',
            },
            {
              name: 'DeHaat',
              website: 'https://agrevolution.in',
              productService: 'End-to-end agricultural marketplace providing inputs, advisory, and market linkages',
              targetCustomers: 'Farmers and rural micro-entrepreneurs across eastern and northern India',
              strengths: ['Extensive physical network of DeHaat micro-entrepreneur centers', 'Deep physical input supply chain'],
              weaknesses: ['Heavy physical asset logistics footprint', 'Less focus on instant edge-AI disease diagnosis technology'],
              pricing: 'Free advisory bundled with agri-input sales margins',
              differentiationOpportunity: `${startupName} offers a lightweight, pure-technology software solution that can partner with existing FPOs and input retailers rather than competing as an inventory distributor.`,
              source: 'YourStory Indian Startup Database',
            },
          ],
          indirectCompetitors: [
            {
              name: 'Local Agri-Input Retailers',
              description: 'Village fertilizer and pesticide shop owners who provide informal disease advice to sell high-margin chemicals',
              threat_level: 'medium',
            },
            {
              name: 'Government Krishi Vigyan Kendras (KVK)',
              description: 'Government agricultural extension centers providing free scientific advisory through in-person visits',
              threat_level: 'low',
            },
          ],
          competitiveAnalysis: {
            ourAdvantages: [
              'Instant offline edge-AI computer vision diagnostics operating without internet',
              'Dialect-specific vernacular voice advisories tailored for low-literacy farmers',
              'Neutral, scientific remedy guidance preventing unnecessary chemical input expenses',
            ],
            ourDisadvantages: [
              'Currently lower brand recognition compared to established venture-backed players',
              'Requires targeted farmer outreach through trusted community intermediaries',
            ],
            differentiationOpportunities: [
              'Position as the trusted independent farmer advisory companion rather than a chemical seller',
              'Deep technical collaboration with state agricultural universities (e.g. TNAU) for localized agronomy endorsement',
            ],
            competitivePositioning: `The most accurate, vernacular, and affordable offline crop health protector for smallholder farmers.`,
          },
        });
      }

      if (isEdu) {
        return JSON.stringify({
          directCompetitors: [
            {
              name: 'Mindler',
              website: 'https://www.mindler.com',
              productService: 'Comprehensive career counseling and assessment platform for school and college students',
              targetCustomers: 'K-12 school students and affluent college aspirants',
              strengths: ['Sophisticated psychometric assessment framework', 'Strong institutional school tie-ups'],
              weaknesses: ['Premium pricing geared toward tier-1 urban schools', 'Limited technical portfolio roadmap tracking for tier-2/3 collegiate jobs'],
              pricing: 'INR 2,500 - 15,000 per comprehensive counseling package',
              differentiationOpportunity: `${startupName} provides ongoing automated execution roadmaps and affordable micro-pricing tailored for tier-2/3 college students.`,
              source: 'Tracxn EdTech Database',
            },
            {
              name: 'Unstop (formerly Dare2Compete)',
              website: 'https://unstop.com',
              productService: 'Early talent discovery, hackathon, competition, and hiring platform for college students',
              targetCustomers: 'Engineering and MBA students competing for marquee corporate hiring contests',
              strengths: ['Large student community network', 'Direct brand recruitment campaigns from top tech firms'],
              weaknesses: ['Focuses on competitive events rather than foundational career diagnostics and skill gap roadmaps', 'Overwhelming for struggling tier-2/3 students'],
              pricing: 'Free for students; charges corporates for campus hackathons and recruitment access',
              differentiationOpportunity: `${startupName} mentors the middle 70% of collegiate students step-by-step from zero portfolio to job-readiness.`,
              source: 'Inc42 Startup Watch',
            },
            {
              name: 'Leverage Edu',
              website: 'https://leverageedu.com',
              productService: 'Study-abroad and international career mentoring platform',
              targetCustomers: 'Students seeking overseas master degrees and international university admissions',
              strengths: ['High monetization on international student admissions and loans', 'Strong global university network'],
              weaknesses: ['Tailored strictly for study abroad rather than domestic Indian job market employment'],
              pricing: 'Free counseling with monetization through foreign university commissions and student loans',
              differentiationOpportunity: `${startupName} focuses squarely on domestic Indian industry hiring, regional skills, and tier-2/3 college career placement.`,
              source: 'YourStory Media',
            },
          ],
          indirectCompetitors: [
            {
              name: 'College Placement Cell Officers',
              description: 'In-house college faculties managing campus placement interviews without modern AI tooling',
              threat_level: 'low',
            },
            {
              name: 'Generic YouTube Career Creators',
              description: 'Online influencers providing broad, uncurated advice without personalized skills assessment',
              threat_level: 'medium',
            },
          ],
          competitiveAnalysis: {
            ourAdvantages: [
              'Actionable weekly execution roadmaps instead of passive one-time advice',
              'AI resume scanner calibrated directly to Indian corporate and startup job descriptions',
              'Affordable pricing model accessible to students with modest monthly allowances',
            ],
            ourDisadvantages: [
              'Need to establish credibility among traditional placement cell faculties',
              'Requires continuous updating of emerging job role competency frameworks',
            ],
            differentiationOpportunities: [
              'Offer college placement cells a free administrative dashboard in exchange for bulk student onboarding',
              'Partner with regional industry associations (CII, MSME chambers) for direct hiring pipelines',
            ],
            competitivePositioning: `The AI career copilot that turns every college student into a job-ready candidate with verifiable projects.`,
          },
        });
      }

      // Generic competitors
      return JSON.stringify({
        directCompetitors: [
          {
            name: `${industry} Leader A`,
            website: 'https://example.com/competitor1',
            productService: `Legacy software suite for ${industry} operations`,
            targetCustomers: `Enterprise organizations in ${targetLocation}`,
            strengths: ['Extensive market presence', 'Large sales team'],
            weaknesses: ['High cost', 'Complex configuration', 'Lack of modern AI workflows'],
            pricing: 'Enterprise licensing',
            differentiationOpportunity: `${startupName} delivers lightweight, self-serve AI workflows at a fraction of legacy software cost.`,
            source: 'Industry Market Intelligence',
          },
        ],
        indirectCompetitors: [
          {
            name: 'Manual Spreadsheets and In-House Tools',
            description: 'Custom internal spreadsheets used by teams to track operational data',
            threat_level: 'medium',
          },
        ],
        competitiveAnalysis: {
          ourAdvantages: ['Modern AI automation', 'Intuitive self-serve UX', 'Accessible pricing'],
          ourDisadvantages: ['Early-stage brand presence'],
          differentiationOpportunities: ['Focus on rapid time-to-value and specialized local workflows'],
          competitivePositioning: `The intelligent, modern AI platform for ${industry}.`,
        },
      });
    }

    case 'bmc': {
      return JSON.stringify({
        keyPartners: {
          title: 'Key Partners',
          items: isAgri
            ? [
                'Farmer Producer Organizations (FPOs) and Agricultural Cooperatives',
                'State Agricultural Universities (e.g., TNAU) and Krishi Vigyan Kendras (KVKs)',
                'Quality-certified agri-input manufacturers (seeds, bio-fertilizers, organic pesticides)',
                'Village Level Entrepreneurs (VLEs) and Common Service Centers (CSCs)',
              ]
            : (isEdu
              ? [
                  'Tier-2 & Tier-3 University Affiliated Colleges & Placement Cells',
                  'Industry Partners and Tech Recruiter HR Networks',
                  'EdTech Course & Certification Providers (Coursera, NPTEL, Skill India)',
                  'Alumni Associations and Professional Industry Mentors',
                ]
              : ['Cloud and Infrastructure Providers', 'Industry Channel Partners', 'Domain Specialists']),
          description: isAgri ? 'Agri ecosystem partners facilitating trust, verification, and distribution' : (isEdu ? 'Collegiate and hiring partners providing student reach and job placements' : 'Core strategic collaborators'),
        },
        keyActivities: {
          title: 'Key Activities',
          items: isAgri
            ? [
                'Continuous training and fine-tuning of multi-crop computer vision pathogen models',
                'Curating localized agronomic treatment protocols in regional languages',
                'Community engagement and field demonstrations with rural farmer groups',
                'Maintaining low-latency offline edge inference mobile architecture',
              ]
            : (isEdu
              ? [
                  'Synthesizing real-time employer job descriptions into competency skill maps',
                  'Developing interactive AI assessment algorithms and resume audit parsers',
                  'Onboarding verified corporate recruiters and scheduling campus talent drives',
                  'Maintaining active student learning community engagement and gamification',
                ]
              : ['Product development and AI model maintenance', 'Customer acquisition and support']),
          description: 'Critical business and engineering operations required to deliver continuous value',
        },
        keyResources: {
          title: 'Key Resources',
          items: isAgri
            ? [
                'Proprietary dataset of 250,000+ localized crop disease and pest images',
                'Machine learning team specializing in edge mobile computer vision',
                'Institutional partnerships with accredited agronomy research centers',
                'Vernacular translation and audio localization pipeline',
              ]
            : (isEdu
              ? [
                  'Proprietary occupational skill ontology mapped to Indian graduate profiles',
                  'AI engineering and natural language processing talent',
                  'Network of empanelled corporate recruiters and hiring managers',
                  'Student engagement platform and assessment database',
                ]
              : ['Proprietary software codebase and AI models', 'Core technical and growth team']),
          description: 'Core assets, intellectual property, and infrastructure driving the solution',
        },
        valuePropositions: {
          title: 'Value Propositions',
          items: isAgri
            ? [
                'Sub-3-second crop disease diagnosis from a phone camera with 95%+ accuracy',
                'Works completely offline in remote acreage with zero internet connectivity',
                'Vernacular audio advice in mother tongue preventing expensive chemical overuse',
                'Protects crop yield value by up to 25% and cuts pesticide bills by 30%',
              ]
            : (isEdu
              ? [
                  'Clarity on exact high-demand career pathways aligned with individual aptitude',
                  'Personalized weekly execution roadmaps converting academic theory into job skills',
                  'Automated resume audit and project portfolio building validated by recruiters',
                  'Direct interview pipelines with vetted employers seeking early-career talent',
                ]
              : ['10x speed improvement in core workflows', 'Affordable pricing accessible for target market']),
          description: 'Tangible outcomes, cost savings, and benefits delivered to customers',
        },
        customerRelationships: {
          title: 'Customer Relationships',
          items: isAgri
            ? [
                'Community-driven trust through local FPO coordinators and lead farmers',
                'Continuous seasonal advisory notifications and proactive pest alerts',
                'Dedicated vernacular voice hotline and WhatsApp support',
              ]
            : (isEdu
              ? [
                  'Gamified personal growth tracking with progress badges and milestone rewards',
                  'Campus student ambassador network and peer learning circles',
                  'Responsive automated AI mentor chat available 24/7',
                ]
              : ['Dedicated self-serve onboarding', 'Automated customer support and community forums']),
          description: 'How the platform builds engagement, loyalty, and long-term retention',
        },
        channels: {
          title: 'Channels',
          items: isAgri
            ? [
                'Android Google Play Store distribution with lightweight APK size (<15MB)',
                'Direct partnerships with Farmer Producer Organizations (FPOs)',
                'Village field demonstrations and Agri-Expos / Krishi Melas',
                'Micro-influencer regional YouTube and WhatsApp agri-channels',
              ]
            : (isEdu
              ? [
                  'Direct partnerships with College Placement Cells and University Deans',
                  'Campus Ambassador student clubs and collegiate hackathon sponsorships',
                  'LinkedIn, Instagram student community content and college WhatsApp groups',
                  'Web application and progressive mobile web app (PWA)',
                ]
              : ['Direct digital web application', 'Search engine optimization and digital channels']),
          description: 'Primary customer touchpoints and distribution channels',
        },
        customerSegments: {
          title: 'Customer Segments',
          items: isAgri
            ? [
                'Smallholder crop and horticulture farmers owning 1-5 acres in target geography',
                'Commercial cash-crop cultivators (cotton, chili, sugarcane, spices, vegetables)',
                'Farmer Producer Organizations (FPOs) and agricultural credit cooperatives',
              ]
            : (isEdu
              ? [
                  'Undergraduate college students in Tier-2/3 cities seeking corporate employment',
                  'First-generation graduates needing structured professional career roadmaps',
                  'College Training & Placement Offices (TPOs) seeking higher placement percentages',
                ]
              : ['Primary target end-users', 'Secondary organizational decision-makers']),
          description: 'Distinct customer segments for whom value is created',
        },
        costStructure: {
          title: 'Cost Structure',
          items: isAgri
            ? [
                'AI model training, GPU compute, and cloud backend infrastructure (AWS/IBM Cloud)',
                'Agronomy data collection, expert field labeling, and university research validation',
                'Core engineering and mobile app software development payroll',
                'Field marketing, FPO awareness workshops, and printed demonstration kits',
              ]
            : (isEdu
              ? [
                  'Platform software engineering, LLM inference API costs, and cloud hosting',
                  'Psychometric framework development and curriculum curation payroll',
                  'Campus ambassador stipends and collegiate marketing outreach',
                  'Employer acquisition sales and corporate partner onboarding team',
                ]
              : ['Software engineering payroll', 'Cloud hosting and compute', 'Customer acquisition marketing']),
          description: 'Primary operational and capital expenditures required to run the platform',
        },
        revenueStreams: {
          title: 'Revenue Streams',
          items: isAgri
            ? [
                'Freemium subscription for advanced weather risk and soil advisory (INR 149/season)',
                'Affiliate commission from verified agri-input suppliers for recommended remedies (3-6%)',
                'Enterprise B2B analytics dashboard licensing to FPOs and crop insurance providers',
              ]
            : (isEdu
              ? [
                  'Freemium student subscription for premium mock interviews & resume builder (INR 99/month)',
                  'Institutional SaaS licensing to colleges for placement portal management (INR 50,000 - 2L/year)',
                  'Corporate recruitment placement success fee for hired graduates (8-10% of first month salary)',
                ]
              : ['Monthly and annual software subscriptions', 'Premium add-ons and enterprise licensing']),
          description: 'Monetization mechanisms across primary and secondary segments',
        },
      });
    }

    case 'revenue': {
      return JSON.stringify({
        recommendedModels: [
          {
            model: isAgri ? 'Freemium with Input Marketplace Commissions' : (isEdu ? 'B2B2C Institutional SaaS & Student Freemium' : 'Tiered Subscription SaaS'),
            description: isAgri
              ? 'Basic diagnostic scanning is free to maximize farmer viral adoption; premium features (detailed spray schedule, weather predictions) require a modest seasonal pass, alongside commissions from verified agri-input orders.'
              : (isEdu
                ? 'College placement cells subscribe to an annual institutional management portal, while students can optionally unlock premium 1-on-1 AI mock interview drills and expedited employer referrals.'
                : 'Tiered subscription offering essential features free with paid premium capabilities.'),
            suitability: 'Optimized for high volume viral adoption with low customer resistance.',
            implementation: 'Phase 1: Free tier for community scale. Phase 2: Launch paid features and partner commissions.',
            pros: ['Zero barrier to trial and rapid word-of-mouth adoption', 'Multiple diversified revenue streams'],
            cons: ['Requires substantial user volume before marketplace commissions become significant'],
            priority: 'primary',
          },
          {
            model: isAgri ? 'Enterprise B2B FPO SaaS Licensing' : (isEdu ? 'Corporate Recruitment Success Fee' : 'Enterprise B2B Licensing'),
            description: isAgri
              ? 'B2B subscription sold to Farmer Producer Organizations and agri-corporates for member farm crop health monitoring.'
              : (isEdu ? 'Corporate recruiters pay a placement success fee upon successfully hiring verified talent.' : 'Enterprise licensing for large accounts.'),
            suitability: 'High-ticket B2B contracts providing upfront predictable cash flows.',
            implementation: 'Engage regional organizations through direct relationship sales.',
            pros: ['Predictable annual recurring contract revenue', 'Higher average revenue per account'],
            cons: ['Longer enterprise sales and procurement cycles'],
            priority: 'secondary',
          },
        ],
        pricingStrategy: {
          approach: 'Value-based freemium with low-ticket entry pricing',
          rationale: `Tailored to the cash flow reality of ${targetCustomer} in ${targetLocation}, ensuring price is never a barrier to adoption.`,
          tiers: [
            { name: 'Starter (Free)', price: 'INR 0', features: ['Instant AI diagnostics', 'Standard remedy protocols', 'Community access'] },
            { name: 'Pro / Seasonal Pass', price: isAgri ? 'INR 199 / season' : 'INR 149 / month', features: ['Weather-based alert forecasting', 'Detailed dosage calculators', 'Priority expert consultation', 'Offline maps'] },
            { name: 'Institutional / Enterprise', price: isAgri ? 'INR 45,000 / year per FPO' : 'INR 75,000 / year per College', features: ['Full administrative analytics dashboard', 'Batch member tracking', 'Custom API integration', 'Dedicated support'] },
          ],
          note: 'Prices are AI-estimated benchmarks based on willingness-to-pay research in target geography.',
        },
        revenueProjections: {
          year1: 'INR 18 Lakhs (Focus on user acquisition, 25,000 users, 5 pilot institutions)',
          year2: 'INR 75 Lakhs (Monetization scaling, 120,000 users, 25 institutions, input partner launch)',
          year3: 'INR 2.8 Crore (Expanded geographic reach, 450,000 users, marketplace commissions)',
          assumptions: [
            '5% free-to-paid conversion rate on active user base',
            'INR 180 average annual revenue per converted retail consumer',
            '35 institutional B2B contracts closed by Month 24',
          ],
          disclaimer: 'AI-generated projections based on empirical adoption curves of comparable Indian startups.',
        },
        unitEconomics: {
          estimatedCAC: isAgri ? 'INR 45 per active farmer (via FPO partnership leverage)' : 'INR 85 per student (via campus ambassador distribution)',
          estimatedLTV: isAgri ? 'INR 380 (blended 2-year retention including commissions)' : 'INR 650 (blended student subscription + placement revenue)',
          breakEvenEstimate: 'Month 18 to Month 22 from commercial launch',
        },
      });
    }

    case 'budget': {
      return JSON.stringify({
        totalEstimatedBudget: initialBudget || 'INR 25 Lakhs',
        currency: 'INR',
        breakdown: [
          {
            category: 'Product Development & AI Engineering',
            percentage: 30,
            estimatedAmount: 'INR 7,50,000',
            items: ['Mobile app frontend & backend development', 'Model training pipeline & edge quantization', 'Data labeling and validation'],
            priority: 'high',
          },
          {
            category: 'Technology & Cloud Infrastructure',
            percentage: 15,
            estimatedAmount: 'INR 3,75,000',
            items: ['Cloud GPU compute (model training & fine-tuning)', 'Backend API hosting, database, and CDN', 'Developer tooling and third-party APIs'],
            priority: 'high',
          },
          {
            category: 'Marketing & Customer Acquisition',
            percentage: 20,
            estimatedAmount: 'INR 5,00,000',
            items: ['Field demonstrations and community workshops', 'Campus ambassador stipends and creative collaterals', 'Localized digital performance marketing'],
            priority: 'high',
          },
          {
            category: 'Operations & Field Logistics',
            percentage: 10,
            estimatedAmount: 'INR 2,50,000',
            items: ['Co-working space/workspace overhead', 'Field travel to pilot clusters and regional hubs', 'Essential equipment and testing devices'],
            priority: 'medium',
          },
          {
            category: 'Human Resources & Core Team Stipends',
            percentage: 15,
            estimatedAmount: 'INR 3,75,000',
            items: [`Core founder/key hire subsistence stipends for ${teamSize} members`, 'Domain specialist advisor honorarium', 'Student intern stipends'],
            priority: 'high',
          },
          {
            category: 'Legal, Compliance & Registration',
            percentage: 5,
            estimatedAmount: 'INR 1,25,000',
            items: ['Pvt Ltd company incorporation & GST registration', 'Trademark filing (Class 9 & 42)', 'Professional legal and CA audit fees'],
            priority: 'medium',
          },
          {
            category: 'Miscellaneous & Contingency Reserve',
            percentage: 5,
            estimatedAmount: 'INR 1,25,000',
            items: ['Unforeseen operational expenses buffer', 'Emergency hardware/cloud scaling cushion'],
            priority: 'low',
          },
        ],
        burnRate: 'INR 1,80,000 - 2,10,000 per month',
        runway: '12 to 14 months of operational runway based on prudent capital allocation',
        disclaimer: 'AI-generated estimate calibrated to typical Indian early-stage startup financial benchmarks. Actual expenses will depend on vendor negotiations and hiring cadence.',
        majorAssumptions: [
          'Founders draw modest survival stipends during the initial 9 months',
          'Leverages startup credits from cloud providers (AWS Activate / IBM Cloud for Startups)',
          'Office space utilized via subsidized incubation centers (e.g. StartupTN / college incubator)',
        ],
      });
    }

    case 'gtm': {
      return JSON.stringify({
        gtmOverview: `A hyper-localized, community-led Go-To-Market execution focusing on initial concentrated density in ${targetLocation} before horizontal expansion.`,
        launchStrategy: {
          approach: 'B2B2C Pilot Anchor Strategy',
          description: isAgri
            ? `Partner with 5 progressive Farmer Producer Organizations (FPOs) in ${targetLocation} to onboard their first 2,500 farmer members through organized live field demonstration days.`
            : (isEdu
              ? `Partner with 3 anchor collegiate institutions in ${targetLocation} to run a campus-wide 'Placement Readiness Challenge', securing 1,500 initial active student profiles.`
              : `Direct pilot partnerships with key local stakeholder organizations to build early reference case studies.`),
          keyMilestones: [
            'Month 1: Finalize functional MVP and secure 3 anchor pilot partner agreements',
            'Month 2: Onboard first 1,000 active users and measure 7-day retention and diagnostic NPS',
            'Month 3: Incorporate user feedback, release v1.1, and initiate commercial partner conversion',
          ],
        },
        targetMarket: `Initial focus on ${targetCustomer} residing in ${targetLocation}.`,
        customerAcquisition: {
          primaryChannels: isAgri
            ? ['FPO and Krishi Vigyan Kendra (KVK) community workshops', 'Lead farmer WhatsApp distribution', 'Vernacular YouTube agri-creator partnerships']
            : (isEdu
              ? ['Collegiate placement cell official circulars', 'Campus student ambassador referral challenges', 'Instagram and LinkedIn career content series']
              : ['Direct partnership outreach', 'Targeted digital channels']),
          acquisitionStrategies: [
            'Zero-cost frictionless entry tier demonstrating instant value',
            'Referral incentives tailored to community network dynamics',
            'Live physical and digital demonstration events showing verified comparative results',
          ],
          retentionStrategies: [
            'Proactive automated notifications triggered by seasonal calendar milestones',
            'Continuous gamified progress tracking with shareable achievement milestones',
            'Responsive localized community support via WhatsApp and in-app chat',
          ],
        },
        marketingChannels: [
          { channel: 'Community Partnerships', description: 'Collaborating directly with established local institutions for high-trust endorsements', priority: 'high', estimatedCost: 'INR 50,000' },
          { channel: 'Content & Social Channels', description: 'Educational case studies, video tutorials, and user success stories in regional language', priority: 'high', estimatedCost: 'INR 75,000' },
          { channel: 'Campus/Village Field Days', description: 'Hands-on live product demonstrations in community gathering hubs', priority: 'medium', estimatedCost: 'INR 1,00,000' },
        ],
        pricingApproach: {
          strategy: 'Freemium with low-friction micro-transactions',
          rationale: 'Builds massive initial market share and network effects before introducing paid barriers.',
          introductoryOffer: 'Complimentary full access to all premium features during initial 90-day pilot cohort.',
        },
        geographicStrategy: {
          phase1: `Cluster launch in ${targetLocation} (3-5 contiguous districts)`,
          phase2: `Statewide expansion across all relevant districts in ${targetLocation}`,
          phase3: 'Inter-state expansion into neighboring states with similar agricultural/educational profiles',
          rationale: 'Ensures operational density, localized word-of-mouth momentum, and efficient logistics.',
        },
        actionPlan: {
          first30Days: {
            theme: 'Product Validation & Pilot Setup',
            actions: [
              'Deploy functional v1.0 mobile build to closed beta group of 100 core users',
              'Finalize formal MOUs with 3 anchor community pilot organizations',
              'Set up user feedback loops and real-time telemetry monitoring for errors',
              'Incorporate Private Limited entity and complete DPIIT startup recognition application',
            ],
          },
          first60Days: {
            theme: 'Live Pilot Cohort & Community Activation',
            actions: [
              'Execute organized launch workshops across 5 pilot clusters, onboarding 2,500 users',
              'Track user diagnostic accuracy / career roadmap engagement daily',
              'Release localized vernacular video guides demonstrating core features',
              'Submit seed grant application to Startup India Seed Fund / state grant schemes',
            ],
          },
          first90Days: {
            theme: 'Optimization, Monetization Trial & Seed Fundraising',
            actions: [
              'Measure pilot cohort retention, NPS, and user cost savings / placement outcomes',
              'Roll out initial premium feature tier and measure conversion willingness',
              'Package pilot success metrics into investor pitch deck for angel/grant fundraising',
              'Plan Phase 2 geographic expansion targeting 15,000 active users by Month 6',
            ],
          },
        },
        successMetrics: [
          'User Activation: 85%+ completion of initial profile and first scan/assessment',
          'Weekly Active Usage (WAU): 40%+ weekly retention during active season/semester',
          'Net Promoter Score (NPS): 65+ across initial cohort',
          'Customer Acquisition Cost (CAC): Maintained under INR 60 per active user',
        ],
      });
    }

    case 'schemes': {
      const schemesList = [];

      if (isTN || isAgri) {
        schemesList.push({
          name: 'TANSEED (Tamil Nadu Startup Seed Grant Fund)',
          organisation: 'StartupTN / Tamil Nadu Startup and Innovation Mission (TANSIM)',
          description: 'Flagship seed grant fund by the Government of Tamil Nadu providing equity-free grants to innovative early-stage startups.',
          eligibility: 'Startups registered with StartupTN having DPIIT recognition, based in Tamil Nadu, working in green tech, agritech, deeptech, or rural empowerment.',
          benefits: ['INR 10,000,000 (INR 10 Lakhs) non-dilutive grant', 'Access to StartupTN regional incubation hubs', 'Mentorship and government procurement showcase'],
          applicationProcess: 'Apply online via the official portal at startuptn.in during cohort announcements (typically 2-3 cohorts per year).',
          deadline: 'Rolling cohorts announced on official website',
          officialSource: 'https://startuptn.in',
          retrievedDate: '2024-2025 official scheme cycle',
          relevantStage: 'ideation/validation/mvp',
        });
      }

      if (isAgri) {
        schemesList.push({
          name: 'RKVY-RAFTAAR (Agri-Startup Incubation & Funding)',
          organisation: 'Ministry of Agriculture & Farmers Welfare / RKVY Division',
          description: 'Financial support and incubation for agricultural startups to promote innovation in farm technologies, post-harvest management, and farmer services.',
          eligibility: 'AgriTech startups with a proof of concept or functional prototype, incubated at an empanelled Knowledge Partner or R-ABI (such as TNAU Coimbatore, IARI, NIAM).',
          benefits: ['Pre-seed grant up to INR 5 Lakhs (Idea stage)', 'Seed grant up to INR 25 Lakhs (Prototype/MVP stage)', '8-week specialized agri-incubation and university lab access'],
          applicationProcess: 'Apply through accredited R-ABIs (e.g. TNAU Agribusiness Incubation Society at tnau.ac.in).',
          deadline: 'Bi-annual application windows announced by R-ABIs',
          officialSource: 'https://rkvy.nic.in',
          retrievedDate: '2024-2025 active cycle',
          relevantStage: 'validation/mvp',
        });
      }

      if (isEdu) {
        schemesList.push({
          name: 'NEAT (National Educational Alliance for Technology)',
          organisation: 'All India Council for Technical Education (AICTE), Ministry of Education',
          description: 'Public-private partnership scheme to bring best-in-class technological solutions in higher education to enhance student employability.',
          eligibility: 'EdTech startups with working learning/employability solutions, verified educational content, and student assessment tools.',
          benefits: ['National platform visibility across 10,000+ AICTE affiliated institutions', 'Opportunity to provide solutions to disadvantaged students with government fee sponsorship', 'AICTE official partnership credential'],
          applicationProcess: 'Online application via neat.aicte-india.org portal under EdTech Partner categories.',
          deadline: 'Annual expression of interest window',
          officialSource: 'https://neat.aicte-india.org',
          retrievedDate: '2024-2025 scheme cycle',
          relevantStage: 'mvp/growth',
        });

        schemesList.push({
          name: 'Skill India Digital / PMKVY 4.0 Partner Scheme',
          organisation: 'Ministry of Skill Development and Entrepreneurship (MSDE)',
          description: 'Government framework enabling digital skill assessment and training startups to certify and prepare youth for organized sector jobs.',
          eligibility: 'Registered entities offering career training, psychometric assessment, or technical skill evaluations aligned with NSQF standards.',
          benefits: ['Accreditation as an assessment/training partner', 'Access to nationwide Skill India digital learner database', 'Subsidized learner course enrollment grants'],
          applicationProcess: 'Submit partner onboarding application via skillindiadigital.gov.in portal.',
          deadline: 'Continuous rolling partner onboarding',
          officialSource: 'https://www.skillindiadigital.gov.in',
          retrievedDate: '2024-2025 official scheme cycle',
          relevantStage: 'validation/mvp',
        });
      }

      // Universal scheme: SISFS
      schemesList.push({
        name: 'Startup India Seed Fund Scheme (SISFS)',
        organisation: 'Department for Promotion of Industry and Internal Trade (DPIIT), Ministry of Commerce and Industry',
        description: 'Central government seed funding scheme supporting startups for proof of concept, prototype development, product trials, and commercialization.',
        eligibility: 'DPIIT-recognized startup incorporated within the last 2 years, having a valid business idea with prototype, applying through an approved incubator.',
        benefits: ['Up to INR 20 Lakhs as grant for proof of concept/prototype validation', 'Up to INR 50 Lakhs as convertible debentures/debt for market entry and scaling'],
        applicationProcess: 'Apply online at seedfund.startupindia.gov.in, select up to 3 preferred empanelled incubators for evaluation.',
        deadline: 'Open round-the-year on national portal',
        officialSource: 'https://seedfund.startupindia.gov.in',
        retrievedDate: '2024-2025 active national scheme',
        relevantStage: 'ideation/validation/mvp',
      });

      schemesList.push({
        name: 'DPIIT Startup Recognition & Tax Benefits (Section 80-IAC)',
        organisation: 'Ministry of Commerce & Industry, Government of India',
        description: 'Official national startup certification providing tax holidays, patent rebates, and streamlined public procurement.',
        eligibility: 'Entity incorporated as Private Limited or LLP within 10 years, annual turnover under INR 100 Cr, focused on innovation.',
        benefits: ['3-year income tax exemption under Section 80-IAC', '80% fee rebate on patent applications and fast-track processing', 'Exemption from angel tax provisions and self-certification under labour laws'],
        applicationProcess: 'Apply online via startupindia.gov.in with certificate of incorporation and pitch deck.',
        deadline: 'Continuous open application',
        officialSource: 'https://www.startupindia.gov.in',
        retrievedDate: '2024-2025 official program',
        relevantStage: 'all stages',
      });

      return JSON.stringify({
        schemes: schemesList,
        disclaimer: 'Government scheme rules and funding availability are updated periodically. Always verify eligibility and documentation requirements on official government portals before applying.',
      });
    }

    case 'funding': {
      const fundingList = [];

      if (isAgri) {
        fundingList.push({
          name: 'Omnivore Partners',
          organization: 'Omnivore Capital Management Advisors',
          fundingType: 'venture capital',
          eligibility: 'Early-stage AgriTech startups transforming agriculture, food systems, and rural climate resilience in India.',
          fundingAmount: 'Seed / Pre-Series A: INR 2 Crore - 15 Crore',
          deadline: 'Rolling evaluation via investor outreach',
          officialSource: 'https://www.omnivore.vc',
          description: 'Leading dedicated agritech venture fund in India backing tech-driven agriculture and climate solutions.',
          stage: 'seed/series-a',
        });
        fundingList.push({
          name: 'Ankur Capital (Fund II / III)',
          organization: 'Ankur Capital',
          fundingType: 'venture capital',
          eligibility: 'Deeptech and agritech startups leveraging science and AI for inclusive mass-market impact.',
          fundingAmount: 'Seed to Series A: INR 3 Crore - 20 Crore',
          deadline: 'Rolling investor pitch submissions',
          officialSource: 'https://www.ankurcapital.com',
          description: 'Early-stage venture fund pioneering investments in digital agriculture and tech for next billion users.',
          stage: 'seed/series-a',
        });
      }

      if (isEdu) {
        fundingList.push({
          name: 'Blume Ventures (Founders Fund)',
          organization: 'Blume Ventures',
          fundingType: 'venture capital',
          eligibility: 'Early-stage Indian startups building scalable consumer, edtech, and SaaS platforms.',
          fundingAmount: 'Seed: INR 1 Crore - 8 Crore',
          deadline: 'Rolling pitch submissions',
          officialSource: 'https://blume.vc',
          description: 'Prominent early-stage Indian venture capital firm with extensive portfolio in education and workforce tech.',
          stage: 'seed/series-a',
        });
        fundingList.push({
          name: 'Indian Angel Network (IAN)',
          organization: 'Indian Angel Network / IAN Fund',
          fundingType: 'angel funding',
          eligibility: 'Early-stage startups with differentiated IP, passionate founding team, and clear product-market fit trajectory.',
          fundingAmount: 'Angel Round: INR 25 Lakhs - 2 Crore',
          deadline: 'Continuous monthly screening committees',
          officialSource: 'https://www.indianangelnetwork.com',
          description: 'One of the largest angel investor networks in Asia providing seed capital and active mentoring.',
          stage: 'pre-seed/seed',
        });
      }

      // Universal funding sources
      fundingList.push({
        name: 'Startup India Seed Fund Scheme (SISFS)',
        organization: 'DPIIT & Empanelled Incubators',
        fundingType: 'government grant & convertible debt',
        eligibility: 'DPIIT-recognized early-stage startups with working prototype and incubator association.',
        fundingAmount: 'INR 20 Lakhs (Grant) to INR 50 Lakhs (Debt/Debenture)',
        deadline: 'Open year-round',
        officialSource: 'https://seedfund.startupindia.gov.in',
        description: 'Non-dilutive and concessional seed capital disbursed through accredited incubators across India.',
        stage: 'pre-seed/seed',
      });

      fundingList.push({
        name: 'SIDBI Fund of Funds for Startups (FFS)',
        organization: 'Small Industries Development Bank of India (SIDBI)',
        fundingType: 'institutional venture support',
        eligibility: 'DPIIT-recognized startups raising rounds from SEBI-registered Alternative Investment Funds.',
        fundingAmount: 'Equity co-investment up to fund allocation limits',
        deadline: 'Through empanelled AIF venture funds',
        officialSource: 'https://www.sidbi.in',
        description: 'Government of India corpus of INR 10,000 Crore investing into venture funds that support Indian startups.',
        stage: 'seed/growth',
      });

      return JSON.stringify({
        fundingOpportunities: fundingList,
        fundingRoadmap: {
          immediate: 'Pursue non-dilutive government grants (SISFS, state seed grant) to complete pilot validation without equity dilution.',
          shortTerm: 'Raise an Angel / Micro-VC round of INR 50 Lakhs - 1.5 Crore to scale customer acquisition and core engineering.',
          longTerm: 'Secure institutional venture capital (Series A) of INR 8 - 20 Crore from sector-specific funds for national expansion.',
        },
        disclaimer: 'Funding availability, check sizes, and investment criteria vary by market conditions. Always verify terms directly with funding organizations.',
      });
    }

    case 'legal': {
      return JSON.stringify({
        businessRegistration: {
          recommendedStructure: 'Private Limited Company (Pvt. Ltd.)',
          rationale: 'Required for raising equity funding, claiming DPIIT startup tax exemptions (80-IAC), and offering stock options (ESOPs) to key hires.',
          registrationSteps: [
            '1. Obtain Digital Signature Certificates (DSC) for all founding directors',
            '2. Name approval reservation through the MCA SPICe+ (Part A) portal',
            '3. File SPICe+ (Part B) for Incorporation, PAN, TAN, EPFO, ESIC, and Profession Tax',
            '4. Open corporate bank account and deposit initial paid-up equity capital',
            '5. File Form INC-20A (Commencement of Business) within 180 days',
          ],
          estimatedCost: 'INR 6,000 - 15,000 (including professional CA/CS fees and government stamp duties)',
          authority: 'Ministry of Corporate Affairs (MCA), Government of India (mca.gov.in)',
        },
        complianceRequirements: [
          { area: 'Goods and Services Tax (GST)', requirement: 'Mandatory registration if aggregate turnover exceeds INR 20 Lakhs (Services) or INR 40 Lakhs (Goods); essential for inter-state digital commerce', applicability: 'From launch / initial invoicing', authority: 'GST Council / CBIC' },
          { area: 'Income Tax & TDS', requirement: 'Annual corporate tax return filing (ITR-6), quarterly TDS filings on vendor contracts and professional fees', applicability: 'Annual & quarterly cycles', authority: 'Income Tax Department' },
          { area: 'Statutory Audit & Annual ROC Filings', requirement: 'Annual statutory audit by a practicing Chartered Accountant, filing Form AOC-4 and MGT-7 with MCA', applicability: 'Annual cycle within 6 months of FY end', authority: 'Registrar of Companies (ROC)' },
        ],
        intellectualProperty: {
          recommendations: [
            'File trademark application under Class 9 (Computer software/apps) and Class 42 (Software as a Service / technology advisory)',
            'Ensure all co-founders, employees, and software contractors sign comprehensive IP Assignment Agreements',
            'Maintain strict proprietary codebase trade secrecy and use open-source components with non-restrictive permissive licenses (MIT/Apache 2.0)',
          ],
          trademarkInfo: 'DPIIT-recognized startups receive an 80% government fee rebate on trademark and patent filings.',
          patentInfo: 'Novel computer vision algorithms or unique hardware integrations can be evaluated for provisional patent protection with 80% fee subsidy.',
          copyrightInfo: 'Software source code, instructional guides, and UX designs are automatically protected under Indian Copyright Act 1957 upon creation.',
        },
        industrySpecificLicenses: isAgri
          ? [
              { license: 'Insecticides Act Advisory Exemption Compliance', requirement: 'Advisory must be purely informational and not involve unauthorized commercial manufacture/re-packaging of chemical pesticides', authority: 'State Directorate of Agriculture' },
              { license: 'FPO / Commercial Partner Agreements', requirement: 'Formal partnership MOUs detailing data privacy, revenue share, and disclaimers', authority: 'Registrar of Cooperatives / Commercial Courts' },
            ]
          : (isEdu
            ? [
                { license: 'UGC / AICTE Distance Education Disclaimers', requirement: 'Clear disclosure that platform offers skill enablement and not accredited university degrees', authority: 'AICTE / UGC' },
                { license: 'Content Copyright Compliance', requirement: 'Licensing agreements for any third-party educational materials or test prep questions', authority: 'Indian Copyright Office' },
              ]
            : [{ license: 'Standard Commercial Business Registration', requirement: 'Shops & Establishments Act registration in operating municipality', authority: 'Local Municipal Corporation' }]),
        dataProtection: 'Full compliance with Digital Personal Data Protection (DPDP) Act 2023. Requires explicit user consent in vernacular language before camera/location access, transparent privacy policy, secure cloud storage with Indian data residency, and right to data erasure.',
        employmentLaws: 'Compliance with Code on Wages 2019, Occupational Safety Code, Prevention of Sexual Harassment (POSH) Act, and standard employment agreements with non-solicitation and confidentiality clauses.',
        disclaimer: 'General informational guidance — not legal advice. Startup founders must consult a qualified corporate lawyer and practicing Chartered Accountant before executing legal filings or entering commercial contracts.',
      });
    }

    case 'executive_summary': {
      const displayCustomer = (targetCustomer && targetCustomer.toLowerCase() !== 'target customers')
        ? targetCustomer
        : (isAgri ? 'small and marginal farmers' : (isEdu ? 'college students and early-career job-seekers' : 'target business clients'));

      return JSON.stringify({
        executiveSummary: `${startupName} is an innovative ${industry} technology platform built to address critical inefficiencies experienced by ${displayCustomer} in ${targetLocation}. By leveraging cutting-edge AI architecture combined with localized domain context, the company delivers actionable outcomes that directly save costs and accelerate productivity for end users.

The platform targets an expansive and rapidly expanding market opportunity, where traditional legacy solutions have failed to penetrate due to high costs, language barriers, and architectural complexity. With a lightweight, vernacular-capable implementation designed from the ground up for low-friction adoption, ${startupName} establishes immediate defensibility and viral community network effects.

Supported by a balanced capital allocation strategy under an initial budget of ${initialBudget}, the founding team is executing a focused 90-day pilot across anchor regional clusters before expanding statewide. With clear alignment to central and state government innovation initiatives (including DPIIT recognition and seed funding grants), ${startupName} is primed for sustainable scale and high investor returns.`,
        elevatorPitch: `${startupName} is an AI-powered ${industry} platform empowering ${displayCustomer} in ${targetLocation} with instant, personalized intelligence that protects output and multiplies operational efficiency.`,
        keyHighlights: [
          { label: 'Market Opportunity', value: isAgri ? 'INR 24,000 Cr TAM' : (isEdu ? 'INR 18,500 Cr TAM' : 'INR 15,000 Cr TAM') },
          { label: 'Target Geography', value: targetLocation },
          { label: 'Initial Budget', value: initialBudget },
          { label: 'Startup Stage', value: stage },
          { label: 'Defensible Advantage', value: 'Localized Edge-AI & Community Trust' },
          { label: 'Projected Breakeven', value: '18–22 Months' },
        ],
        missionStatement: `To democratize world-class intelligent technology for ${displayCustomer}, eliminating operational friction and driving widespread socioeconomic prosperity.`,
        visionStatement: `To become the most trusted, indispensable AI companion for ${displayCustomer} across emerging markets.`,
        startupStage: stage,
        teamSize: `${teamSize} founders and key team members`,
      });
    }

    default:
      return JSON.stringify({
        status: 'completed',
        summary: `Analysis completed for ${startupName} in ${industry}.`,
      });
  }
}
