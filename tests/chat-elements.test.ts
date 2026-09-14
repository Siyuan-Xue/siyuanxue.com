import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

test('mobile header controls share the global 44px target across pages', async () => {
  const css = await readFile(new URL('../src/styles/base.css', import.meta.url), 'utf8');
  const chatCss = await readFile(new URL('../src/components/chat/chat.css', import.meta.url), 'utf8');
  expect(css).toMatch(/@media\s*\(max-width:\s*600px\)\s*\{\s*html\s*\{\s*--header-control-size:\s*2.75rem/);
  expect(chatCss).not.toContain('--header-control-size:');
});
