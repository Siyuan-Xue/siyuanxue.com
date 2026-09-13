import { afterEach, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const browser = new Window({ url: 'https://example.test/chat/' });
browser.document.write('<!doctype html><html><head></head><body></body></html>');
browser.document.close();
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  HTMLElement: browser.HTMLElement,
  HTMLTextAreaElement: browser.HTMLTextAreaElement,
  Node: browser.Node,
  Event: browser.Event,
  KeyboardEvent: browser.KeyboardEvent,
  MouseEvent: browser.MouseEvent,
  CustomEvent: browser.CustomEvent,
  MutationObserver: browser.MutationObserver,
  ResizeObserver: browser.ResizeObserver,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 0),
  cancelAnimationFrame: clearTimeout,
});

const { fireEvent, render, waitFor, cleanup } = await import('@testing-library/react');
const { ChatApp } = await import('../src/components/chat/ChatApp');
type ChatFetch = import('../src/utils/chat-client').ChatFetch;

const copy = {
  title: 'Chat with xue', name: 'xue', welcome: 'Good to meet you. I’m xue.', intro: 'Friendly intro.',
  label: 'Your message', placeholder: 'What’s on your mind?', identity: 'xue · Here to chat', send: 'Send message',
  stop: 'Stop reply', fresh: 'New conversation', busy: 'xue is replying…', you: 'You',
  copy: 'Copy answer', codeCopy: 'Copy code', copied: 'Copied.', copyFailed: 'Copy failed.', retry: 'Try again', returnToBottom: 'Return to latest',
  inputHint: 'Enter to send · Shift + Enter for a new line', mobileInputHint: 'Use the send button · Enter makes a new line',
  stopped: 'Reply stopped. What arrived is saved.', interrupted: 'Reply interrupted. What arrived is saved.',
  recovery: 'Some saved content could not be restored.', storage: 'This tab cannot save changes right now.',
  errors: {
    quota_exhausted: { title: 'xue is out of replies for now', detail: 'Please come back after the quota is renewed.' },
    authentication_failed: { title: 'The model service is temporarily unavailable', detail: 'Siyuan Xue needs to check the model service connection.' },
    rate_limited: { title: 'Too many chats at once', detail: 'Wait a minute before sending another message.' },
    context_limit: { title: 'This conversation is full', detail: 'Start a new conversation or shorten the message.' },
    timeout: { title: 'The reply took too long', detail: 'What arrived is saved. You can try again.' },
    upstream_unavailable: { title: 'xue could not finish that reply', detail: 'What arrived is saved. You can try again.' },
    interrupted: { title: 'The reply was interrupted', detail: 'What arrived is saved. You can try again.' },
    invalid_request: { title: 'That message could not be sent', detail: 'Check the message and try again.' },
    body_too_large: { title: 'This conversation is too large', detail: 'Start a new conversation.' },
    stream_error: { title: 'The reply was interrupted', detail: 'What arrived is saved. You can try again.' },
  },
};
const prompts = [{ label: 'Say hello', text: 'Hello xue' }];

function uiStream(text: string): Response {
  const frames = [
    { type: 'start', messageId: 'assistant-1' },
    { type: 'text-start', id: 'text-1' },
    { type: 'text-delta', id: 'text-1', delta: text },
    { type: 'text-end', id: 'text-1' },
    { type: 'finish', finishReason: 'stop' },
  ].map(frame => `data: ${JSON.stringify(frame)}\n\n`).join('') + 'data: [DONE]\n\n';
  return new Response(frames, { headers: { 'Content-Type': 'text/event-stream' } });
}

