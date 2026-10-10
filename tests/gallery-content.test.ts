import { expect, test } from 'bun:test';
import { z } from 'astro/zod';
import { createGallerySchema, pairGalleries, galleryHomeItems } from '../src/utils/gallery';
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
