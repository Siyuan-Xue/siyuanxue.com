import { expect, test } from 'bun:test';
import { z } from 'astro/zod';
import { createGallerySchema, pairGalleries, galleryHomeItems, type GalleryComparison } from '../src/utils/gallery';
import { mergeBlogEntries } from '../src/utils/blog';
import { bi } from '../src/i18n/types';
const file = { src: '/image.webp', width: 10, height: 10, format: 'webp' as const, sha256: 'a'.repeat(64), bytes: 100 };
const data = { title: 'Title', description: 'Description', period: '2026', role: 'Author', category: 'projects' as const, order: 0, draft: false, preview: false, images: [{ src: { ...file, kind: 'image' as const, variants: [file], cover: file }, alt: 'Image', caption: 'Caption' }], links: [] };
const entry = (id: string, changes = {}) => ({ id, data: { ...data, ...changes } });
test('gallery schema rejects empty images, whitespace text and unsafe links; defaults to draft', () => {
 const schema = createGallerySchema(z.object({ src: z.string(), width: z.number(), height: z.number(), format: z.literal('webp') }));
 expect(schema.safeParse({ ...data, images: [] }).success).toBe(false);
 expect(schema.safeParse({ ...data, title: ' ' }).success).toBe(false);
 expect(schema.safeParse({ ...data, links: [{ label: 'Source', href: 'javascript:alert(1)' }] }).success).toBe(false);
 const { draft, order, ...rest } = data;
 expect(schema.parse(rest)).toMatchObject({ draft: true, order: 0 });
});
test('ongoing galleries can omit period but cannot publish blank period text', () => {
 const schema = createGallerySchema(z.object({ src: z.string(), width: z.number(), height: z.number(), format: z.literal('webp') }));
 const { period, ...ongoing } = data;
 expect(schema.safeParse(ongoing).success).toBe(true);
 expect(schema.safeParse({ ...data, period: ' ' }).success).toBe(false);
});
test('translations agree on whether the homepage and gallery show a period', () => {
 expect(() => pairGalleries([entry('ongoing/en', { period: undefined }), entry('ongoing/zh')], 'en')).toThrow('period');
 expect(pairGalleries([entry('ongoing/en', { period: undefined }), entry('ongoing/zh', { period: undefined })], 'en')).toHaveLength(1);
});
test('only complete bilingual galleries publish; either draft isolates both', () => {
 expect(pairGalleries([entry('one/en'), entry('one/zh', { draft: true })], 'en')).toEqual([]);
 expect(() => pairGalleries([entry('one/en')], 'en')).toThrow('translation');
 expect(pairGalleries([entry('one/en', { draft: true })], 'en')).toEqual([]);
 expect(pairGalleries([entry('one/en'), entry('one/zh', { draft: true })], 'zh', true)[0].entry.id).toBe('one/zh');
});
test('gallery category/order and stable slug are validated across translations', () => {
 expect(() => pairGalleries([entry('one/en'), entry('one/zh', { order: 1 })], 'en')).toThrow('order');
 expect(() => pairGalleries([entry('one/en'), entry('one/zh', { category: 'research' })], 'en')).toThrow('category');
 expect(() => pairGalleries([entry('Bad--slug/en')], 'en')).toThrow('id');
});
test('published galleries replace source links once; unpublished entries remain preparation', () => {
 const source = [{ title: bi('Old', '旧'), href: 'https://example.com', gallerySlug: 'one', external: true }, { title: bi('Pending', '待补'), href: 'https://example.org', gallerySlug: 'two' }];
 const items = galleryHomeItems(source, [{ slug: 'one', entry: entry('one/en') }, { slug: 'new', entry: entry('new/en') }], 'projects', 'en');
 expect(items.map(item => item.href)).toEqual(['/gallery/one/', '/wip/', '/gallery/new/']);
 expect(items[0].title).toBe('Title');
 expect(items.every(item => !item.external)).toBe(true);
 expect(source[0].href).toBe('https://example.com');
});
test('blog preserves kind and same-slug identities; date ties sort consistently', () => {
 const article = (slug: string, date: string) => ({ slug, entry: { id: `${slug}/en`, data: { date: new Date(date) } } });
 const result = mergeBlogEntries([article('same', '2026-01-01')], [article('same', '2026-01-01'), article('new', '2026-02-01')]);
 expect(result.map(item => item.href)).toEqual(['/post/new/', '/essay/same/', '/post/same/']);
 expect(result.map(item => item.kind)).toEqual(['post', 'essay', 'post']);
});

