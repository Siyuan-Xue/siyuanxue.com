import { expect, test } from 'bun:test';
import type { UIMessage } from 'ai';
import {
  ChatInputError,
  type ChatFetch,
  classifyChatError,
  createXueChatTransport,
  normalizeBridgeMessages,
  shouldSubmitChat,
} from '../src/utils/chat-client';

const message = (id: string, role: UIMessage['role'], text: string): UIMessage => ({
  id,
  role,
  parts: [{ type: 'text', text }],
});

test('normalizes UI messages to the bridge role/content contract', () => {
  expect(normalizeBridgeMessages([
    message('u1', 'user', '  Hello  '),
    { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'One' }, { type: 'text', text: ' two' }] },
    { id: 'ignored', role: 'system', parts: [{ type: 'text', text: 'secret' }] },
    message('blank', 'assistant', '   '),
    message('u2', 'user', 'Again'),
    message('u3', 'user', 'More'),
  ])).toEqual([
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'One two' },
    { role: 'user', content: 'Again\n\nMore' },
  ]);
});

test('enforces message, character, and encoded body limits before transport', () => {
  expect(() => normalizeBridgeMessages([message('u', 'user', 'x'.repeat(4001))])).toThrow(ChatInputError);
  const many = Array.from({ length: 25 }, (_, index) => message(String(index), index % 2 ? 'assistant' : 'user', 'x'));
  expect(() => normalizeBridgeMessages(many)).toThrow('context_limit');
  expect(() => normalizeBridgeMessages([
    message('u', 'user', '中'.repeat(4000)),
    message('a', 'assistant', '中'.repeat(4000)),
    message('u2', 'user', '中'.repeat(4000)),
  ])).toThrow('context_limit');
});

test('DefaultChatTransport sends only normalized messages and the UI protocol header', async () => {
  let request: RequestInit | undefined;
  const fetcher: ChatFetch = async (_input, init) => {
    request = init;
    return new Response('data: {"type":"start","messageId":"a1"}\n\ndata: [DONE]\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  };
  const transport = createXueChatTransport(fetcher);
  await transport.sendMessages({
    chatId: 'chat',
    messages: [message('u1', 'user', 'Question')],
    abortSignal: undefined,
    trigger: 'regenerate-message',
    messageId: 'a1',
  });
  expect(JSON.parse(String(request?.body))).toEqual({ messages: [{ role: 'user', content: 'Question' }] });
  expect(new Headers(request?.headers).get('X-Chat-Protocol')).toBe('ui-message-v1');
  expect(new Headers(request?.headers).get('Content-Type')).toBe('application/json');
});

test('safe error classification never exposes arbitrary upstream text', () => {
  expect(classifyChatError(new Error('quota_exhausted'))).toBe('quota_exhausted');
  expect(classifyChatError(new Error('{"error":"authentication_failed"}'))).toBe('authentication_failed');
  expect(classifyChatError(new Error('secret provider trace sk-live-123'))).toBe('upstream_unavailable');
  expect(classifyChatError(new TypeError('Failed to fetch'))).toBe('upstream_unavailable');
});

test('desktop Enter sends safely while mobile Enter and composition create text', () => {
  expect(shouldSubmitChat({ key: 'Enter', shiftKey: false, isComposing: false, keyCode: 13 }, false)).toBe(true);
  expect(shouldSubmitChat({ key: 'Enter', shiftKey: true, isComposing: false, keyCode: 13 }, false)).toBe(false);
  expect(shouldSubmitChat({ key: 'Enter', shiftKey: false, isComposing: true, keyCode: 13 }, false)).toBe(false);
  expect(shouldSubmitChat({ key: 'Enter', shiftKey: false, isComposing: false, keyCode: 229 }, false)).toBe(false);
  expect(shouldSubmitChat({ key: 'Enter', shiftKey: false, isComposing: false, keyCode: 13 }, true)).toBe(false);
});
