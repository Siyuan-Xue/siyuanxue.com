import { expect, test } from 'bun:test';
import { buildScenario, validatePreviewRequest } from './fixtures/chat-preview-server.mjs';

test('preview fixture requires the production protocol header and body contract', () => {
  expect(validatePreviewRequest(new Headers({ 'X-Chat-Protocol': 'ui-message-v1' }), {
    messages: [{ role: 'user', content: 'hello' }],
  })).toEqual({ ok: true, prompt: 'hello' });
  expect(validatePreviewRequest(new Headers(), { messages: [] })).toEqual({ ok: false, code: 'invalid_request' });
  expect(validatePreviewRequest(new Headers({ 'X-Chat-Protocol': 'ui-message-v1' }), {
    messages: [{ role: 'system', content: 'hidden' }],
  })).toEqual({ ok: false, code: 'invalid_request' });
});

test('preview fixture exposes deterministic success and safe error scenarios', () => {
  expect(buildScenario('normal markdown').chunks.join('')).toContain('text-delta');
  expect(buildScenario('please quota').chunks.join('')).toContain('quota_exhausted');
  expect(buildScenario('please timeout').chunks.join('')).toContain('timeout');
  expect(buildScenario('please truncation').chunks.join('')).toContain('stream_error');
  expect(buildScenario('please longstream').delayMs).toBeGreaterThan(0);
  for (const scenario of ['quota', 'timeout', 'truncation']) {
    expect(buildScenario(scenario).chunks.join('')).not.toContain('provider');
  }
});
