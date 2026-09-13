import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

test('mobile header controls reach 44px only in the chat-page scope', async () => {
  const css = await readFile(new URL('../src/components/chat/chat.css', import.meta.url), 'utf8');
  expect(css).toContain('@media(max-width:600px){.has-xue-chat .header{--header-control-size:2.75rem}');
  expect(css).not.toContain('@media(max-width:600px){.header{--header-control-size:2.75rem}');
});