function errorStream(code: string): Response {
  return new Response(`data: ${JSON.stringify({ type: 'error', errorText: code })}\n\ndata: [DONE]\n\n`, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

afterEach(() => {
  cleanup();
  browser.sessionStorage.clear();
});

test('streams markdown through the React chat and sends the exact public bridge contract', async () => {
  const requests: RequestInit[] = [];
  const fetcher: ChatFetch = async (_input, init) => { requests.push(init!); return uiStream('Hello **there**'); };
  const view = render(<ChatApp copy={copy} prompts={prompts} locale="en" fetcher={fetcher} />);
  const input = view.getByLabelText('Your message');
  fireEvent.input(input, { target: { value: 'Hi' } });
  fireEvent.submit(input.closest('form')!);
  await waitFor(() => expect(view.getByText('there', { selector: '[data-streamdown="strong"]' })).toBeTruthy());
  expect(JSON.parse(String(requests[0]!.body))).toEqual({ messages: [{ role: 'user', content: 'Hi' }] });
  expect(new Headers(requests[0]!.headers).get('X-Chat-Protocol')).toBe('ui-message-v1');
  expect(view.getAllByText('Hi')).toHaveLength(1);
});

test('renders hostile model HTML as inert text and provides a code copy control', async () => {
  const response = '<script>window.pwned=true</script>\n\n[x](javascript:alert(1))\n\n```js\nconst safe = "<div>";\n```';
  const view = render(<ChatApp copy={copy} prompts={prompts} locale="en" fetcher={async () => uiStream(response)} />);
  const input = view.getByLabelText('Your message');
  fireEvent.input(input, { target: { value: 'Show code' } });
  fireEvent.submit(input.closest('form')!);
  await waitFor(() => expect(view.getByText('const safe = "<div>";')).toBeTruthy());
  expect(view.container.querySelector('script')).toBeNull();
  expect(view.container.querySelector('a[href^="javascript:"]')).toBeNull();
  expect(view.getByRole('button', { name: /copy code/i })).toBeTruthy();
});

test('retry regenerates from the same user turn without duplicating it', async () => {
  const bodies: unknown[] = [];
  let attempts = 0;
  const fetcher: ChatFetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    attempts += 1;
    return attempts === 1 ? errorStream('upstream_unavailable') : uiStream('Recovered');
  };
  const view = render(<ChatApp copy={copy} prompts={prompts} locale="en" fetcher={fetcher} />);
  const input = view.getByLabelText('Your message');
  fireEvent.input(input, { target: { value: 'Original question' } });
  fireEvent.submit(input.closest('form')!);
  await waitFor(() => expect(view.getByRole('button', { name: 'Try again' })).toBeTruthy());
  fireEvent.click(view.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(view.getByText('Recovered')).toBeTruthy());
  expect(bodies).toEqual([
    { messages: [{ role: 'user', content: 'Original question' }] },
    { messages: [{ role: 'user', content: 'Original question' }] },
  ]);
  expect(view.getAllByText('Original question')).toHaveLength(1);
});

test('the latest completed answer can regenerate without duplicating its user turn', async () => {
  const bodies: unknown[] = [];
  let attempts = 0;
  const fetcher: ChatFetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    attempts += 1;
    return uiStream(attempts === 1 ? 'First answer' : 'Regenerated answer');
  };
  const view = render(<ChatApp copy={copy} prompts={prompts} locale="en" fetcher={fetcher} />);
  const input = view.getByLabelText('Your message');
  fireEvent.input(input, { target: { value: 'Same question' } });
  fireEvent.submit(input.closest('form')!);
  await waitFor(() => expect(view.getByText('First answer')).toBeTruthy());
  fireEvent.click(view.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(view.getByText('Regenerated answer')).toBeTruthy());
  expect(bodies).toEqual([
    { messages: [{ role: 'user', content: 'Same question' }] },
    { messages: [{ role: 'user', content: 'Same question' }] },
  ]);
  expect(view.getAllByText('Same question')).toHaveLength(1);
});

