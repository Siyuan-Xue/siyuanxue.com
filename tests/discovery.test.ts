import { expect, test } from 'bun:test';
import { buildDiscoveryInventory, pageSitemap, imageSitemap, videoSitemap, auditDiscoveryHtml, contentDigest, collectReferencedMedia } from '../src/utils/discovery';
import { imageMedia, media } from '../src/utils/media';

const article = (id: string, changes = {}) => ({ id, data: { title: 'Article', description: 'Visible summary', seoDescription: 'Search summary', date: new Date('2026-01-02'), draft: false, ...changes } });
const photo = imageMedia('portrait');
const gallery = (id: string, changes = {}) => ({ id, data: { title: 'Gallery', description: 'Gallery description', role: 'Author', category: 'projects' as const, order: 0, draft: false, images: [{ src: photo, alt: 'Portrait', caption: 'Public photograph' }], links: [], ...changes } });
const source = () => ({ essay: [article('new/en'), article('new/zh')], post: [], gallery: [gallery('work/en'), gallery('work/zh')] });

test('new paired content joins discovery automatically; edits and removal are reflected without a slug list', () => {
 const inputs = source();
 const entries = buildDiscoveryInventory(inputs, 'en');
 const page = entries.find(page => page.path === '/essay/new/')!;
 expect(page).toMatchObject({ canonical: 'https://siyuanxue.com/essay/new/', description: 'Search summary', datePublished: '2026-01-02T00:00:00.000Z', indexable: true });
 expect(page.alternates).toEqual({ en: 'https://siyuanxue.com/essay/new/', 'zh-CN': 'https://xuesiyuan.com/essay/new/', 'x-default': 'https://siyuanxue.com/essay/new/' });
 inputs.essay[0].data.seoDescription = 'Revised search summary';
 expect(buildDiscoveryInventory(inputs, 'en').find(page => page.path === '/essay/new/')?.description).toBe('Revised search summary');
 inputs.essay = [];
 expect(buildDiscoveryInventory(inputs, 'en').some(page => page.path === '/essay/new/')).toBe(false);
});

test('untranslated publication fails, either draft stays private, and previews have no sitemap or media entries', () => {
 expect(() => buildDiscoveryInventory({ ...source(), essay: [article('new/en')] }, 'en')).toThrow('translation');
 const entries = buildDiscoveryInventory({ ...source(), essay: [article('new/en', { draft: true })], gallery: [gallery('sample/en', { preview: true }), gallery('sample/zh', { preview: true })] }, 'en');
 expect(entries.some(page => page.path === '/essay/new/')).toBe(false);
 expect(entries.find(page => page.path === '/gallery/sample/')?.indexable).toBe(false);
 for (const sitemap of [pageSitemap(entries), imageSitemap(entries), videoSitemap(entries).xml]) expect(sitemap).not.toContain('/gallery/sample/');
 expect(entries.find(page => page.path === '/chat/')?.indexable).toBe(true);
 expect(entries.find(page => page.path === '/gallery/probfun/')?.canonical).toBe('https://siyuanxue.com/gallery/imathbook/');
});

test('sitemaps have reciprocal alternate links, truthful dates, and only original public image URLs', () => {
 const entries = buildDiscoveryInventory(source(), 'zh');
 const pages = pageSitemap(entries);
 expect(pages).toContain('hreflang="en" href="https://siyuanxue.com/essay/new/"');
 expect(pages).toContain('<lastmod>2026-01-02T00:00:00.000Z</lastmod>');
 expect(pages).not.toContain('/wip/');
 const images = imageSitemap(entries);
 expect(images).toContain(`https://xuesiyuan.com${photo.src}`);
 for (const variant of photo.variants) if (variant.src !== photo.src) expect(images).not.toContain(variant.src);
 expect(videoSitemap(entries)).toEqual({ xml: expect.any(String), omitted: [] });
});

test('unknown generated routes fail the audit and semantic hashes ignore build assets while tracking public content', () => {
 const entries = buildDiscoveryInventory(source(), 'en');
 expect(() => auditDiscoveryHtml('/new-kind/', '<html></html>', entries)).toThrow('Unregistered');
 const a = '<html><head><meta name="description" content="Summary"><script src="/a.js"></script></head><body><main><h1>Public content</h1></main></body></html>';
 expect(contentDigest(a)).toBe(contentDigest(a.replace('/a.js', '/b.js')));
 expect(contentDigest(a)).not.toBe(contentDigest(a.replace('Public content', 'Edited content')));
});

test('video sitemap omits incomplete metadata with a report rather than inventing upload dates', () => {
 const entries = buildDiscoveryInventory(source(), 'en');
 const page = entries.find(page => page.path === '/gallery/work/')!;
 page.videos = [{ src: '/media/movie.mp4', poster: photo.src, name: 'Demonstration', description: 'A public demonstration', duration: 5, uploadDate: '' }];
 const incomplete = videoSitemap(entries);
 expect(incomplete.xml).not.toContain('/media/movie.mp4');
 expect(incomplete.omitted).toEqual(['https://siyuanxue.com/gallery/work/: /media/movie.mp4 — missing or invalid required video metadata']);
 page.videos[0].uploadDate = '2026-10-11';
 expect(videoSitemap(entries).xml).toContain('<video:publication_date>2026-10-11</video:publication_date>');
});

