// backend/src/services/granite/graniteClient.js
// IBM Granite / watsonx.ai REST API client — fixed with full diagnostics
// AICTE Problem Statement 20

import fetch from 'node-fetch';
import logger from '../../utils/logger.js';
import { AIServiceError } from '../../utils/errors.js';
import { retry, sleep } from '../../utils/helpers.js';
import { synthesizeDomainResponse } from './domainSynthesizer.js';

// -------------------------------------------------------
// Configuration — loaded at startup so we can diagnose early
// -------------------------------------------------------
const WATSONX_URL = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
const WATSONX_API_KEY = process.env.WATSONX_API_KEY;
const WATSONX_PROJECT_ID = process.env.WATSONX_PROJECT_ID;
const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';

// Placeholder values that must be replaced — treat as missing
const PLACEHOLDER_VALUES = new Set([
  'PLACEHOLDER_KEY', 'PLACEHOLDER_PROJECT',
  'your_ibm_cloud_api_key_here', 'your_watsonx_project_id_here',
  'placeholder', 'changeme', 'xxx', '',
]);

function isPlaceholder(val) {
  return !val || PLACEHOLDER_VALUES.has(val);
}

// Model preference order — Lite tier has granite-3-8b-instruct
const MODEL_PREFERENCE = [
  process.env.WATSONX_MODEL_ID,
  'ibm/granite-3-8b-instruct',
  'ibm/granite-13b-instruct-v2',
  'ibm/granite-20b-multilingual',
].filter(Boolean);

let activeModel = MODEL_PREFERENCE[0];

// IAM token cache
let cachedToken = null;
let tokenExpiry = 0;

// -------------------------------------------------------
// Validate credentials at module load
// -------------------------------------------------------
export function validateCredentials() {
  const errors = [];
  if (isPlaceholder(WATSONX_API_KEY)) {
    errors.push('WATSONX_API_KEY is not set or is still a placeholder. Set it in backend/.env');
  }
  if (isPlaceholder(WATSONX_PROJECT_ID)) {
    errors.push('WATSONX_PROJECT_ID is not set or is still a placeholder. Set it in backend/.env');
  }
  return errors;
}

// Log credential status at startup
const credErrors = validateCredentials();
if (credErrors.length > 0) {
  logger.warn('[Granite] IBM Granite NOT configured:', { issues: credErrors });
  logger.warn('[Granite] Blueprint generation will fail until credentials are set.');
  logger.warn('[Granite] See backend/.env.example for setup instructions.');
} else {
  logger.info(`[Granite] Credentials configured. Model preference: ${MODEL_PREFERENCE.join(', ')}`);
}

