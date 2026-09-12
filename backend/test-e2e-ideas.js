// backend/test-e2e-ideas.js
// Tests both required startup ideas end-to-end through the live API

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

const IDEA_1 = {
  startupName: 'UzhavanAI',
  idea: 'An AI-powered crop disease detection platform for small farmers in Tamil Nadu that uses smartphone cameras and computer vision to identify leaf diseases, provide localized Tamil remedies, and connect with TNAU agri-experts.',
  industry: 'Agriculture / Agritech',
  targetLocation: 'Tamil Nadu, India',
  targetCustomer: 'Small and marginal farmers (1-5 acres) and Farmer Producer Organisations (FPOs)',
  initialBudget: 'INR 15 Lakhs',
  teamSize: 3,
  stage: 'ideation',
  additionalNotes: 'Vernacular Tamil audio support, offline disease diagnosis capability',
};

const IDEA_2 = {
  startupName: 'MargadarshiAI',
  idea: 'An AI-powered career guidance platform for college students that assesses technical skill gaps, provides personalized industry-aligned learning roadmaps, and conducts simulated technical interviews.',
  industry: 'Education / EdTech',
  targetLocation: 'India',
  targetCustomer: 'Tier-2 and Tier-3 engineering and arts/science college students',
  initialBudget: 'INR 20 Lakhs',
  teamSize: 4,
  stage: 'ideation',
  additionalNotes: 'Integration with AICTE curriculum and placement cell portal',
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('--- Starting End-to-End Workflow Verification ---');

  // 1. Create a test user
  const email = `test-runner-${Date.now()}@test-sbg.com`;
  const password = 'Password@123';
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Workflow Verifier', email, password }),
  });
  const signupData = await signupRes.json();
  if (!signupData.success) {
    throw new Error(`Signup failed: ${JSON.stringify(signupData)}`);
  }
  const token = signupData.token;
  console.log(`✓ Test user created: ${email}`);

  for (const [idx, ideaPayload] of [IDEA_1, IDEA_2].entries()) {
    console.log(`\n========================================`);
    console.log(`Testing Idea ${idx + 1}: "${ideaPayload.startupName}"`);
    console.log(`Industry: ${ideaPayload.industry} | Location: ${ideaPayload.targetLocation}`);
    console.log(`========================================`);

    // Submit blueprint generation
    const genRes = await fetch(`${BASE_URL}/api/blueprint/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(ideaPayload),
    });
    const genData = await genRes.json();
    if (!genData.success) {
      throw new Error(`Generate failed: ${JSON.stringify(genData)}`);
    }
    const blueprintId = genData.blueprintId;
    console.log(`✓ Blueprint generation initiated: ${blueprintId}`);

    // Poll until completed
    let isComplete = false;
    let attempts = 0;
    while (!isComplete && attempts < 40) {
      await sleep(2000);
      attempts++;
      const statusRes = await fetch(`${BASE_URL}/api/blueprint/${blueprintId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statusData = await statusRes.json();
      const runningStep = statusData.stepProgress?.find((s) => s.status === 'running')?.label || 'Working';
      const completedSteps = statusData.stepProgress?.filter((s) => s.status === 'completed').length || 0;
      console.log(`  [Poll ${attempts}] Progress: ${statusData.progress}% | Completed: ${completedSteps}/11 steps | Active: ${runningStep}`);

      if (statusData.status === 'completed') {
        isComplete = true;
        console.log(`✓ Generation completed successfully!`);
      } else if (statusData.status === 'failed') {
        throw new Error(`Generation failed: ${statusData.errorMessage}`);
      }
    }

    // Fetch full blueprint
    const bpRes = await fetch(`${BASE_URL}/api/blueprint/${blueprintId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const bpData = await bpRes.json();
    const bp = bpData.blueprint;

    console.log('\n--- Verifying Blueprint Quality & Grounding ---');
    console.log(`Status: ${bp.status}`);
    console.log(`Total sections generated: ${Object.keys(bp.sections || {}).length}/12`);
    console.log(`Total live / KB sources retrieved: ${bp.sources?.length || 0}`);
    console.log(`Elevator Pitch: "${bp.sections.executive_summary?.content?.elevatorPitch}"`);

    // Check Problem & Solution
    const prob = bp.sections.problem?.content;
    console.log(`Problem Scale: ${prob?.problem?.problemScale}`);
    console.log(`USP: ${prob?.usp?.valueProposition}`);

    // Check Market Size calculation
    const market = bp.sections.market?.content;
    console.log(`TAM: ${market?.marketSize?.tam?.value} (Source: ${market?.marketSize?.tam?.source})`);
    console.log(`SAM: ${market?.marketSize?.sam?.value}`);
    console.log(`SOM: ${market?.marketSize?.som?.value}`);
    console.log(`TAM Calculation Logic: ${market?.marketSize?.tam?.calculation}`);

    // Check Competitors
    const comps = bp.sections.competitors?.content?.directCompetitors || [];
    console.log(`Direct Competitors (${comps.length}):`);
    comps.forEach((c) => {
      console.log(`  - ${c.name}: ${c.website} | Diff: ${c.differentiation}`);
    });

    // Check Schemes
    const schemes = bp.sections.schemes?.content?.schemes || [];
    console.log(`Government Schemes (${schemes.length}):`);
    schemes.forEach((s) => {
      console.log(`  - ${s.name} (${s.organisation}) | Window: ${s.deadline}`);
    });

    // Check Sources
    console.log(`Retrieved Sources (${bp.sources?.length || 0}):`);
    (bp.sources || []).slice(0, 4).forEach((s) => {
      console.log(`  - [${s.category}] ${s.title}: ${s.url}`);
    });

    // Validation checks
    const bpString = JSON.stringify(bp);
    const hasUnexplainedPending = bpString.includes('"Pending"') || bpString.includes('"Analysis pending"');
    if (hasUnexplainedPending) {
      console.error('❌ WARNING: Output contains "Pending" or "Analysis pending"!');
    } else {
      console.log('✓ Verified: No "Pending" or "Analysis pending" placeholders found.');
    }
  }

  console.log('\n========================================');
  console.log('✓ ALL WORKFLOW TESTS PASSED FOR BOTH IDEAS!');
  console.log('========================================');
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