test('gallery preview defaults false and accepts explicit placeholder publication', () => {
 const schema = createGallerySchema(z.object({ src: z.string(), width: z.number(), height: z.number(), format: z.literal('webp') }));
 const { preview, ...real } = data;
 expect(schema.parse(real)).toMatchObject({ preview: false });
 expect(schema.parse({ ...real, preview: true, draft: false })).toMatchObject({ preview: true, draft: false });
});
test('bilingual placeholder status must agree before a gallery can publish', () => {
 expect(() => pairGalleries([entry('sample/en', { preview: true }), entry('sample/zh')], 'en')).toThrow('preview');
 expect(() => pairGalleries([entry('sample/en'), entry('sample/zh', { preview: true })], 'zh')).toThrow('preview');
 const pair = [entry('sample/en', { preview: true }), entry('sample/zh', { preview: true })];
 expect(pairGalleries(pair, 'en')[0].entry.id).toBe('sample/en');
 expect(pairGalleries(pair, 'zh')[0].entry.id).toBe('sample/zh');
 expect(pairGalleries([entry('sample/en', { preview: true, draft: true }), entry('sample/zh', { preview: true })], 'en')).toEqual([]);
});
test('product gallery layout survives content parsing while existing galleries keep their photo layout', () => {
 const schema = createGallerySchema(z.object({ src: z.string(), width: z.number(), height: z.number(), format: z.literal('webp') }));
 expect(schema.parse({ ...data, layout: 'product' }).layout).toBe('product');
 expect(schema.parse(data).layout).toBe('photos');
});
test('gallery translations cannot publish with conflicting layouts', () => {
 expect(() => pairGalleries([entry('sample/en', { layout: 'product' }), entry('sample/zh')], 'en')).toThrow('layout');
 expect(pairGalleries([entry('sample/en', { layout: 'photos' }), entry('sample/zh')], 'en')).toHaveLength(1);
});
test('published placeholder galleries are reachable from their existing homepage entries', () => {
 const sources = [{ title: bi('Source', '来源'), href: 'https://example.com', gallerySlug: 'sample' }];
 const items = galleryHomeItems(sources, [{ slug: 'sample', entry: entry('sample/en', { preview: true }) }], 'projects', 'en');
 expect(items.map(item => item.href)).toEqual(['/gallery/sample/']);
 expect(items[0].title).toBe(data.title);
});

const video = { src: { src: '/media/movie.mp4', kind: 'video' as const, format: 'mp4' as const, bytes: 100, sha256: 'a'.repeat(64) }, poster: data.images[0].src, label: '1×', caption: 'Normal-speed simulation result', duration: 10, uploadDate: '2026-10-11' };
test('gallery accepts optional native videos and a results summary while requiring a poster and valid metadata', () => {
 const schema = createGallerySchema(z.object({ src: z.string(), kind: z.literal('image') }), z.object({ src: z.string(), kind: z.literal('video') }));
 const comparison: GalleryComparison = { title: 'Real robot results', description: 'Observed chunk boundary jumps' };
 const parsed = schema.parse({ ...data, videos: [video], videoDescription: 'Compare these recordings', comparison });
 expect(parsed.videos[0].label).toBe('1×');
 expect(parsed.videos[0].src.kind).toBe('video');
 expect(parsed.comparison).toEqual(comparison);
 expect(schema.parse(data).videos).toEqual([]);
 for (const change of [{ poster: undefined }, { duration: 0 }, { uploadDate: 'not-a-date' }]) expect(schema.safeParse({ ...data, videos: [{ ...video, ...change }] }).success).toBe(false);
 expect(schema.safeParse({ ...data, comparison: { ...comparison, description: '' } }).success).toBe(false);
});
test('bilingual galleries reject mismatched video recordings or ordering', () => {
 const pair = [entry('demo/en', { videos: [video] }), entry('demo/zh', { videos: [video] })];
 expect(pairGalleries(pair, 'en')).toHaveLength(1);
 expect(() => pairGalleries([pair[0], entry('demo/zh')], 'en')).toThrow('videos');
 const other = { ...video, src: { ...video.src, src: '/media/other.mp4' } };
 expect(() => pairGalleries([pair[0], entry('demo/zh', { videos: [other] })], 'en')).toThrow('videos');
});

