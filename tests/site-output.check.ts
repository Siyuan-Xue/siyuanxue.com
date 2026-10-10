import { expect, test } from 'bun:test';
import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { parseHTML, DOMParser } from 'linkedom';
const variants = [
 { root: 'dist', lang: 'en', origin: 'https://siyuanxue.com', other: 'https://xuesiyuan.com', title: 'Siyuan Xue', chatLabel: 'Chat with xue', homeLabel: 'Home' },
 { root: 'dist/zh', lang: 'zh-CN', origin: 'https://xuesiyuan.com', other: 'https://siyuanxue.com', title: '薛思远', chatLabel: '与小薛聊聊', homeLabel: '首页' },
];
const entryGallerySlugs = ['probfun', 'imathbook', 'leda-agent', 'pixeldone', 'bnds-life', 'yuheng', 'walking-with-light', 'volleyball'];
async function htmlFiles(root: string): Promise<string[]> { const result: string[] = []; for (const file of await readdir(root, { withFileTypes: true })) { if (file.name === 'zh' || file.name === '_astro') continue; const path = join(root, file.name); if (file.isDirectory()) result.push(...await htmlFiles(path)); else if (path.endsWith('.html')) result.push(path); } return result; }
for (const v of variants) {
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
 test(`${v.lang}: shipped theme controls work when browser storage throws`, async () => {
  const { document } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
  const storage = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };
  const context = createContext({ document, window: document.defaultView, localStorage: storage, matchMedia: () => ({ matches: false }) });
  for (const script of document.querySelectorAll('script:not([src])')) {
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
  expect(themeColor?.getAttribute('content')).toBe('#1f1e1d');
  expect(colorScheme?.getAttribute('content')).toBe('dark');
  button.click();
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(document.documentElement.classList.contains('u-mode-invert')).toBe(false);
  expect(themeColor?.getAttribute('content')).toBe('#f0eee6');
  expect(colorScheme?.getAttribute('content')).toBe('light');
 });
 for (const [saved, systemDark, expectedDark] of [
  ['dark', false, true], ['light', true, false], [null, true, true], [null, false, false],
 ] as const) {
  test(`${v.lang}: theme at first paint respects saved=${saved}, systemDark=${systemDark}`, async () => {
   const { document } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
   const context = createContext({ document, window: document.defaultView, localStorage: { getItem: () => saved }, matchMedia: () => ({ matches: systemDark }) });
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
  let saved = 'light';
  const context = createContext({ document, window, localStorage: { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } }, matchMedia: () => ({ matches: false }) });
  for (const script of document.querySelectorAll('script:not([src])')) {
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
   expect(document.documentElement.lang).toBe(v.lang);
   expect(document.querySelectorAll('meta[name="theme-color"]').length).toBe(1);
   expect(document.querySelectorAll('meta[name="color-scheme"]').length).toBe(1);
   expect(document.querySelectorAll('h1').length).toBe(1);
   expect(document.querySelectorAll('.i18n-en,.i18n-zh,.lang-body-en,.lang-body-zh,[data-page-boot]').length).toBe(0);
   expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(v.origin + pathname);
   expect(document.querySelector('a.lang-toggle')).toBeNull();
   if (pathname !== '/') expect(document.querySelector('.header-home-link')?.getAttribute('href')).toBe('/');
   expect(document.querySelector('link[hreflang="en"]')?.getAttribute('href')).toBe('https://siyuanxue.com' + pathname);
   expect(document.querySelector('link[hreflang="zh-CN"]')?.getAttribute('href')).toBe('https://xuesiyuan.com' + pathname);
   expect(document.querySelector('link[hreflang="x-default"]')?.getAttribute('href')).toBe('https://siyuanxue.com' + pathname);
   const shareUrl = document.querySelector('meta[property="og:image"]')!.getAttribute('content')!;
   expect(new URL(shareUrl).origin).toBe(v.origin);
   if (document.querySelector('article[data-gallery-page]')) {
    await access(join(v.root, new URL(shareUrl).pathname));
    expect(Number(document.querySelector('meta[property="og:image:width"]')?.getAttribute('content'))).toBeGreaterThan(0);
    expect(Number(document.querySelector('meta[property="og:image:height"]')?.getAttribute('content'))).toBeGreaterThan(0);
    expect(document.querySelector('meta[property="og:image:alt"]')?.getAttribute('content')).toBeTruthy();
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(shareUrl);
   } else {
    expect(shareUrl).toContain(v.origin + '/images/share-');
    const share = await readFile(join(v.root, new URL(shareUrl).pathname)); expect(share.readUInt32BE(16)).toBe(1200); expect(share.readUInt32BE(20)).toBe(630);
   }
   expect(document.querySelectorAll('link[rel="preload"][as="font"]').length).toBe(0);
   const styles = (await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map(node => readFile(join(v.root, node.getAttribute('href')!), 'utf8')))).join('');
   expect(styles.includes('noto-serif-sc-')).toBe(v.lang === 'zh-CN');
   for (const source of document.querySelectorAll('[srcset]')) for (const candidate of source.getAttribute('srcset')!.split(',')) await access(join(v.root, candidate.trim().split(/\s+/)[0]));
   for (const node of document.querySelectorAll('script[src],link[rel="stylesheet"],img[src]')) { const url = node.getAttribute('src') ?? node.getAttribute('href'); if (url?.startsWith('/')) await access(join(v.root, url)); }
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
    const figures = document.querySelectorAll('article[data-gallery-page] figure');
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
    expect(document.querySelectorAll('.toc-desktop a').length).toBe(count);
    expect(Boolean(document.querySelector('dialog#site-toc'))).toBe(count > 0);
   }
  }
 });
 test(`${v.lang}: homepage orders galleries before a merged chronological blog`, async () => {
  const { document } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
  const sections = [...document.querySelectorAll('.home-container > section')];
  expect(sections[0].classList.contains('bio')).toBe(true);
  const headings = sections.slice(1).map(section => section.querySelector('h2')?.textContent);
  expect(headings).toEqual(v.lang === 'en' ? ['Projects', 'Research', 'Interests', 'Blog'] : ['项目', '研究', '兴趣爱好', '博客']);
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
  expect(blogLinks).toContain('/post/first-note/');
  expect(blogLinks).toContain('/post/congrats-you-hit-the-limit/');
 });
 test(`${v.lang}: responsive portrait and homepage gallery entries`, async () => {
  const { document } = parseHTML(await readFile(join(v.root, 'index.html'), 'utf8'));
  expect(document.querySelector('h1')!.textContent).toBe(v.title);
  const picture = document.querySelector('picture')!; expect(picture).not.toBeNull();
  for (const type of ['image/avif','image/webp']) { const source = picture.querySelector(`source[type="${type}"]`); expect(source?.getAttribute('srcset')).toContain('320w'); expect(source?.getAttribute('srcset')).toContain('960w'); }
  expect(document.querySelectorAll('a[href="/wip/"]').length).toBe(0);
  expect(document.querySelector('[data-secret-src]')?.getAttribute('data-secret-src')).toBe('/images/romantic-placeholder-blue-study.webp');
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
  expect(rss.querySelectorAll('item').length).toBe(3);
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
   const figures = [...article.querySelectorAll('figure')];
   expect(figures).toHaveLength(source.images.length);
   expect(figures.length).toBeGreaterThan(0);
   for (const [index, figure] of figures.entries()) {
    expect(figure.querySelector('figcaption')?.textContent).toBe(source.images[index].caption);
    expect(figure.querySelector('img')?.getAttribute('alt')).toBe(source.images[index].alt);
    await access(join(v.root, figure.querySelector('a[data-gallery-image]')!.getAttribute('href')!));
    for (const type of ['image/avif', 'image/webp']) {
     const resource = figure.querySelector(`source[type="${type}"]`)?.getAttribute('srcset');
     expect(resource).toBeTruthy();
     for (const candidate of resource!.split(',')) await access(join(v.root, candidate.trim().split(/\s+/)[0]));
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
