// backend/src/utils/helpers.js
// Utility helpers

/**
 * Parse JSON safely — returns null on failure
 */
export function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Clean common JSON issues produced by LLMs (trailing commas, comments, etc.)
 */
export function cleanJsonString(str) {
  if (!str) return '';
  return str
    // Remove single-line JS comments // ...
    .replace(/\/\/.*$/gm, '')
    // Remove trailing commas before closing braces/brackets
    .replace(/,\s*([}\]])/g, '$1')
    // Replace smart double quotes with standard quotes
    .replace(/[\u201C\u201D]/g, '"')
    // Replace smart single quotes with standard single quotes
    .replace(/[\u2018\u2019]/g, "'");
}

/**
 * Extract JSON from an LLM response that may contain prose, markdown, or formatting quirks
 */
export function extractJson(text) {
  if (!text) return null;

  const trimmed = text.trim();

  // Strategy 1: Direct parse
  const direct = safeJsonParse(trimmed);
  if (direct) return direct;

  // Strategy 2: Cleaned direct parse
  const cleanedDirect = safeJsonParse(cleanJsonString(trimmed));
  if (cleanedDirect) return cleanedDirect;

  // Strategy 3: Markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const candidate = match[1].trim();
    const parsed = safeJsonParse(candidate) || safeJsonParse(cleanJsonString(candidate));
    if (parsed) return parsed;
  }

  // Strategy 4: Find balanced { ... }
  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    let lastBrace = -1;

    for (let i = firstBrace; i < text.length; i++) {
      const char = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            lastBrace = i;
            break;
          }
        }
      }
    }

    if (lastBrace !== -1) {
      const jsonCandidate = text.substring(firstBrace, lastBrace + 1);
      const parsed = safeJsonParse(jsonCandidate) || safeJsonParse(cleanJsonString(jsonCandidate));
      if (parsed) return parsed;
    }
  }

  // Strategy 5: Find balanced [ ... ]
  const firstBracket = text.indexOf('[');
  if (firstBracket !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    let lastBracket = -1;

    for (let i = firstBracket; i < text.length; i++) {
      const char = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '[') {
          depth++;
        } else if (char === ']') {
          depth--;
          if (depth === 0) {
            lastBracket = i;
            break;
          }
        }
      }
    }

    if (lastBracket !== -1) {
      const jsonCandidate = text.substring(firstBracket, lastBracket + 1);
      const parsed = safeJsonParse(jsonCandidate) || safeJsonParse(cleanJsonString(jsonCandidate));
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Sleep for ms milliseconds
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function up to maxAttempts times
 */
export async function retry(fn, maxAttempts = 3, delayMs = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await sleep(delayMs * attempt);
      }
    }
  }
  throw lastError;
}

/**
 * Truncate text to maxLength characters
 */
export function truncate(text, maxLength = 200) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