test('quota errors are localized, actionable, and do not offer a blind retry', async () => {
  const view = render(<ChatApp copy={copy} prompts={prompts} locale="en" fetcher={async () => errorStream('quota_exhausted')} />);
  const input = view.getByLabelText('Your message');
  fireEvent.input(input, { target: { value: 'Hello' } });
  fireEvent.submit(input.closest('form')!);
  await waitFor(() => expect(view.getByRole('alert').textContent).toContain('out of replies'));
  expect(view.queryByRole('button', { name: 'Try again' })).toBeNull();
  expect(view.getByRole('button', { name: 'New conversation' })).toBeTruthy();
  fireEvent.input(input, { target: { value: 'Keep this draft' } });
  await waitFor(() => expect(JSON.parse(browser.sessionStorage.getItem('xue-chat:v2')!).error).toBe('quota_exhausted'));
  view.unmount();

  const restored = render(<ChatApp copy={copy} prompts={prompts} locale="en" fetcher={async () => uiStream('unused')} />);
  await waitFor(() => expect(restored.getByRole('alert').textContent).toContain('out of replies'));
  expect((restored.getByLabelText('Your message') as HTMLTextAreaElement).value).toBe('Keep this draft');
  expect(restored.queryByRole('status')).toBeNull();
});

test('a deliberate follow-up replaces an unanswered failed turn without duplicating a user message', async () => {
  const bodies: unknown[] = [];
  let attempts = 0;
  const fetcher: ChatFetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    attempts += 1;
    return attempts === 1 ? errorStream('quota_exhausted') : uiStream('A fresh answer');
  };
  const view = render(<ChatApp copy={copy} prompts={prompts} locale="en" fetcher={fetcher} />);
  const input = view.getByLabelText('Your message');
  fireEvent.input(input, { target: { value: 'Old unanswered prompt' } });
  fireEvent.submit(input.closest('form')!);
  await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
  fireEvent.input(input, { target: { value: 'New deliberate prompt' } });
  fireEvent.submit(input.closest('form')!);
  await waitFor(() => expect(view.getByText('A fresh answer')).toBeTruthy());
  expect(bodies).toEqual([
    { messages: [{ role: 'user', content: 'Old unanswered prompt' }] },
    { messages: [{ role: 'user', content: 'New deliberate prompt' }] },
  ]);
  expect(view.queryByText('Old unanswered prompt')).toBeNull();
  expect(view.getAllByText('New deliberate prompt')).toHaveLength(1);
  expect(view.queryByText(copy.storage)).toBeNull();
});

test('stop keeps streamed partial text and persists it as stopped', async () => {
  const encoder = new TextEncoder();
  const fetcher: ChatFetch = async (_input, init) => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode([
        { type: 'start', messageId: 'assistant-stop' },
        { type: 'text-start', id: 'text-stop' },
        { type: 'text-delta', id: 'text-stop', delta: 'Partial answer' },
      ].map(frame => `data: ${JSON.stringify(frame)}\n\n`).join('')));
      init?.signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')));
    },
  }), { headers: { 'Content-Type': 'text/event-stream' } });
  const view = render(<ChatApp copy={copy} prompts={prompts} locale="en" fetcher={fetcher} />);
  const input = view.getByLabelText('Your message');
  fireEvent.input(input, { target: { value: 'Question' } });
  fireEvent.submit(input.closest('form')!);
  await waitFor(() => expect(view.getByText('Partial answer')).toBeTruthy());
  fireEvent.click(view.getByRole('button', { name: 'Stop reply' }));
  await waitFor(() => expect(view.getAllByText(/Reply stopped/).length).toBeGreaterThan(0));
  const saved = JSON.parse(browser.sessionStorage.getItem('xue-chat:v2')!);
  expect(saved.messages.at(-1)).toEqual({ id: 'assistant-stop', role: 'assistant', content: 'Partial answer', status: 'stopped' });
});

test('tracks a keyboard-shrunk visual viewport so the composer stays in view', async () => {
  let resize: (() => void) | undefined;
  const viewport = {
    height: 300,
    addEventListener: (_type: string, listener: () => void) => { resize = listener; },
    removeEventListener: () => {},
  };
  Object.defineProperty(browser, 'visualViewport', { configurable: true, value: viewport });
  render(<ChatApp copy={copy} prompts={prompts} locale="en" fetcher={async () => uiStream('unused')} />);
  await waitFor(() => expect(browser.document.documentElement.style.getPropertyValue('--xue-viewport-height')).toBe('300px'));
  viewport.height = 260;
  resize?.();
  expect(browser.document.documentElement.style.getPropertyValue('--xue-viewport-height')).toBe('260px');
});
