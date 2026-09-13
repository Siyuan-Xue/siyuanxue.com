import type { UIMessage } from 'ai';
import { CHAT_ERROR_CODES, getMessageText, MAX_INPUT_CHARS, type ChatErrorCode } from './chat-client';

export const CHAT_STORAGE_KEY = 'xue-chat:v2';
export const LEGACY_CHAT_STORAGE_KEY = 'xiaoxue-chat:v1';

export type PersistedMessageStatus = 'complete' | 'streaming' | 'interrupted' | 'stopped' | 'error';
export type MessageStatuses = Record<string, PersistedMessageStatus>;
export type RestoredChatSession = {
  messages: UIMessage[];
  statuses: MessageStatuses;
  draft: string;
  notice: '' | 'interrupted' | 'recovery';
  errorCode?: ChatErrorCode;
  migrated: boolean;
};
export type PersistableChatSession = Pick<RestoredChatSession, 'messages' | 'statuses' | 'draft' | 'errorCode'>;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type StoredMessage = { id: string; role: 'user' | 'assistant'; content: string; status: PersistedMessageStatus };

const MAX_RAW_CHARS = 512_000;
const MAX_MESSAGES = 48;
const MAX_OUTPUT_CHARS = 64_000;
const MAX_STATE_CHARS = 128_000;
const statuses = new Set<PersistedMessageStatus>(['complete', 'streaming', 'interrupted', 'stopped', 'error']);

const empty = (draft = '', notice: RestoredChatSession['notice'] = ''): RestoredChatSession => ({
  messages: [],
  statuses: {},
  draft,
  notice,
  migrated: false,
});

function recoverDraft(raw: string | null): string {
  if (!raw || raw.length > MAX_RAW_CHARS) return '';
  try {
    const value = JSON.parse(raw) as { draft?: unknown };
    return typeof value.draft === 'string' ? value.draft.slice(0, MAX_INPUT_CHARS) : '';
  } catch {
    return '';
  }
}

function validateMessages(values: unknown[], legacy: boolean): { messages: UIMessage[]; statuses: MessageStatuses; interrupted: boolean } {
  if (values.length > MAX_MESSAGES) throw new Error('invalid');
  if (legacy && values.length % 2 !== 0) throw new Error('invalid');
  let total = 0;
  let interrupted = false;
  const ids = new Set<string>();
  const messages: UIMessage[] = [];
  const restoredStatuses: MessageStatuses = {};

  values.forEach((value, index) => {
    if (!value || typeof value !== 'object') throw new Error('invalid');
    const item = value as Partial<StoredMessage>;
    const expectedRole = index % 2 === 0 ? 'user' : 'assistant';
    const id = legacy ? `legacy-${index + 1}` : item.id;
    if (item.role !== expectedRole || typeof item.content !== 'string' || typeof id !== 'string' || !id || id.length > 128 || ids.has(id)) {
      throw new Error('invalid');
    }
    if (!statuses.has(item.status as PersistedMessageStatus)) throw new Error('invalid');
    const limit = item.role === 'user' ? MAX_INPUT_CHARS : MAX_OUTPUT_CHARS;
    if (!item.content.trim() || item.content.length > limit || (item.role === 'user' && item.status !== 'complete')) throw new Error('invalid');
    total += item.content.length;
    if (total > MAX_STATE_CHARS) throw new Error('invalid');
    ids.add(id);
    const status: PersistedMessageStatus = item.status === 'streaming' ? 'interrupted' : item.status as PersistedMessageStatus;
    interrupted ||= item.status === 'streaming';
    messages.push({ id, role: item.role, parts: [{ type: 'text', text: item.content }] });
    restoredStatuses[id] = status;
  });
  return { messages, statuses: restoredStatuses, interrupted };
}

function parse(raw: string, expectedVersion: 1 | 2): RestoredChatSession {
  if (raw.length > MAX_RAW_CHARS) throw new Error('invalid');
  const value = JSON.parse(raw) as { version?: unknown; draft?: unknown; messages?: unknown };
  if (value.version !== expectedVersion || typeof value.draft !== 'string' || value.draft.length > MAX_INPUT_CHARS || !Array.isArray(value.messages)) {
    throw new Error('invalid');
  }
  const restored = validateMessages(value.messages, expectedVersion === 1);
  const rawError = (value as { error?: unknown }).error;
  const safeError = typeof rawError === 'string' && CHAT_ERROR_CODES.includes(rawError as ChatErrorCode) ? rawError as ChatErrorCode : undefined;
  const unanswered = restored.messages.at(-1)?.role === 'user';
  return {
    messages: restored.messages,
    statuses: restored.statuses,
    draft: value.draft,
    notice: restored.interrupted ? 'interrupted' : '',
    errorCode: safeError ?? (unanswered ? 'interrupted' : undefined),
    migrated: expectedVersion === 1,
  };
}

export function restoreChatSession(currentRaw: string | null, legacyRaw: string | null): RestoredChatSession {
  if (currentRaw !== null) {
    try {
      return parse(currentRaw, 2);
    } catch {
      return empty(recoverDraft(currentRaw), 'recovery');
    }
  }
  if (legacyRaw !== null) {
    try {
      return parse(legacyRaw, 1);
    } catch {
      return empty(recoverDraft(legacyRaw), 'recovery');
    }
  }
  return empty();
}

export function loadChatSession(storage: StorageLike | undefined): RestoredChatSession {
  if (!storage) return empty('', 'recovery');
  try {
    return restoreChatSession(storage.getItem(CHAT_STORAGE_KEY), storage.getItem(LEGACY_CHAT_STORAGE_KEY));
  } catch {
    return empty('', 'recovery');
  }
}

export function persistChatSession(storage: StorageLike | undefined, state: PersistableChatSession): boolean {
  if (!storage || state.draft.length > MAX_INPUT_CHARS || state.messages.length > MAX_MESSAGES) return false;
  try {
    const messages: StoredMessage[] = [];
    const ids = new Set<string>();
    let total = 0;
    for (const [index, message] of state.messages.entries()) {
      if (message.role !== 'user' && message.role !== 'assistant') return false;
      const content = getMessageText(message);
      // The SDK may create an assistant shell before its first text delta. A
      // refresh in that small window should preserve the preceding user turn.
      if (!content.trim() && message.role === 'assistant' && index === state.messages.length - 1) continue;
      const expectedRole = messages.length % 2 === 0 ? 'user' : 'assistant';
      const status = state.statuses[message.id] ?? 'complete';
      const limit = message.role === 'user' ? MAX_INPUT_CHARS : MAX_OUTPUT_CHARS;
      if (message.role !== expectedRole || !content.trim() || content.length > limit || !message.id || message.id.length > 128 || ids.has(message.id) || !statuses.has(status) || (message.role === 'user' && status !== 'complete')) return false;
      total += content.length;
      if (total > MAX_STATE_CHARS) return false;
      ids.add(message.id);
      messages.push({ id: message.id, role: message.role, content, status });
    }
    const error = state.errorCode && CHAT_ERROR_CODES.includes(state.errorCode) ? state.errorCode : undefined;
    const serialized = JSON.stringify({ version: 2, draft: state.draft, messages, error });
    if (serialized.length > MAX_RAW_CHARS) return false;
    storage.setItem(CHAT_STORAGE_KEY, serialized);
    storage.removeItem(LEGACY_CHAT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