test('video sections accept their own heading and demo layout without changing simulation defaults', () => {
 const schema = createGallerySchema(z.object({ src: z.string(), kind: z.literal('image') }), z.object({ src: z.string(), kind: z.literal('video') }));
 expect(schema.parse({ ...data, videos: [video], videoTitle: 'Demos and knowledge graph', videoLayout: 'demos' })).toMatchObject({ videoTitle: 'Demos and knowledge graph', videoLayout: 'demos' });
 expect(schema.parse(data).videoLayout).toBe('comparison');
 expect(schema.safeParse({ ...data, videoTitle: ' ' }).success).toBe(false);
 expect(schema.safeParse({ ...data, videoLayout: 'invalid' }).success).toBe(false);
 expect(schema.parse({ ...data, videoTitle: null }).videoTitle).toBeNull();
});

test('bilingual galleries cannot publish with different video layouts', () => {
 expect(() => pairGalleries([entry('demo/en', { videoLayout: 'demos' }), entry('demo/zh')], 'en')).toThrow('video layout');
 expect(pairGalleries([entry('demo/en', { videoLayout: 'comparison' }), entry('demo/zh')], 'en')).toHaveLength(1);
});

test('bilingual galleries agree on whether their video section heading is visible', () => {
 expect(() => pairGalleries([entry('demo/en', { videoTitle: null }), entry('demo/zh')], 'en')).toThrow('video heading');
 expect(pairGalleries([entry('demo/en', { videoTitle: null }), entry('demo/zh', { videoTitle: null })], 'en')).toHaveLength(1);
});

test('image sections preserve titles and valid boundaries; incomplete or overlapping groups cannot publish', () => {
 const schema = createGallerySchema(z.object({ src: z.string(), width: z.number(), height: z.number(), format: z.literal('webp') }));
 const images = Array.from({ length: 10 }, () => data.images[0]);
 const imageSections = [{ title: 'University team', start: 0 }, { title: 'College team', start: 4 }];
 expect(schema.parse({ ...data, images, imageSections }).imageSections).toEqual(imageSections);
 expect(schema.parse(data).imageSections).toEqual([]);
 for (const sections of [
  [{ title: 'Missing first group', start: 1 }],
  [{ title: 'First', start: 0 }, { title: 'Duplicate boundary', start: 0 }],
  [{ title: 'First', start: 0 }, { title: 'Outside images', start: 10 }],
  [{ title: 'First', start: 0 }, { title: 'Later', start: 7 }, { title: 'Out of order', start: 4 }],
  [{ title: ' ', start: 0 }],
 ]) expect(schema.safeParse({ ...data, images, imageSections: sections }).success).toBe(false);
});

test('translations keep image section boundaries and photographs aligned while translating headings', () => {
 const images = [data.images[0], { ...data.images[0], src: { ...data.images[0].src, src: '/second.webp' } }];
 const en = entry('teams/en', { images, imageSections: [{ title: 'University', start: 0 }, { title: 'College', start: 1 }] });
 const zh = entry('teams/zh', { images, imageSections: [{ title: '校队', start: 0 }, { title: '院队', start: 1 }] });
 expect(pairGalleries([en, zh], 'zh')[0].entry.id).toBe('teams/zh');
 expect(() => pairGalleries([en, entry('teams/zh', { images })], 'en')).toThrow('image sections');
 expect(() => pairGalleries([en, entry('teams/zh', { images, imageSections: [{ title: '校队', start: 0 }] })], 'en')).toThrow('image sections');
 expect(() => pairGalleries([en, { ...zh, data: { ...zh.data, images: [...images].reverse() } }], 'en')).toThrow('section images');
});
