import { test, expect } from 'bun:test';
import { rejects } from 'node:assert/strict';
import { readChatStream, shouldSubmit } from '../src/utils/chat';
test('handles split UTF-8/SSE, suppresses arbitrary metadata and requires DONE', async () => {
  const wire = new TextEncoder().encode(
    'data: {"choices":[{"delta":{"content":"你好<script>"}}]}\r\n\r\ndata: [DONE]\n\n',
  );
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const b of wire) c.enqueue(new Uint8Array([b]));
      c.close();
    },
  });
  let text = '';
  await readChatStream(stream, (x) => (text += x));
  expect(text).toBe('你好<script>');
  await rejects(
    readChatStream(
      new ReadableStream({
        start(c) {
          c.close();
        },
      }),
      () => {},
    ),
  );
});
test('error events fail safely and keyboard respects IME and Shift', async () => {
  await rejects(
    readChatStream(
      new ReadableStream({
        start(c) {
          c.enqueue(
            new TextEncoder().encode(
              'event: error\ndata: {"error":"stream_error"}\n\n',
            ),
          );
          c.close();
        },
      }),
      () => {},
    ),
  );
  expect(
    shouldSubmit({
      key: 'Enter',
      shiftKey: false,
      isComposing: false,
      keyCode: 13,
    }),
  ).toBe(true);
  expect(
    shouldSubmit({
      key: 'Enter',
      shiftKey: false,
      isComposing: true,
      keyCode: 13,
    }),
  ).toBe(false);
  expect(
    shouldSubmit({
      key: 'Enter',
      shiftKey: true,
      isComposing: false,
      keyCode: 13,
    }),
  ).toBe(false);
  expect(
    shouldSubmit({
      key: 'Enter',
      shiftKey: false,
      isComposing: false,
      keyCode: 229,
    }),
  ).toBe(false);
});

test('a successful oversized reply blocks the next submission with the length notice and can be cleared', async () => {
  const { parseHTML } = await import('linkedom');
  const { readFileSync } = await import('node:fs');
  const { document, window } = parseHTML(
    '<html><body><section data-chat><p data-empty></p><ol data-messages></ol><p data-status></p><form><textarea></textarea><button data-send></button><button data-stop></button><button data-new></button></form></section></body></html>',
  );
  const root = document.querySelector<HTMLElement>('[data-chat]')!;
  root.dataset.copy = JSON.stringify({
    you: 'You',
    long: 'Start a new conversation.',
    ready: 'Reply complete.',
    busy: 'Replying',
    error: 'Retry',
  });
  const input = root.querySelector('textarea')!;
  const form = root.querySelector('form')!;
  const status = root.querySelector('[data-status]')!;
  let requests = 0;
  const reply = 'x'.repeat(4001);
  const fetchReply = async () => {
    requests++;
    return new Response(
      `data: ${JSON.stringify({ choices: [{ delta: { content: reply } }] })}\n\ndata: [DONE]\n\n`,
    );
  };
  const source = readFileSync(
    new URL('../src/pages/chat.astro', import.meta.url),
    'utf8',
  )
    .split('<script>')[1]!
    .split('</script>')[0]!
    .replace(/import .*?from ['"].*?['"];?\n/g, '');
  const script = new Bun.Transpiler({ loader: 'ts' }).transformSync(source);
  new Function(
    'document',
    'window',
    'fetch',
    'readChatStream',
    'shouldSubmit',
    script,
  )(document, window, fetchReply, readChatStream, shouldSubmit);
  input.value = 'Hello';
  form.dispatchEvent(new window.Event('submit', { cancelable: true }));
  for (let i = 0; i < 50 && status.textContent !== 'Reply complete.'; i++)
    await new Promise((r) => setTimeout(r, 1));
  expect(status.textContent).toBe('Reply complete.');
  expect(root.querySelector('ol')!.textContent).toContain(reply);
  input.value = 'Continue';
  form.dispatchEvent(new window.Event('submit', { cancelable: true }));
  await new Promise((r) => setTimeout(r, 5));
  expect(requests).toBe(1);
  expect(status.textContent).toBe('Start a new conversation.');
  root.querySelector('[data-new]')!.dispatchEvent(new window.Event('click'));
  input.value = 'New topic';
  form.dispatchEvent(new window.Event('submit', { cancelable: true }));
  await new Promise((r) => setTimeout(r, 5));
  expect(requests).toBe(2);
});
