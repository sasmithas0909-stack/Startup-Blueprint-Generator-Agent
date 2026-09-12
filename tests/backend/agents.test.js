// tests/backend/agents.test.js
// Agent module unit tests (mocking AI calls)

import { extractJson } from '../../backend/src/utils/helpers.js';
import { parseGraniteResponse, createFallbackSection } from '../../backend/src/services/granite/responseValidator.js';

describe('helpers.extractJson', () => {
  it('parses direct JSON string', () => {
    const json = '{"key": "value"}';
    expect(extractJson(json)).toEqual({ key: 'value' });
  });

  it('extracts JSON from markdown code block', () => {
    const text = 'Some prose\n```json\n{"key": "value"}\n```\nMore prose';
    expect(extractJson(text)).toEqual({ key: 'value' });
  });

  it('extracts JSON embedded in prose', () => {
    const text = 'Here is the result: {"problem": "test"} end.';
    expect(extractJson(text)).toEqual({ problem: 'test' });
  });

  it('returns null for non-JSON text', () => {
    expect(extractJson('Just some plain text with no JSON')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(extractJson('')).toBeNull();
    expect(extractJson(null)).toBeNull();
  });
});

describe('responseValidator.parseGraniteResponse', () => {
  it('parses valid JSON response', () => {
    const raw = '{"problem": {"mainProblem": "test"}}';
    const result = parseGraniteResponse(raw, ['problem']);
    expect(result.valid).toBe(true);
    expect(result.data.problem.mainProblem).toBe('test');
  });

  it('returns invalid for empty response', () => {
    const result = parseGraniteResponse('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns invalid for non-JSON response', () => {
    const result = parseGraniteResponse('I am sorry, I cannot answer that question.');
    expect(result.valid).toBe(false);
  });

  it('still validates with missing required keys but does not throw', () => {
    const raw = '{"someOtherKey": "value"}';
    const result = parseGraniteResponse(raw, ['problem', 'solution']);
    expect(result.valid).toBe(true); // JSON is valid even if keys are missing
    expect(result.data).toBeDefined();
  });
});

describe('responseValidator.createFallbackSection', () => {
  const sectionKeys = ['problem', 'customers', 'market', 'competitors', 'bmc',
    'revenue', 'budget', 'gtm', 'schemes', 'funding', 'legal', 'executive_summary'];

  sectionKeys.forEach((key) => {
    it(`creates non-null fallback for section: ${key}`, () => {
      const fallback = createFallbackSection(key);
      expect(fallback).toBeDefined();
      expect(typeof fallback).toBe('object');
    });
  });
});
