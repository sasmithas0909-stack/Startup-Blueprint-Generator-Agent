// tests/backend/blueprint.test.js
// Blueprint API endpoint tests

import request from 'supertest';
import app from '../../backend/src/app.js';
import prisma from '../../backend/src/db/prismaClient.js';

let authToken = '';
let testBlueprintId = '';

const testUser = {
  name: 'Blueprint Tester',
  email: `bp-tester-${Date.now()}@test-sbg.com`,
  password: 'password123',
};

beforeAll(async () => {
  await prisma.$connect();
  // Register and login
  const signupRes = await request(app).post('/api/auth/signup').send(testUser);
  authToken = signupRes.body.token;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: testUser.email } });
  await prisma.$disconnect();
});

const validBlueprintPayload = {
  startupName: 'TestStartup',
  idea: 'An AI-powered platform that helps small businesses manage their inventory efficiently using computer vision and IoT sensors.',
  industry: 'SaaS / B2B Software',
  targetLocation: 'India',
  targetCustomer: 'Small business owners',
  initialBudget: 'INR 20 lakhs',
  teamSize: 2,
  stage: 'ideation',
  additionalNotes: '',
};

describe('Blueprint API', () => {
  it('POST /api/blueprint/generate — requires auth', async () => {
    const res = await request(app).post('/api/blueprint/generate').send(validBlueprintPayload);
    expect(res.status).toBe(401);
  });

  it('POST /api/blueprint/generate — rejects short idea', async () => {
    const res = await request(app)
      .post('/api/blueprint/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...validBlueprintPayload, idea: 'Too short' });
    expect(res.status).toBe(400);
  });

  it('POST /api/blueprint/generate — rejects invalid stage', async () => {
    const res = await request(app)
      .post('/api/blueprint/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...validBlueprintPayload, stage: 'invalid_stage' });
    expect(res.status).toBe(400);
  });

  it('POST /api/blueprint/generate — accepts valid payload', async () => {
    const res = await request(app)
      .post('/api/blueprint/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validBlueprintPayload);
    expect(res.status).toBe(202);
    expect(res.body.blueprintId).toBeDefined();
    testBlueprintId = res.body.blueprintId;
  });

  it('GET /api/blueprint/:id — returns blueprint status', async () => {
    if (!testBlueprintId) return;
    const res = await request(app)
      .get(`/api/blueprint/${testBlueprintId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.blueprint.id).toBe(testBlueprintId);
    expect(['pending', 'generating', 'completed', 'failed']).toContain(res.body.blueprint.status);
  });

  it('GET /api/blueprint/:id/status — returns progress', async () => {
    if (!testBlueprintId) return;
    const res = await request(app)
      .get(`/api/blueprint/${testBlueprintId}/status`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.progress).toBeDefined();
  });

  it('GET /api/blueprint/:id — denies access to other users blueprint', async () => {
    // Create another user
    const user2 = await request(app).post('/api/auth/signup').send({
      name: 'Other User', email: `other-${Date.now()}@test-sbg.com`, password: 'pass123',
    });
    const res = await request(app)
      .get(`/api/blueprint/${testBlueprintId}`)
      .set('Authorization', `Bearer ${user2.body.token}`);
    expect(res.status).toBe(403);
  });

  it('DELETE /api/blueprint/:id — deletes owned blueprint', async () => {
    if (!testBlueprintId) return;
    const res = await request(app)
      .delete(`/api/blueprint/${testBlueprintId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
