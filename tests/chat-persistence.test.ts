import { expect, test } from 'bun:test';
import type { UIMessage } from 'ai';
import {
  CHAT_STORAGE_KEY,
  LEGACY_CHAT_STORAGE_KEY,
  persistChatSession,
  restoreChatSession,
} from '../src/utils/chat-persistence';

const ui = (id: string, role: UIMessage['role'], text: string): UIMessage => ({ id, role, parts: [{ type: 'text', text }] });

test('migrates valid v1 sessions and marks streaming output interrupted', () => {
  const legacy = JSON.stringify({
    version: 1,
    draft: 'Keep typing',
    messages: [
      { role: 'user', content: 'Hi', status: 'complete' },
      { role: 'assistant', content: 'Partial', status: 'streaming', reasoning: 'private' },
    ],
  });
  const restored = restoreChatSession(null, legacy);
  expect(restored.draft).toBe('Keep typing');
  expect(restored.messages.map(message => ({ role: message.role, text: message.parts[0]?.type === 'text' ? message.parts[0].text : '' }))).toEqual([
    { role: 'user', text: 'Hi' },
    { role: 'assistant', text: 'Partial' },
  ]);
  expect(restored.statuses[restored.messages[1]!.id]).toBe('interrupted');
  expect(restored.notice).toBe('interrupted');
  expect(restored.migrated).toBe(true);
});

test('persists only ids, roles, visible text, status, and draft', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  expect(persistChatSession(storage, {
    draft: 'Next',
    messages: [ui('u', 'user', 'Question'), { ...ui('a', 'assistant', 'Visible'), metadata: { private: 'drop me' } }],
    statuses: { u: 'complete', a: 'stopped' },
  })).toBe(true);
  const saved = JSON.parse(values.get(CHAT_STORAGE_KEY)!);
  expect(saved).toEqual({ version: 2, draft: 'Next', messages: [
    { id: 'u', role: 'user', content: 'Question', status: 'complete' },
    { id: 'a', role: 'assistant', content: 'Visible', status: 'stopped' },
  ] });
  expect(values.has(LEGACY_CHAT_STORAGE_KEY)).toBe(false);
});

test('an empty trailing assistant placeholder cannot corrupt a refresh', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  expect(persistChatSession(storage, {
    draft: '',
    messages: [ui('u', 'user', 'Keep this'), ui('a', 'assistant', '')],
    statuses: { u: 'complete', a: 'streaming' },
  })).toBe(true);
  const restored = restoreChatSession(values.get(CHAT_STORAGE_KEY)!, null);
  expect(restored.messages.map(message => message.id)).toEqual(['u']);
  expect(restored.notice).toBe('');
});

test('restores an allowlisted failure and treats an older unanswered turn as interrupted', () => {
  const quota = restoreChatSession(JSON.stringify({
    version: 2,
    draft: 'Next thought',
    error: 'quota_exhausted',
    messages: [{ id: 'u', role: 'user', content: 'Question', status: 'complete' }],
  }), null);
  expect(quota.errorCode).toBe('quota_exhausted');
  expect(quota.draft).toBe('Next thought');

  const older = restoreChatSession(JSON.stringify({
    version: 2,
    draft: '',
    messages: [{ id: 'u', role: 'user', content: 'Question', status: 'complete' }],
  }), null);
  expect(older.errorCode).toBe('interrupted');
});

test('corrupt history recovers a safe draft and never resubmits', () => {
  const restored = restoreChatSession(JSON.stringify({ version: 2, draft: 'recover', messages: [{ role: 'system', content: 'bad' }] }), null);
  expect(restored.draft).toBe('recover');
  expect(restored.messages).toEqual([]);
  expect(restored.notice).toBe('recovery');
});

test('storage failures leave live messages and draft unchanged', () => {
  const state = { draft: 'Unsent', messages: [ui('u', 'user', 'Hi')], statuses: { u: 'complete' as const } };
  const before = JSON.stringify(state);
  expect(persistChatSession({ getItem: () => null, removeItem: () => {}, setItem: () => { throw new Error('quota'); } }, state)).toBe(false);
  expect(JSON.stringify(state)).toBe(before);
});
