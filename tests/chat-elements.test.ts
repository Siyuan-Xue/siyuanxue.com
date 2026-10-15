import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

test('mobile and touch header controls share the global 44px target across pages', async () => {
  const css = await readFile(new URL('../src/styles/header-actions.css', import.meta.url), 'utf8');
  const chatCss = await readFile(new URL('../src/components/chat/chat.css', import.meta.url), 'utf8');
  expect(css).toMatch(/@media\s*\(max-width:\s*767px\)\s*\{\s*html:root\s*\{\s*--header-control-size:\s*44px/);
  expect(css).toMatch(/@media\s*\(pointer:\s*coarse\)\s*\{\s*html:root\s*\{\s*--header-control-size:\s*44px/);
  expect(chatCss).not.toContain('--header-control-size:');
});