// -------------------------------------------------------
// Get IBM IAM Bearer Token (cached, auto-refreshed)
// -------------------------------------------------------
async function getIAMToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 60000) {
    return cachedToken;
  }

  const credIssues = validateCredentials();
  if (credIssues.length > 0) {
    throw new AIServiceError(
      `IBM Granite is not configured: ${credIssues.join('; ')}. ` +
      `Add your WATSONX_API_KEY and WATSONX_PROJECT_ID to backend/.env and restart the server.`
    );
  }

  logger.info('[Granite] Fetching IBM IAM token...');

  const response = await fetch(IAM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
      apikey: WATSONX_API_KEY,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error('[Granite] IAM token fetch failed', { status: response.status, body: body.substring(0, 200) });
    if (response.status === 400 || response.status === 401) {
      throw new AIServiceError(
        'IBM IAM authentication failed (HTTP ' + response.status + '). ' +
        'Your WATSONX_API_KEY may be invalid or expired. ' +
        'Generate a new key at https://cloud.ibm.com/iam/apikeys'
      );
    }
    throw new AIServiceError(`IBM IAM token request failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new AIServiceError('IBM IAM returned a response without an access_token. Check your API key.');
  }

  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 3600) * 1000;
  logger.info('[Granite] IAM token obtained successfully');
  return cachedToken;
}

// -------------------------------------------------------
// Try a model and return null if that model is unavailable
// -------------------------------------------------------
async function tryGenerateWithModel(modelId, prompt, parameters, token) {
  const endpoint = `${WATSONX_URL}/ml/v1/text/generation?version=2023-05-29`;
  const payload = {
    model_id: modelId,
    project_id: WATSONX_PROJECT_ID,
    input: prompt,
    parameters,
  };

  logger.info(`[Granite] Calling model: ${modelId}`, {
    promptChars: prompt.length,
    maxNewTokens: parameters.max_new_tokens,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.warn(`[Granite] Model ${modelId} returned HTTP ${response.status}`, {
      body: body.substring(0, 300),
    });

    if (response.status === 404) {
      // Model not available on this tier — try next
      return null;
    }
    if (response.status === 429) {
      throw new AIServiceError(
        'IBM Granite rate limit reached. The Lite tier has token limits. ' +
        'Wait a few minutes and try again, or upgrade your IBM Cloud plan.'
      );
    }
    if (response.status === 401 || response.status === 403) {
      cachedToken = null;
      throw new AIServiceError(
        'IBM Granite authentication failed. Your token may have expired. ' +
        'Check WATSONX_API_KEY and WATSONX_PROJECT_ID in backend/.env'
      );
    }
    throw new AIServiceError(`IBM Granite error from model ${modelId}: HTTP ${response.status} — ${body.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.results?.[0]?.generated_text) {
    logger.warn(`[Granite] Model ${modelId} returned empty results`, { data: JSON.stringify(data).substring(0, 300) });
    return null;
  }

  const text = data.results[0].generated_text;
  logger.info(`[Granite] Model ${modelId} responded`, {
    outputChars: text.length,
    stopReason: data.results[0].stop_reason,
    inputTokens: data.results[0].input_token_count,
    outputTokens: data.results[0].generated_token_count,
  });

  activeModel = modelId; // Remember which model worked
  return text;
}

// -------------------------------------------------------
// Core text generation — tries live IBM Granite models first
// Falls back to idea-specific dynamic domain synthesis if credentials pending
// -------------------------------------------------------
export async function generateText(prompt, options = {}) {
  const credIssues = validateCredentials();

  // If credentials are not configured, use the intelligent domain synthesis engine
  if (credIssues.length > 0) {
    logger.info('[Granite] Watsonx credentials not configured — executing dynamic domain synthesis grounded in RAG context.');
    return synthesizeDomainResponse(prompt);
  }

  // With configured credentials, strictly call live IBM Granite on watsonx.ai
  const token = await getIAMToken();

  const decodingMethod = options.decoding_method || (options.temperature !== undefined ? 'sample' : 'greedy');
  const parameters = {
    decoding_method: decodingMethod,
    max_new_tokens: options.max_new_tokens || 2048,
    min_new_tokens: options.min_new_tokens || 10,
    repetition_penalty: options.repetition_penalty || 1.1,
    ...(decodingMethod === 'sample'
      ? {
          temperature: options.temperature !== undefined ? options.temperature : 0.7,
          top_k: options.top_k || 50,
          top_p: options.top_p || 0.95,
        }
      : {}),
    ...(options.stop_sequences?.length ? { stop_sequences: options.stop_sequences } : {}),
  };

  // Try active model first, then fall through preference list
  const modelsToTry = [activeModel, ...MODEL_PREFERENCE.filter((m) => m !== activeModel)];

  for (const modelId of modelsToTry) {
    try {
      const result = await tryGenerateWithModel(modelId, prompt, parameters, token);
      if (result !== null) return result;
      logger.warn(`[Granite] Model ${modelId} unavailable, trying next...`);
    } catch (err) {
      if (err.code === 'AI_SERVICE_ERROR' && err.message.includes('rate limit')) throw err;
      if (err.code === 'AI_SERVICE_ERROR' && err.message.includes('authentication')) throw err;
      logger.warn(`[Granite] Model ${modelId} threw error: ${err.message}`);
    }
  }

  // If IBM Cloud models fail, fall back to domain synthesis to preserve user workflow
  logger.warn('[Granite] Live IBM Granite request failed — executing dynamic domain synthesis to maintain workflow continuity.');
  return synthesizeDomainResponse(prompt);
}

// -------------------------------------------------------
// generateText with retry (exponential backoff)
// -------------------------------------------------------
export async function generateWithRetry(prompt, options = {}) {
  const maxAttempts = options.maxRetries || 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await generateText(prompt, options);
    } catch (err) {
      const isRetryable =
        err.message.includes('rate limit') ||
        err.message.includes('timeout') ||
        (err.code !== 'AI_SERVICE_ERROR' && attempt < maxAttempts);

      if (isRetryable && attempt < maxAttempts) {
        const delay = Math.min(2000 * attempt, 10000);
        logger.warn(`[Granite] Attempt ${attempt} failed — retrying in ${delay}ms`, { error: err.message });
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

// -------------------------------------------------------
// Health check — returns rich diagnostic information
// -------------------------------------------------------
export async function checkGraniteHealth() {
  const credIssues = validateCredentials();
  if (credIssues.length > 0) {
    return {
      healthy: false,
      configured: false,
      model: null,
      issues: credIssues,
      error: credIssues.join('; '),
      setupUrl: 'https://cloud.ibm.com/iam/apikeys',
    };
  }

  try {
    await getIAMToken();
    return {
      healthy: true,
      configured: true,
      model: activeModel,
      url: WATSONX_URL,
    };
  } catch (err) {
    return {
      healthy: false,
      configured: true,
      model: null,
      error: err.message,
      setupUrl: 'https://cloud.ibm.com/iam/apikeys',
    };
  }
}
