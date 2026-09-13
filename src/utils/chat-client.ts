import { DefaultChatTransport, type UIMessage } from 'ai';

export const CHAT_PROTOCOL_HEADER = 'ui-message-v1';
export const MAX_INPUT_CHARS = 4_000;
export const MAX_REQUEST_MESSAGES = 24;
export const MAX_REQUEST_CHARS = 16_000;
export const MAX_REQUEST_BYTES = 32_768;

export const CHAT_ERROR_CODES = [
  'quota_exhausted',
  'authentication_failed',
  'rate_limited',
  'context_limit',
  'timeout',
  'upstream_unavailable',
  'interrupted',
  'invalid_request',
  'body_too_large',
  'stream_error',
] as const;

export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number];
export type BridgeMessage = { role: 'user' | 'assistant'; content: string };
type ChatKeyEvent = { key: string; shiftKey: boolean; isComposing: boolean; keyCode: number };
export type ChatFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const errorCodes = new Set<string>(CHAT_ERROR_CODES);

export class ChatInputError extends Error {
  readonly code: ChatErrorCode;

  constructor(code: ChatErrorCode = 'context_limit') {
    super(code);
    this.name = 'ChatInputError';
    this.code = code;
  }
}

export function getMessageText(message: Pick<UIMessage, 'parts'>): string {
  return message.parts
    .filter((part): part is Extract<(typeof message.parts)[number], { type: 'text' }> => part.type === 'text')
    .map(part => part.text)
    .join('');
}

export function normalizeBridgeMessages(messages: UIMessage[]): BridgeMessage[] {
  const normalized: BridgeMessage[] = [];

  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    const content = getMessageText(message).trim();
    if (!content || (!normalized.length && message.role !== 'user')) continue;

    const previous = normalized.at(-1);
    if (previous?.role === message.role) previous.content += `\n\n${content}`;
    else normalized.push({ role: message.role, content });
  }

  const total = normalized.reduce((sum, message) => sum + message.content.length, 0);
  const hasLongMessage = normalized.some(message => message.content.length > MAX_INPUT_CHARS);
  const bytes = new TextEncoder().encode(JSON.stringify({ messages: normalized })).length;
  if (!normalized.length || normalized.at(-1)?.role !== 'user') throw new ChatInputError('invalid_request');
  if (normalized.length > MAX_REQUEST_MESSAGES || hasLongMessage || total > MAX_REQUEST_CHARS || bytes > MAX_REQUEST_BYTES) {
    throw new ChatInputError('context_limit');
  }
  return normalized;
}

export function createXueChatTransport(fetcher: ChatFetch = globalThis.fetch.bind(globalThis)): DefaultChatTransport<UIMessage> {
  return new DefaultChatTransport<UIMessage>({
    api: '/chat-api',
    fetch: fetcher as typeof fetch,
    headers: {
      'Content-Type': 'application/json',
      'X-Chat-Protocol': CHAT_PROTOCOL_HEADER,
    },
    prepareSendMessagesRequest: ({ messages }) => ({
      body: { messages: normalizeBridgeMessages(messages) },
    }),
  });
}

export function classifyChatError(error: unknown): ChatErrorCode {
  const text = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (errorCodes.has(text)) return text as ChatErrorCode;
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === 'string' && errorCodes.has(parsed.error)) return parsed.error as ChatErrorCode;
  } catch {
    // Non-JSON errors are intentionally reduced to the safe fallback below.
  }
  return 'upstream_unavailable';
}

export function shouldSubmitChat(event: ChatKeyEvent, isMobile: boolean): boolean {
  return !isMobile && event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229;
}
