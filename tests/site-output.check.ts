import { expect, test } from 'bun:test';
import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { parseHTML, DOMParser } from 'linkedom';
const variants = [{ root: 'dist', lang: 'en', origin: 'https://siyuanxue.com', other: 'https://xuesiyuan.com', title: 'Siyuan Xue' }, { root: 'dist/zh', lang: 'zh-CN', origin: 'https://xuesiyuan.com', other: 'https://siyuanxue.com', title: '薛思远' }];
async function htmlFiles(root: string): Promise<string[]> { const result: string[] = []; for (const file of await readdir(root, { withFileTypes: true })) { if (file.name === 'zh' || file.name === '_astro') continue; const path = join(root, file.name); if (file.isDirectory()) result.push(...await htmlFiles(path)); else if (path.endsWith('.html')) result.push(path); } return result; }
for (const v of variants) {
 test(`${v.lang}: shipped theme controls work when browser storage throws`, async () => {
  const { document } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
  const storage = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };
  const context = createContext({ document, localStorage: storage, matchMedia: () => ({ matches: false }) });
  for (const script of document.querySelectorAll('script:not([src])')) {
   if (script.getAttribute('type') !== 'application/ld+json') runInContext(script.textContent ?? '', context);
  }
  const button = document.querySelector<HTMLElement>('[data-theme-toggle]')!;
  expect(button.getAttribute('aria-pressed')).toBe('false');
  button.click();
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(document.documentElement.classList.contains('u-mode-invert')).toBe(true);
  button.click();
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(document.documentElement.classList.contains('u-mode-invert')).toBe(false);
 });
 test(`${v.lang}: single locale HTML, canonical metadata, reciprocal language links and complete local assets`, async () => {
  const files = await htmlFiles(v.root); expect(files.length).toBeGreaterThanOrEqual(6);
  for (const path of files) {
   const { document } = parseHTML(await readFile(path, 'utf8'));
   const pathname = path.slice(v.root.length).replace(/index\.html$/, '').replace(/404\.html$/, '404/');
   expect(document.documentElement.lang).toBe(v.lang);
   expect(document.querySelectorAll('h1').length).toBe(1);
   expect(document.querySelectorAll('.i18n-en,.i18n-zh,.lang-body-en,.lang-body-zh,[data-page-boot]').length).toBe(0);
   expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(v.origin + pathname);
   expect(document.querySelector('a.lang-toggle')?.getAttribute('href')).toBe(v.other + pathname);
   expect(document.querySelector('link[hreflang="en"]')?.getAttribute('href')).toBe('https://siyuanxue.com' + pathname);
   expect(document.querySelector('link[hreflang="zh-CN"]')?.getAttribute('href')).toBe('https://xuesiyuan.com' + pathname);
   expect(document.querySelector('link[hreflang="x-default"]')?.getAttribute('href')).toBe('https://siyuanxue.com' + pathname);
   const shareUrl = document.querySelector('meta[property="og:image"]')!.getAttribute('content')!;
   expect(shareUrl).toContain(v.origin + '/images/share-');
   const share = await readFile(join(v.root, new URL(shareUrl).pathname)); expect(share.readUInt32BE(16)).toBe(1200); expect(share.readUInt32BE(20)).toBe(630);
   expect(document.querySelectorAll('link[rel="preload"][as="font"]').length).toBe(0);
   const styles = (await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map(node => readFile(join(v.root, node.getAttribute('href')!), 'utf8')))).join('');
   expect(styles.includes('noto-serif-sc-')).toBe(v.lang === 'zh-CN');
   for (const source of document.querySelectorAll('[srcset]')) for (const candidate of source.getAttribute('srcset')!.split(',')) await access(join(v.root, candidate.trim().split(/\s+/)[0]));
   for (const node of document.querySelectorAll('script[src],link[rel="stylesheet"],img[src]')) { const url = node.getAttribute('src') ?? node.getAttribute('href'); if (url?.startsWith('/')) await access(join(v.root, url)); }
   if (document.querySelector('article')) {
    const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(schema['@type']).toBe('BlogPosting'); expect(schema.headline).toBe(document.querySelector('h1')!.textContent); expect(schema.url).toBe(v.origin + pathname);
    for (const link of document.querySelectorAll('[data-toc-link]')) expect(document.getElementById(link.getAttribute('data-toc-link')!)).not.toBeNull();
    const count = document.querySelectorAll('.prose h2[id],.prose h3[id]').length;
    expect(document.querySelectorAll('.toc-desktop a').length).toBe(count);
    expect(Boolean(document.querySelector('dialog#site-toc'))).toBe(count > 0);
   }
  }
 });
 test(`${v.lang}: responsive portrait and unavailable homepage items`, async () => {
  const { document } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
  expect(document.querySelector('h1')!.textContent).toBe(v.title);
  const picture = document.querySelector('picture')!; expect(picture).not.toBeNull();
  for (const type of ['image/avif','image/webp']) { const source = picture.querySelector(`source[type="${type}"]`); expect(source?.getAttribute('srcset')).toContain('320w'); expect(source?.getAttribute('srcset')).toContain('960w'); }
  expect(document.querySelectorAll('a[href="/wip/"]').length).toBe(0);
  expect(document.querySelector('[data-secret-src]')?.getAttribute('data-secret-src')).toBe('/images/romantic-placeholder.svg');
  expect(document.querySelector('[data-secret-image-slot]')?.children.length).toBe(0);
  expect(await access(join(v.root, 'images/p-202.jpg')).then(() => true, () => false)).toBe(false);
 });
 test(`${v.lang}: localized feeds, sitemap and noindex placeholders`, async () => {
  const rss = new DOMParser().parseFromString(await readFile(join(v.root,'rss.xml'), 'utf8'), 'text/xml');
  expect(rss.querySelector('channel > title')?.textContent).toBe(v.title);
  expect(rss.querySelectorAll('item').length).toBe(3);
  for (const link of rss.querySelectorAll('item > link')) expect(link.textContent).toStartWith(v.origin);
  const sitemap = await readFile(join(v.root,'sitemap-0.xml'), 'utf8'); expect(sitemap).toContain(v.origin); expect(sitemap).not.toContain('/wip'); expect(sitemap).not.toContain('/404');
  expect(await readFile(join(v.root,'robots.txt'),'utf8')).toContain(`Sitemap: ${v.origin}/sitemap-index.xml`);
  for (const page of ['wip/index.html','404.html']) { const { document } = parseHTML(await readFile(join(v.root,page),'utf8')); expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex'); }
 });
}
