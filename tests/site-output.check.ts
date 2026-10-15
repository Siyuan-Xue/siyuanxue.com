import { expect, test } from 'bun:test';
import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createContext, runInContext } from 'node:vm';
import { parseHTML, DOMParser } from 'linkedom';
import { imageMedia, media } from '../src/utils/media';
import { auditDiscoveryHtml, type DiscoveryPage } from '../src/utils/discovery';
import postcss from 'postcss';
const mediaPaths = new Set(Object.values(media).flatMap(asset => asset.kind === 'image' ? [asset.src, asset.cover.src, ...asset.variants.map(file => file.src)] : [asset.src]));
async function checkAsset(root: string, path: string) {
 if (path.startsWith('/media/')) expect(mediaPaths.has(path)).toBe(true);
 else await access(join(root, path));
}
function windowWithMedia(document: Document) {
 const window = document.defaultView!;
 Object.defineProperty(window, 'location', { value: new URL('https://example.test/'), configurable: true });
 window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
 Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
 return window;
}
test('release contains no photo/video binaries or media directory; image payloads remain outside CI', async () => {
 const paths = await readdir('dist', { recursive: true });
 expect(paths.filter(path => /\.(png|jpe?g|webp|avif|gif|mp4|webm|mov|m4v|mkv)$/i.test(path))).toEqual([]);
 expect(paths.some(path => /^media(?:\/|$)/.test(path))).toBe(false);
});
test('chat browser bundle does not eagerly carry the gallery media inventory', async () => {
 const files = (await readdir('dist/_astro')).filter(name => /^ChatApp\..*\.js$/.test(name));
 expect(files.length).toBeGreaterThan(0);
 for (const file of files) {
  const script = await readFile(join('dist/_astro', file), 'utf8');
  for (const path of mediaPaths) expect(script.includes(path)).toBe(false);
 }
});
test('shared header JS stays below 8 KiB gzip without loading React or the lightbox engine', async () => {
 for (const dir of ['dist/_astro', 'dist/zh/_astro']) {
  const entries = (await readdir(dir)).filter(name => /^HeaderActions\..*\.js$/.test(name));
  expect(entries).toHaveLength(1);
  const visited = new Set<string>();
  let gzipBytes = 0;
  const visit = async (file: string): Promise<void> => {
   if (visited.has(file)) return;
   visited.add(file);
   expect(file).not.toMatch(/gsap|lightbox|ChatApp|client\./i);
   const script = await readFile(join(dir, file), 'utf8');
   gzipBytes += gzipSync(script).length;
   for (const match of script.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) await visit(match[1]!);
  };
  await visit(entries[0]!);
  expect(gzipBytes).toBeLessThan(8 * 1024);
 }
});
const variants = [
 { root: 'dist', lang: 'en', origin: 'https://siyuanxue.com', other: 'https://xuesiyuan.com', title: 'Siyuan Xue', chatLabel: 'Chat with xue', homeLabel: 'Home' },
 { root: 'dist/zh', lang: 'zh-CN', origin: 'https://xuesiyuan.com', other: 'https://siyuanxue.com', title: '薛思远', chatLabel: '与小薛聊聊', homeLabel: '首页' },
];
const entryGallerySlugs = ['imathbook', 'leda-agent', 'pixeldone', 'b-spline-policy', 'bnds-life', 'yuheng', 'walking-with-light', 'finding-li-bai', 'family', 'volleyball'];
async function htmlFiles(root: string): Promise<string[]> { const result: string[] = []; for (const file of await readdir(root, { withFileTypes: true })) { if (file.name === 'zh' || file.name === '_astro') continue; const path = join(root, file.name); if (file.isDirectory()) result.push(...await htmlFiles(path)); else if (path.endsWith('.html')) result.push(path); } return result; }
for (const v of variants) {
 test(`${v.lang}: legacy redirect forwards the explicit in-memory hint even if storage cannot write`, async () => {
  const { document } = parseHTML(await readFile(join(v.root, 'gallery/probfun/index.html'), 'utf8'));
  const window = windowWithMedia(document);
  Object.defineProperty(window, 'location', { value: new URL(`${v.origin}/gallery/probfun/#theme=dark`), configurable: true });
  Object.defineProperty(window, 'history', { value: { state: null, replaceState() {} }, configurable: true });
  const context = createContext({ document, window, localStorage: {
   getItem: () => 'light', setItem() { throw new Error('QuotaExceededError'); },
  }, matchMedia: () => ({ matches: false, addEventListener() {} }) });
  for (const script of document.head.querySelectorAll('script:not([src]):not([type="application/ld+json"])')) runInContext(script.textContent ?? '', context);
  expect(document.documentElement.classList.contains('u-mode-invert')).toBe(true);
  expect(document.querySelector('meta[http-equiv="refresh"]')!.getAttribute('content')).toBe('0;url=/gallery/imathbook/#theme=dark');
  expect(document.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(v.origin + '/gallery/imathbook/');
 });
 test(`${v.lang}: every built head consumes the shared hint before applying stale storage`, async () => {
  for (const file of await htmlFiles(v.root)) {
   const { document } = parseHTML(await readFile(file, 'utf8'));
   const window = windowWithMedia(document);
   const url = new URL(`${v.origin}/?keep=yes#theme=dark&header=open&media=shown`);
   Object.defineProperty(window, 'location', { value: url, configurable: true });
   const state = { preserved: true };
   let cleaned = '';
   Object.defineProperty(window, 'history', { value: { state, replaceState(nextState: unknown, _unused: string, path: string) { expect(nextState).toBe(state); cleaned = path; } }, configurable: true });
   let saved = 'light';
   const context = createContext({ document, window, localStorage: {
    getItem() { throw new Error('Old preference must not be read'); },
    setItem(key: string, value: string) { expect(key).toBe('color-mode'); saved = value; },
   }, matchMedia: () => ({ matches: false, addEventListener() {} }) });
   for (const script of document.head.querySelectorAll('script:not([src]):not([type="application/ld+json"])')) runInContext(script.textContent ?? '', context);
   expect(saved).toBe('dark');
   expect(cleaned).toBe('/?keep=yes');
   expect(document.documentElement.classList.contains('u-mode-invert')).toBe(true);
   expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe('#1f1e1d');
   const portrait = document.querySelector('[data-romantic-mode]');
   expect(document.querySelector('[data-actions-toggle]')!.getAttribute('aria-expanded')).toBe('true');
   expect(document.querySelector<HTMLElement>('[data-actions-panel]')!.inert).toBe(false);
   if (portrait) {
    expect(portrait.classList.contains('is-active')).toBe(true);
    expect(document.querySelector('[data-secret-card]')!.hasAttribute('hidden')).toBe(false);
   }
   expect(window.__siteTheme!.hintHref(document.querySelector('a.header-language-link')!.getAttribute('href')!)).toEndWith('#theme=dark&header=open' + (portrait ? '&media=shown' : ''));
   document.dispatchEvent(new window.Event('DOMContentLoaded'));
  }
 });
 test(`${v.lang}: all SEO URLs and build-time language links stay free of all UI-state hints`, async () => {
  for (const file of await htmlFiles(v.root)) {
   const { document } = parseHTML(await readFile(file, 'utf8'));
   const canonical = document.querySelector('link[rel="canonical"]')!.getAttribute('href')!;
   const path = new URL(canonical).pathname;
   expect(new URL(canonical).search).toBe('');
   expect(new URL(canonical).hash).toBe('');
   expect(document.querySelector('meta[property="og:url"]')!.getAttribute('content')).toBe(canonical);
   const alternates = document.querySelectorAll('link[rel="alternate"][hreflang]');
   expect(alternates).toHaveLength(3);
   for (const [language, origin] of [['en', 'https://siyuanxue.com'], ['zh-CN', 'https://xuesiyuan.com'], ['x-default', 'https://siyuanxue.com']]) {
    expect(document.querySelector(`link[hreflang="${language}"]`)!.getAttribute('href')).toBe(origin + path);
   }
   for (const node of document.querySelectorAll('link[rel="canonical"], link[hreflang], a.header-language-link')) {
    const url = new URL(node.getAttribute('href')!);
    expect(url.hash).toBe(''); expect(url.search).toBe('');
   }
   for (const schema of document.querySelectorAll('script[type="application/ld+json"]')) expect(schema.textContent).not.toMatch(/(?:theme|header|media)=/);
  }
  for (const name of ['sitemap-index.xml', 'sitemap-0.xml', 'sitemap-images.xml', 'sitemap-videos.xml']) {
   expect(await readFile(join(v.root, name), 'utf8')).not.toMatch(/(?:theme|header|media)=/);
  }
 });
 test(`${v.lang}: every HTML page has a build-time language link to an existing route on the other site`, async () => {
  const other = variants.find(candidate => candidate !== v)!;
  const targetFiles = await htmlFiles(other.root);
  const targets = new Set(targetFiles.map(file => file.slice(other.root.length).replace(/index\.html$/, '').replace(/404\.html$/, '404/')));
  const locale = v.lang === 'en' ? 'en' : 'zh';
  for (const file of await htmlFiles(v.root)) {
   const path = file.slice(v.root.length).replace(/index\.html$/, '').replace(/404\.html$/, '404/');
   const html = await readFile(file, 'utf8');
   const { document } = parseHTML(html);
   const links = document.querySelectorAll('a.header-language-link');
   expect(links).toHaveLength(1);
   const link = links[0];
   let expectedPath = path;
   if (path === '/404/') expectedPath = '/';
   else if (path.startsWith('/gallery/') && path !== '/gallery/probfun/') {
    const slug = path.split('/')[2];
    const sources = await Promise.all(['en', 'zh'].map(language => readFile(`src/content/galleries/${slug}/${language}.json`, 'utf8').then(JSON.parse)));
    if (sources.some(source => source.draft)) expectedPath = '/';
   }
   const url = new URL(link.getAttribute('href')!);
   expect(url.href).toBe(v.other + expectedPath);
   expect(url.origin).toBe(v.other);
   expect(targets.has(url.pathname)).toBe(true);
   expect(url.search).toBe(''); expect(url.hash).toBe('');
   // HTML attributes are case-insensitive; linkedom preserves React SSR's hrefLang spelling.
   expect(link.getAttribute('hreflang') ?? link.getAttribute('hrefLang')).toBe(other.lang);
   expect(link.getAttribute('lang')).toBe(other.lang);
   const label = locale === 'en' ? 'Switch to 中文' : '切换到 English';
   expect(link.textContent.trim()).toBe('');
   expect(link.getAttribute('aria-label')).toBe(label);
   expect(link.getAttribute('title')).toBe(label);
   expect(link.querySelectorAll('svg')).toHaveLength(1);
   const icon = link.querySelector('svg')!;
   expect(icon.getAttribute('aria-hidden')).toBe('true');
   expect(icon.getAttribute('width')).toBe('20');
   expect(icon.getAttribute('height')).toBe('20');
   expect(icon.getAttribute('stroke-width')).toBe('1.8');
   expect(icon.getAttribute('fill')).toBe('none');
   expect(icon.getAttribute('stroke')).toBe('currentColor');
   expect(icon.querySelector('path')).not.toBeNull();
   expect(document.querySelector('.header-actions-row')?.lastElementChild).toBe(link);
   const toggle = document.querySelector('[data-actions-toggle]')!;
   expect(toggle.getAttribute('aria-expanded')).toBe('false');
   expect(toggle.getAttribute('aria-label')).toBe(locale === 'en' ? 'Show actions' : '展开操作');
   expect(document.getElementById(toggle.getAttribute('aria-controls')!)).not.toBeNull();
   expect(document.querySelector('[data-header-actions]')?.getAttribute('data-actions-expanded')).toBe('false');
   expect(document.head.querySelector('noscript')?.textContent).toContain('visibility: visible');
  }
 });
 test(`${v.lang}: essays and posts ship the scoped Dario typography contract`, async () => {
  for (const path of ['essay/embodied-agent/index.html', 'post/first-note/index.html']) {
   const { document } = parseHTML(await readFile(join(v.root, path), 'utf8'));
   expect(document.documentElement.classList.contains('prose-page')).toBe(true);
   const css = (await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map(node => readFile(join(v.root, node.getAttribute('href')!), 'utf8')))).join('\n');
   const sheet = postcss.parse(css);
   const declaration = (selector: string, property: string, value: string) => {
    let matched = false;
    sheet.walkRules(rule => {
     if (rule.selectors.includes(selector)) rule.walkDecls(property, decl => { if (decl.value === value) matched = true; });
    });
    expect(matched).toBe(true);
   };
   declaration('html.prose-page', '--narrow', '38.75rem');
   declaration('.prose-page .post-title', 'font-size', '62px');
   declaration('.prose-page .post-title', 'font-size', '48px');
   declaration('.prose-page .post-title', 'line-height', '1.1');
   declaration('.prose-page .post-title', 'text-wrap', 'balance');
   declaration('.prose-page .post-subtitle', 'font-size', '22px');
   declaration('.prose-page .post-subtitle', 'font-style', 'italic');
   declaration('.prose-page .post-date', 'margin', '2em 0 1em');
   declaration('.prose-page .prose strong', 'font-weight', '600');
   declaration('.prose-page .toc-link', 'opacity', '.5');
   declaration('.prose-page .toc-link.cc-active', 'opacity', '1');
   declaration('.prose-page .prose figure', 'margin', '4rem 0');
   expect(css).toMatch(/newsreader-latin-standard-normal[^)]*\.woff2/);
   expect(css).toMatch(/newsreader-latin-standard-italic[^)]*\.woff2/);
   expect(css).toMatch(/font-variation-settings:["']opsz["'] 24/);
   const time = document.querySelector('.post-date time')!;
   const date = new Date(time.getAttribute('datetime')!);
   expect(time.textContent).toBe(date.toLocaleDateString(v.lang === 'en' ? 'en-US' : 'zh-CN', { month: 'long', year: 'numeric', timeZone: 'UTC' }));
   expect(document.querySelector('meta[property="article:published_time"]')?.getAttribute('content')).toBe(date.toISOString());
   for (const image of document.querySelectorAll('.essay-figure img')) expect(image.getAttribute('sizes')).toBe('(max-width: 479px) calc(100vw - 40px), (max-width: 991px) calc(80vw - 20px), 580px');
  }
  for (const path of ['index.html', 'gallery/pixeldone/index.html', 'chat/index.html']) {
   const { document } = parseHTML(await readFile(join(v.root, path), 'utf8'));
   expect(document.documentElement.classList.contains('prose-page')).toBe(false);
  }
 });
 test(`${v.lang}: every generated route matches discovery policy and all sitemap URLs are indexable canonical pages`, async () => {
  const locale = v.lang === 'en' ? 'en' : 'zh';
  const inventory: DiscoveryPage[] = JSON.parse(await readFile(`.build/discovery/${locale}.json`, 'utf8'));
  const files = await htmlFiles(v.root);
  expect(files).toHaveLength(inventory.length);
  for (const file of files) {
   const pathname = file.slice(v.root.length).replace(/index\.html$/, '').replace(/404\.html$/, '404/');
   const page = auditDiscoveryHtml(pathname, await readFile(file, 'utf8'), inventory);
   if (page.kind === 'gallery') {
    const source = JSON.parse(await readFile(`src/content/galleries/${pathname.split('/')[2]}/${locale}.json`, 'utf8'));
    const { document } = parseHTML(await readFile(file, 'utf8'));
    expect(document.querySelector('.gallery-description')?.textContent).toBe(source.description);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(source.seoDescription ?? source.description);
   }
  }
  const indexable = inventory.filter(page => page.indexable);
  const sitemap = new DOMParser().parseFromString(await readFile(join(v.root, 'sitemap-0.xml'), 'utf8'), 'text/xml');
  expect([...sitemap.querySelectorAll('url > loc')].map(node => node.textContent).sort()).toEqual(indexable.map(page => page.canonical).sort());
  for (const node of sitemap.querySelectorAll('url')) {
   const page = indexable.find(page => page.canonical === node.querySelector('loc')?.textContent)!;
   expect(node.querySelector('lastmod')?.textContent ?? undefined).toBe(page.dateModified ?? page.datePublished);
   const links = [...node.getElementsByTagName('xhtml:link')];
   expect(links).toHaveLength(3);
   for (const [language, url] of Object.entries(page.alternates)) expect(links.some(link => link.getAttribute('hreflang') === language && link.getAttribute('href') === url)).toBe(true);
  }
  const index = new DOMParser().parseFromString(await readFile(join(v.root, 'sitemap-index.xml'), 'utf8'), 'text/xml');
  expect([...index.querySelectorAll('sitemap > loc')].map(node => node.textContent)).toEqual(['sitemap-0.xml', 'sitemap-images.xml', 'sitemap-videos.xml'].map(file => `${v.origin}/${file}`));
  for (const name of ['sitemap-images.xml', 'sitemap-videos.xml']) {
   const sitemap = new DOMParser().parseFromString(await readFile(join(v.root, name), 'utf8'), 'text/xml');
   for (const node of sitemap.querySelectorAll('url > loc')) expect(indexable.map(page => page.canonical)).toContain(node.textContent!);
  }
  const imageMap = new DOMParser().parseFromString(await readFile(join(v.root, 'sitemap-images.xml'), 'utf8'), 'text/xml');
  const originals = new Set(Object.values(media).filter(asset => asset.kind === 'image').map(asset => `${v.origin}${asset.src}`));
  for (const node of imageMap.getElementsByTagName('image:loc')) expect(originals.has(node.textContent!)).toBe(true);
  const manifest = JSON.parse(await readFile(join(v.root, 'indexnow-manifest.json'), 'utf8'));
  expect(manifest.version).toBe(1);
  expect(manifest.host).toBe(new URL(v.origin).host);
  expect(Object.keys(manifest.pages).sort()).toEqual(indexable.map(page => page.canonical).sort());
  for (const hash of Object.values(manifest.pages)) expect(hash).toMatch(/^[a-f0-9]{64}$/);
  expect(await readFile(join(v.root, 'robots.txt'), 'utf8')).not.toContain('Disallow: /wip/');
  expect((await readdir(v.root)).some(path => path === 'discovery' || path === 'discovery.json')).toBe(false);
 });
 test(`${v.lang}: merged mathematics project has one homepage entrance and preserves the old ProbFun address`, async () => {
  const home = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8')).document;
  const projectLinks = [...home.querySelectorAll('.home-container > section')[1].querySelectorAll('.bullet-list_link')];
  expect(projectLinks[0].getAttribute('href')).toBe('/gallery/imathbook/');
  expect(projectLinks[0].textContent).toBe('iMathBook · uMathHub');
  expect(home.querySelectorAll('a[href="/gallery/imathbook/"]')).toHaveLength(1);
  expect(home.querySelector('a[href="/gallery/probfun/"]')).toBeNull();
  const legacy = parseHTML(await readFile(join(v.root, 'gallery/probfun/index.html'), 'utf8')).document;
  expect(legacy.querySelector('meta[http-equiv="refresh"]')?.getAttribute('content')).toBe('0;url=/gallery/imathbook/');
  expect(legacy.querySelector('a[href="/gallery/imathbook/"]')).not.toBeNull();
  expect(legacy.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(v.origin + '/gallery/imathbook/');
  expect(legacy.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
  const sitemap = await readFile(join(v.root, 'sitemap-0.xml'), 'utf8');
  expect(sitemap).not.toContain('/gallery/probfun/');
  expect(sitemap).toContain(v.origin + '/gallery/imathbook/');
 });
 test(`${v.lang}: homepage identifies the same bilingual author as articles`, async () => {
  const { document } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
  expect(document.title).toBe(v.lang === 'en' ? 'Siyuan Xue（薛思远）｜Personal Website' : '薛思远（Siyuan Xue）｜个人网站');
  const markup = document.querySelector('script[type="application/ld+json"]');
  expect(markup).not.toBeNull();
  const graph = JSON.parse(markup!.textContent!)['@graph'];
  const profile = graph.find((node: { '@type': string }) => node['@type'] === 'ProfilePage');
  expect(profile.url).toBe(v.origin + '/');
  expect(profile.mainEntity['@type']).toBe('Person');
  expect(profile.mainEntity.name).toBe(v.title);
  expect(profile.mainEntity['@id']).toBe('https://siyuanxue.com/#person');
  expect(profile.mainEntity.sameAs).toContain('https://github.com/Siyuan-Xue');
  expect(profile.mainEntity.sameAs).toContain('https://xuesiyuan.com/');
  expect(graph.find((node: { '@type': string }) => node['@type'] === 'WebSite').url).toBe(v.origin + '/');
  const { document: article } = parseHTML(await readFile(join(v.root, 'essay/why-this-site/index.html'), 'utf8'));
  const articleSchema = JSON.parse(article.querySelector('script[type="application/ld+json"]')!.textContent!);
  expect(articleSchema.author['@id']).toBe(profile.mainEntity['@id']);
 });
 for (const page of ['index.html', 'essay/why-this-site/index.html', 'chat/index.html']) {
 test(`${v.lang}: ${page} theme controls work when browser storage throws`, async () => {
  const { document } = parseHTML(await readFile(join(v.root, page), 'utf8'));
  const storage = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };
  const context = createContext({ document, window: windowWithMedia(document), localStorage: storage, matchMedia: () => ({ matches: false, addEventListener() {} }) });
  for (const script of document.head.querySelectorAll('script:not([src])')) {
   if (script.getAttribute('type') !== 'application/ld+json') runInContext(script.textContent ?? '', context);
  }
  const button = document.querySelector<HTMLElement>('[data-theme-toggle]')!;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const colorScheme = document.querySelector('meta[name="color-scheme"]');
  expect(themeColor?.getAttribute('content')).toBe('#f0eee6');
  expect(colorScheme?.getAttribute('content')).toBe('light');
  expect(button.getAttribute('aria-pressed')).toBe('false');
  button.click();
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(document.documentElement.classList.contains('u-mode-invert')).toBe(true);
  const darkThemeColor = document.querySelector('meta[name="theme-color"]');
  expect(darkThemeColor?.getAttribute('content')).toBe('#1f1e1d');
  expect(darkThemeColor).not.toBe(themeColor);
  expect(colorScheme?.getAttribute('content')).toBe('dark');
  button.click();
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(document.documentElement.classList.contains('u-mode-invert')).toBe(false);
  expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#f0eee6');
  expect(document.querySelector('meta[name="theme-color"]')).not.toBe(darkThemeColor);
  expect(colorScheme?.getAttribute('content')).toBe('light');
 });
 }
 for (const [saved, systemDark, expectedDark] of [
  ['dark', false, true], ['light', true, false], [null, true, true], [null, false, false],
 ] as const) {
  test(`${v.lang}: theme at first paint respects saved=${saved}, systemDark=${systemDark}`, async () => {
   const { document } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
   const context = createContext({ document, window: windowWithMedia(document), localStorage: { getItem: () => saved }, matchMedia: () => ({ matches: systemDark, addEventListener() {} }) });
   for (const script of document.head.querySelectorAll('script:not([src])')) {
    if (script.getAttribute('type') !== 'application/ld+json') runInContext(script.textContent ?? '', context);
   }
   expect(document.documentElement.classList.contains('u-mode-invert')).toBe(expectedDark);
   expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(expectedDark ? '#1f1e1d' : '#f0eee6');
   expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')).toBe(expectedDark ? 'dark' : 'light');
  });
 }
 test(`${v.lang}: returning through browser history restores the latest chosen theme`, async () => {
  const { document, window } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
  windowWithMedia(document);
  let saved = 'light';
  const context = createContext({ document, window, localStorage: { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } }, matchMedia: () => ({ matches: false, addEventListener() {} }) });
  for (const script of document.head.querySelectorAll('script:not([src])')) {
   if (script.getAttribute('type') !== 'application/ld+json') runInContext(script.textContent ?? '', context);
  }
  const button = document.querySelector<HTMLElement>('[data-theme-toggle]')!;
  button.click();
  expect(saved).toBe('dark');
  saved = 'light'; // A different page changed the saved preference.
  const event = new window.Event('pageshow');
  Object.defineProperty(event, 'persisted', { value: true });
  window.dispatchEvent(event);
  expect(document.documentElement.classList.contains('u-mode-invert')).toBe(false);
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#f0eee6');
 });
 test(`${v.lang}: single locale HTML, canonical metadata, reciprocal language links and complete local assets`, async () => {
  const files = await htmlFiles(v.root); expect(files.length).toBeGreaterThanOrEqual(6);
  for (const path of files) {
   const { document } = parseHTML(await readFile(path, 'utf8'));
   const pathname = path.slice(v.root.length).replace(/index\.html$/, '').replace(/404\.html$/, '404/');
   // The merged project's legacy redirect keeps its target canonical, checked above.
   if (pathname === '/gallery/probfun/') continue;
   expect(document.documentElement.lang).toBe(v.lang);
   expect(document.querySelectorAll('meta[name="theme-color"]').length).toBe(1);
   expect(document.querySelector('meta[name="theme-color"]')?.hasAttribute('media')).toBe(false);
   expect(document.querySelectorAll('meta[name="color-scheme"]').length).toBe(1);
   expect(document.querySelectorAll('h1').length).toBe(1);
   expect(document.querySelectorAll('.i18n-en,.i18n-zh,.lang-body-en,.lang-body-zh,[data-page-boot]').length).toBe(0);
   expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(v.origin + pathname);
   expect(document.querySelector('a.header-language-link')).not.toBeNull();
   if (pathname !== '/') expect(document.querySelector('.header-home-link')?.getAttribute('href')).toBe('/');
   expect(document.querySelector('link[hreflang="en"]')?.getAttribute('href')).toBe('https://siyuanxue.com' + pathname);
   expect(document.querySelector('link[hreflang="zh-CN"]')?.getAttribute('href')).toBe('https://xuesiyuan.com' + pathname);
   expect(document.querySelector('link[hreflang="x-default"]')?.getAttribute('href')).toBe('https://siyuanxue.com' + pathname);
   const shareUrl = document.querySelector('meta[property="og:image"]')!.getAttribute('content')!;
   expect(new URL(shareUrl).origin).toBe(v.origin);
   if (document.querySelector('article[data-gallery-page]')) {
    await checkAsset(v.root, new URL(shareUrl).pathname);
    expect(Number(document.querySelector('meta[property="og:image:width"]')?.getAttribute('content'))).toBeGreaterThan(0);
    expect(Number(document.querySelector('meta[property="og:image:height"]')?.getAttribute('content'))).toBeGreaterThan(0);
    expect(document.querySelector('meta[property="og:image:alt"]')?.getAttribute('content')).toBeTruthy();
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(shareUrl);
   } else {
    expect(shareUrl).toBe(v.origin + imageMedia(v.lang === 'en' ? 'share-en' : 'share-zh').src);
    const share = imageMedia(v.lang === 'en' ? 'share-en' : 'share-zh'); expect(share.width).toBe(1200); expect(share.height).toBe(630);
   }
   expect(document.querySelectorAll('link[rel="preload"][as="font"]').length).toBe(0);
   const styles = (await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map(node => readFile(join(v.root, node.getAttribute('href')!), 'utf8')))).join('');
   expect(styles.includes('noto-serif-sc-')).toBe(v.lang === 'zh-CN');
   for (const source of document.querySelectorAll('[srcset]')) for (const candidate of source.getAttribute('srcset')!.split(',')) await checkAsset(v.root, candidate.trim().split(/\s+/)[0]);
   for (const node of document.querySelectorAll('script[src],link[rel="stylesheet"],img[src]')) { const url = node.getAttribute('src') ?? node.getAttribute('href'); if (url?.startsWith('/')) await checkAsset(v.root, url); }
   if (document.querySelector('article[data-gallery-page]')) {
    const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);
    const nodes = schema['@graph'] ?? [schema];
    const gallery = nodes.find((node: { '@type': string }) => node['@type'] === 'ImageGallery');
    expect(gallery).toBeTruthy();
    expect(gallery.url).toBe(v.origin + pathname);
    expect(gallery.name).toBe(document.querySelector('h1')!.textContent);
    expect(gallery.author['@id']).toBe('https://siyuanxue.com/#person');
    expect(nodes.some((node: { '@type': string }) => node['@type'] === 'BlogPosting')).toBe(false);
    expect(document.querySelector('meta[property="article:published_time"]')).toBeNull();
    const figures = document.querySelectorAll('article[data-gallery-page] .gallery-grid > figure');
    expect(figures.length).toBeGreaterThan(0);
    for (const figure of figures) {
     const image = figure.querySelector('img')!;
     expect(image.getAttribute('alt')).toBeTruthy();
     expect(Number(image.getAttribute('width'))).toBeGreaterThan(0);
     expect(Number(image.getAttribute('height'))).toBeGreaterThan(0);
     expect(figure.querySelector('figcaption')?.textContent?.trim()).toBeTruthy();
     expect(figure.querySelector('a[href]')).not.toBeNull();
    }
   } else if (document.querySelector('article')) {
    const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(schema['@type']).toBe('BlogPosting'); expect(schema.headline).toBe(document.querySelector('h1')!.textContent); expect(schema.url).toBe(v.origin + pathname);
    for (const link of document.querySelectorAll('[data-toc-link]')) expect(document.getElementById(link.getAttribute('data-toc-link')!)).not.toBeNull();
    const count = document.querySelectorAll('.prose h2[id],.prose h3[id]').length;
    expect(document.querySelectorAll('#site-toc a').length).toBe(count);
    expect(Boolean(document.querySelector('nav#site-toc[aria-labelledby="toc-title"]'))).toBe(count > 0);
    expect(Boolean(document.querySelector('[data-toc-toggle][aria-controls="site-toc"]'))).toBe(count > 0);
    if (count > 0) expect(document.querySelector('.header-actions-row')?.firstElementChild?.hasAttribute('data-toc-toggle')).toBe(true);
   }
  }
 });
 test(`${v.lang}: homepage orders galleries before a merged chronological blog`, async () => {
  const { document } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
  const sections = [...document.querySelectorAll('.home-container > section')];
  expect(sections[0].classList.contains('bio')).toBe(true);
  const headings = sections.slice(1).map(section => section.querySelector('h2')?.textContent);
  expect(headings).toEqual(v.lang === 'en' ? ['Projects', 'Research', 'Interests', 'Blog'] : ['项目', '研究', '兴趣爱好', '博客']);
  for (const meta of document.querySelectorAll('.bullet-list_meta')) expect(meta.textContent).not.toMatch(/(?:19|20)\d{2}/);
  for (const section of sections.slice(1, 4)) {
   expect(section.querySelectorAll('a[href^="http"],a[target="_blank"]')).toHaveLength(0);
   expect(section.querySelectorAll('a[href="/wip/"]')).toHaveLength(0);
   for (const item of section.querySelectorAll('.bullet-list_item')) {
    const link = item.querySelector('a');
    if (link) expect(link.getAttribute('href')).toMatch(/^\/gallery\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/);
    else expect(item.textContent).toContain(v.lang === 'en' ? 'In preparation' : '整理中');
   }
  }
  expect(sections.slice(1, 4).flatMap(section => [...section.querySelectorAll('.bullet-list_link')].map(link => link.getAttribute('href')))).toEqual(entryGallerySlugs.map(slug => `/gallery/${slug}/`));
  const blogLinks = [...sections[4].querySelectorAll('.bullet-list_link')].map(link => link.getAttribute('href')!);
  expect(new Set(blogLinks).size).toBe(blogLinks.length);
  const rss = new DOMParser().parseFromString(await readFile(join(v.root, 'rss.xml'), 'utf8'), 'text/xml');
  const feedLinks = [...rss.querySelectorAll('item > link')].map(link => new URL(link.textContent!).pathname);
  expect([...blogLinks].sort()).toEqual([...feedLinks].sort());
  const dates = await Promise.all(blogLinks.map(async href => {
   const { document: article } = parseHTML(await readFile(join(v.root, href, 'index.html'), 'utf8'));
   return Date.parse(article.querySelector('meta[property="article:published_time"]')!.getAttribute('content')!);
  }));
  expect(dates.every(Number.isFinite)).toBe(true);
  expect(dates).toEqual([...dates].sort((a, b) => b - a));
  expect(blogLinks).toContain('/essay/why-this-site/');
  expect(blogLinks).toContain('/essay/embodied-agent/');
  expect(blogLinks).toContain('/post/first-note/');
  expect(blogLinks).toContain('/post/congrats-you-hit-the-limit/');
 });
 test(`${v.lang}: responsive portrait and homepage gallery entries`, async () => {
  const { document } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
  expect(document.querySelector('h1')!.textContent).toBe(v.title);
  const picture = document.querySelector('picture')!; expect(picture).not.toBeNull();
  for (const type of ['image/avif','image/webp']) { const source = picture.querySelector(`source[type="${type}"]`); expect(source?.getAttribute('srcset')).toContain('320w'); expect(source?.getAttribute('srcset')).toContain('960w'); }
  expect(document.querySelectorAll('a[href="/wip/"]').length).toBe(0);
  expect(document.querySelector('[data-secret-src]')?.getAttribute('data-secret-src')).toBe(imageMedia('portrait-study').src);
  expect(document.querySelector('[data-secret-image-slot]')?.children.length).toBe(0);
  expect(await access(join(v.root, 'images/p-202.jpg')).then(() => true, () => false)).toBe(false);
  const homeControl = document.querySelector<HTMLAnchorElement>('.header-chat-link')!;
  expect(homeControl.getAttribute('href')).toBe('/chat/');
  expect(homeControl.getAttribute('aria-label')).toBe(v.chatLabel);
  const { document: chat } = parseHTML(await readFile(join(v.root, 'chat/index.html'), 'utf8'));
  const chatControl = chat.querySelector<HTMLAnchorElement>('.header-home-link')!;
  expect(chatControl.getAttribute('href')).toBe('/');
  expect(chatControl.getAttribute('aria-label')).toBe(v.homeLabel);
 });
 test(`${v.lang}: localized feeds, sitemap and noindex placeholders`, async () => {
  const rss = new DOMParser().parseFromString(await readFile(join(v.root,'rss.xml'), 'utf8'), 'text/xml');
  expect(rss.querySelector('channel > title')?.textContent).toBe(v.title);
  expect(rss.querySelectorAll('item').length).toBe(4);
  for (const link of rss.querySelectorAll('item > link')) expect(link.textContent).toStartWith(v.origin);
  const sitemap = await readFile(join(v.root,'sitemap-0.xml'), 'utf8'); expect(sitemap).toContain(v.origin); expect(sitemap).not.toContain('/wip'); expect(sitemap).not.toContain('/404'); expect(sitemap).not.toContain('/gallery/layout-preview/'); expect(sitemap).not.toContain('/dev/');
  const { document: preview } = parseHTML(await readFile(join(v.root, 'gallery/layout-preview/index.html'), 'utf8'));
  expect(preview.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
  expect(preview.querySelectorAll('article[data-gallery-page] figure')).toHaveLength(4);
  const { document: home } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
  expect(home.querySelector('a[href="/gallery/layout-preview/"]')).toBeNull();
  expect(await access(join(v.root, 'dev/gallery/layout-preview/index.html')).then(() => true, () => false)).toBe(false);
  expect(await readFile(join(v.root,'robots.txt'),'utf8')).toContain(`Sitemap: ${v.origin}/sitemap-index.xml`);
  for (const page of ['wip/index.html','404.html']) { const { document } = parseHTML(await readFile(join(v.root,page),'utf8')); expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex'); }
 });
}

for (const v of variants) {
 test(`${v.lang}: all homepage galleries expose distinct pages with indexing appropriate to their preview status`, async () => {
  const locale = v.lang === 'en' ? 'en' : 'zh';
  const sitemap = new DOMParser().parseFromString(await readFile(join(v.root, 'sitemap-0.xml'), 'utf8'), 'text/xml');
  const locations = [...sitemap.querySelectorAll('url > loc')].map(loc => loc.textContent);
  const { document: home } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
  for (const slug of entryGallerySlugs) {
   const href = `/gallery/${slug}/`;
   const page = join(v.root, href, 'index.html');
   expect(await access(page).then(() => true, () => false)).toBe(true);
   const source = JSON.parse(await readFile(`src/content/galleries/${slug}/${locale}.json`, 'utf8'));
   const { document } = parseHTML(await readFile(page, 'utf8'));
   const article = document.querySelector('article[data-gallery-page]')!;
   expect(article).not.toBeNull();
   expect(article.querySelector('h1')?.textContent).toBe(source.title);
   expect(home.querySelectorAll(`a[href="${href}"]`)).toHaveLength(1);
   expect(home.querySelector(`a[href="${href}"]`)?.textContent).toBe(source.title);
   const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
   if (source.preview) {
    expect(robots).toContain('noindex');
    expect(locations).not.toContain(v.origin + href);
   } else {
    expect(robots).not.toContain('noindex');
    expect(locations).toContain(v.origin + href);
   }
   expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(v.origin + href);
   const figures = [...article.querySelectorAll('.gallery-grid > figure')];
   expect(figures).toHaveLength(source.images.length);
   expect(figures.length).toBeGreaterThan(0);
   for (const [index, figure] of figures.entries()) {
    expect(figure.querySelector('figcaption')?.textContent).toBe(source.images[index].caption);
    expect(figure.querySelector('img')?.getAttribute('alt')).toBe(source.images[index].alt);
    const asset = imageMedia(source.images[index].src);
    const original = figure.querySelector('a[data-gallery-image]')!;
    expect(original.getAttribute('href')).toBe(asset.src);
    expect(Number(original.getAttribute('data-width'))).toBe(asset.width);
    expect(Number(original.getAttribute('data-height'))).toBe(asset.height);
    expect(mediaPaths.has(figure.querySelector('img')!.getAttribute('src')!)).toBe(true);
    for (const type of ['image/avif', 'image/webp']) {
     const resource = figure.querySelector(`source[type="${type}"]`)?.getAttribute('srcset');
     expect(resource).toBeTruthy();
     for (const candidate of resource!.split(',')) expect(mediaPaths.has(candidate.trim().split(/\s+/)[0])).toBe(true);
    }
   }
   const links = [...article.querySelectorAll('.gallery-links a')];
   expect(links.map(link => ({label: link.textContent, href: link.getAttribute('href')}))).toEqual(source.links);
   for (const link of links) {
    expect(link.getAttribute('href')).toMatch(/^https?:\/\//);
    expect(link.getAttribute('rel')).toContain('noopener');
   }
  }
 });
}

for (const v of variants) {
 test(`${v.lang}: LeDA replaces its placeholder with two native demos and its national-level certificate`, async () => {
  const { document } = parseHTML(await readFile(join(v.root, 'gallery/leda-agent/index.html'), 'utf8'));
  const source = JSON.parse(await readFile(`src/content/galleries/leda-agent/${v.lang === 'en' ? 'en' : 'zh'}.json`, 'utf8'));
  expect(document.querySelectorAll('#gallery-videos-heading')).toHaveLength(0);
  expect(document.querySelector('.gallery-videos')?.getAttribute('aria-labelledby')).toBeNull();
  expect(document.querySelector('.gallery-videos')?.getAttribute('aria-label')).toBe(v.lang === 'en' ? 'Videos' : '视频');
  expect(document.querySelectorAll('.gallery-video-grid h2, .gallery-video-grid h3')).toHaveLength(0);
  expect(document.querySelectorAll('.gallery-video-demos')).toHaveLength(1);
  const videos = [...document.querySelectorAll('video')];
  expect(videos).toHaveLength(2);
  for (const [index, video] of videos.entries()) {
   expect(video.hasAttribute('controls')).toBe(true);
   expect(video.hasAttribute('playsinline')).toBe(true);
   expect(video.hasAttribute('autoplay')).toBe(false);
   expect(video.getAttribute('preload')).toBe('metadata');
   expect(mediaPaths.has(video.querySelector('source')!.getAttribute('src')!)).toBe(true);
   expect(video.querySelector('source')!.getAttribute('type')).toBe('video/mp4');
   expect(mediaPaths.has(video.getAttribute('poster')!)).toBe(true);
   expect(video.getAttribute('aria-label')).toContain(source.videos[index].label);
   expect(video.closest('figure')?.textContent).toContain(source.videos[index].caption);
   expect(video.closest('figure')?.querySelector('a[download]')?.getAttribute('href')).toBe(video.querySelector('source')!.getAttribute('src'));
  }
  const certificate = document.querySelectorAll('a[data-gallery-image]');
  expect(certificate).toHaveLength(1);
  expect(certificate[0]?.getAttribute('data-alt')).toBe(source.images[0].alt);
  expect(document.querySelectorAll('.gallery-results-heading, .gallery-comparison, article table')).toHaveLength(0);
  expect(document.querySelector('.gallery-description')?.textContent).toBe(source.description);
  const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);
  expect(schema.video).toHaveLength(2);
  for (const [index, clip] of schema.video.entries()) {
   expect(clip['@type']).toBe('VideoObject');
   expect(clip.contentUrl).toBe(v.origin+videos[index].querySelector('source')!.getAttribute('src'));
   expect(clip.thumbnailUrl).toBe(v.origin+videos[index].getAttribute('poster'));
   expect(clip.duration).toBe(`PT${source.videos[index].duration}S`);
   expect(clip.uploadDate).toBe(source.videos[index].uploadDate);
  }
  for (const link of source.links) expect(document.querySelectorAll(`a[href="${link.href}"]`)).toHaveLength(1);
 });
 test(`${v.lang}: B-Spline videos and results remain crawlable native HTML without JavaScript`, async () => {
  const { document } = parseHTML(await readFile(join(v.root, 'gallery/b-spline-policy/index.html'), 'utf8'));
  const source = JSON.parse(await readFile(`src/content/galleries/b-spline-policy/${v.lang === 'en' ? 'en' : 'zh'}.json`, 'utf8'));
  expect(document.querySelector('#gallery-videos-heading')?.textContent).toBe(v.lang === 'en' ? 'Simulation results' : '模拟器结果');
  expect(document.querySelectorAll('.gallery-video-demos')).toHaveLength(0);
  const videos = [...document.querySelectorAll('video')];
  expect(videos).toHaveLength(3);
  for (const [index, video] of videos.entries()) {
   expect(video.hasAttribute('controls')).toBe(true);
   expect(video.hasAttribute('playsinline')).toBe(true);
   expect(video.hasAttribute('autoplay')).toBe(false);
   expect(video.getAttribute('preload')).toBe('metadata');
   expect(mediaPaths.has(video.querySelector('source')!.getAttribute('src')!)).toBe(true);
   expect(video.querySelector('source')!.getAttribute('type')).toBe('video/mp4');
   expect(mediaPaths.has(video.getAttribute('poster')!)).toBe(true);
   expect(video.getAttribute('aria-label')).toContain(source.videos[index].label);
   expect(video.closest('figure')?.textContent).toContain(source.videos[index].caption);
   expect(video.closest('figure')?.querySelector('a[download]')?.getAttribute('href')).toBe(video.querySelector('source')!.getAttribute('src'));
   expect(video.closest('figure')?.querySelector('a[data-gallery-image]')).toBeNull();
  }
  expect(document.querySelectorAll('article table')).toHaveLength(0);
  expect(document.querySelector('.gallery-comparison p')?.textContent).toBe(source.comparison.description);
  const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);
  expect(schema.video).toHaveLength(3);
  for (const [index, video] of schema.video.entries()) {
   expect(video['@type']).toBe('VideoObject');
   expect(video.contentUrl).toBe(v.origin+videos[index].querySelector('source')!.getAttribute('src'));
   expect(video.thumbnailUrl).toBe(v.origin+videos[index].getAttribute('poster'));
   expect(video.duration).toBe(`PT${source.videos[index].duration}S`);
   expect(video.uploadDate).toBe(source.videos[index].uploadDate);
  }
  expect(document.querySelector('a[href="https://arxiv.org/abs/2607.09648"]')).not.toBeNull();
  expect(document.querySelector('a[href="https://github.com/Siyuan-Xue/openpi05-bsp"]')).not.toBeNull();
 });
}