test('rendered article images resolve responsive variants to originals and noindex media stays out', () => {
 const entries = buildDiscoveryInventory(source(), 'en');
 const page = entries.find(page => page.path === '/essay/new/')!;
 const html = `<main><picture><img src="${photo.variants[0].src}" alt="Article photograph"></picture></main>`;
 collectReferencedMedia(page, html);
 expect(page.images).toEqual([{ src: photo.src, width: photo.width, height: photo.height, alt: 'Article photograph', caption: 'Article photograph' }]);
 const preview = entries.find(page => page.path === '/wip/')!;
 collectReferencedMedia(preview, html);
 expect(preview.images).toEqual([]);
 expect(imageSitemap(entries)).toContain('<loc>https://siyuanxue.com/essay/new/</loc>');
});

const movie = media['leda-agent/agent-demo'];
const articleVideo = (source: string, attributes = 'data-upload-date="2026-10-10" data-duration="12.5"') => `<main><figure><video aria-label="Agent demonstration" poster="${photo.src}" ${attributes}>${source}</video><figcaption>A public agent demonstration.</figcaption></figure></main>`;

test.each(['direct', 'source'])('rendered article video with %s source enters the video sitemap from explicit public metadata', mode => {
 const entries = buildDiscoveryInventory(source(), 'en');
 const page = entries.find(page => page.path === '/essay/new/')!;
 const html = mode === 'source' ? articleVideo(`<source src="${movie.src}" type="video/mp4">`) : articleVideo('').replace('<video ', `<video src="${movie.src}" `);
 collectReferencedMedia(page, html);
 expect(page.videos).toEqual([{ src: movie.src, poster: `https://siyuanxue.com${photo.src}`, name: 'Agent demonstration', description: 'A public agent demonstration.', duration: 12.5, uploadDate: '2026-10-10' }]);
 const sitemap = videoSitemap(entries);
 expect(sitemap.omitted).toEqual([]);
 expect(sitemap.xml).toContain('<loc>https://siyuanxue.com/essay/new/</loc>');
 expect(sitemap.xml).toContain(`<video:content_loc>https://siyuanxue.com${movie.src}</video:content_loc>`);
 expect(sitemap.xml).toContain('<video:publication_date>2026-10-10</video:publication_date>');
});

test('rendered article videos without a real upload date are reported, including unregistered public URLs', () => {
 const entries = buildDiscoveryInventory(source(), 'en');
 const page = entries.find(page => page.path === '/essay/new/')!;
 collectReferencedMedia(page, articleVideo(`<source src="${movie.src}">`, 'data-duration="12.5"'));
 collectReferencedMedia(page, articleVideo('<source src="https://example.com/public-demo.mp4">', ''));
 expect(page.videos).toHaveLength(2);
 expect(page.videos[0].uploadDate).toBeUndefined();
 expect(page.videos[1].duration).toBeUndefined();
 const result = videoSitemap(entries);
 expect(result.xml).not.toContain('<video:video>');
 expect(result.omitted).toEqual([
  `https://siyuanxue.com/essay/new/: ${movie.src} — missing or invalid required video metadata`,
  'https://siyuanxue.com/essay/new/: https://example.com/public-demo.mp4 — missing or invalid required video metadata',
 ]);
});

test('rendered video dates cannot roll an impossible calendar day into a fabricated upload date', () => {
 const entries = buildDiscoveryInventory(source(), 'en');
 const page = entries.find(page => page.path === '/essay/new/')!;
 collectReferencedMedia(page, articleVideo(`<source src="${movie.src}">`, 'data-upload-date="2026-02-30" data-duration="12.5"'));
 const result = videoSitemap(entries);
 expect(result.xml).not.toContain('<video:video>');
 expect(result.omitted).toHaveLength(1);
});

test('rendered video collection keeps existing gallery metadata once and excludes noindex pages', () => {
 const entries = buildDiscoveryInventory(source(), 'en');
 const page = entries.find(page => page.path === '/gallery/work/')!;
 const existing = { src: movie.src, poster: photo.src, name: 'Gallery demonstration', description: 'Gallery caption', duration: 10, uploadDate: '2026-10-09' };
 page.videos = [{ ...existing }];
 const html = articleVideo(`<source src="https://siyuanxue.com${movie.src}"><source src="https://example.com/alternate.webm">`);
 collectReferencedMedia(page, html);
 expect(page.videos).toEqual([existing]);
 expect(videoSitemap(entries).xml.match(/<video:video>/g)).toHaveLength(1);
 const noindex = entries.find(page => page.path === '/wip/')!;
 collectReferencedMedia(noindex, html);
 expect(noindex.videos).toEqual([]);
});

test('rendered videos accept public HTTP URLs only and their explicit metadata affects the content hash', () => {
 const page = buildDiscoveryInventory(source(), 'en').find(page => page.path === '/essay/new/')!;
 for (const url of ['javascript:alert(1)', 'data:video/mp4;base64,AAAA', 'file:///private/movie.mp4']) collectReferencedMedia(page, articleVideo(`<source src="${url}">`));
 expect(page.videos).toEqual([]);
 const html = articleVideo(`<source src="${movie.src}">`);
 expect(contentDigest(html)).not.toBe(contentDigest(html.replace('2026-10-10', '2026-10-11')));
});
