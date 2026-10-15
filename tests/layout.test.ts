import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const base = readFileSync(new URL('../src/styles/base.css', import.meta.url), 'utf8');
const rule = (selector: string) => {
 const start = base.indexOf(`${selector}  {`);
 return base.slice(start, base.indexOf('}', start));
};

test('page height uses the small viewport after a 100vh fallback', () => {
 for (const selector of ['body', '.page-wrapper']) expect(rule(selector)).toMatch(/min-height: 100vh;\s*min-height: 100svh;/);
});

test('main content clips horizontal overflow without becoming a scroll container', () => {
 expect(rule('.page-main')).toContain('overflow-x: clip;');
 expect(rule('.page-main')).not.toMatch(/overflow(-x)?:\s*hidden/);
});
