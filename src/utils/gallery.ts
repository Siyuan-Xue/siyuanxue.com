import type { ImageMedia, VideoMedia } from './media';
import { z } from 'astro/zod';
import type { Locale } from '../i18n/types';
import type { LinkItem } from '../data/site';
export type GalleryImage = { src: ImageMedia; alt: string; caption: string };
export type GalleryVideo = { src: VideoMedia; poster: ImageMedia; label: string; caption: string; duration: number; uploadDate: string };
export type GalleryComparison = { title: string; description: string; columns: [string, string, string, string]; rows: [string, string, string, string][] };
export type GalleryHomeItem = { title: string; href: string; year?: string | number; venue?: string; external?: boolean };
export type GalleryLink = { label: string; href: string };
export type GalleryData = { title: string; description: string; period: string; role: string; category: 'projects' | 'research' | 'appearances'; order: number; draft: boolean; preview?: boolean; layout?: 'photos' | 'product'; images: GalleryImage[]; links: GalleryLink[]; videos?: GalleryVideo[]; videoDescription?: string; comparison?: GalleryComparison };
export function createGallerySchema<T extends z.ZodType, V extends z.ZodType = z.ZodNever>(image: T, video?: V) {
 const text = z.string().trim().min(1);
 const row = z.tuple([text, text, text, text]);
 return z.object({ title: text, description: text, period: text, role: text, category: z.enum(['projects', 'research', 'appearances']), order: z.number().int().default(0), draft: z.boolean().default(true), preview: z.boolean().default(false), layout: z.enum(['photos', 'product']).default('photos'), images: z.array(z.object({ src: image, alt: text, caption: text })).min(1), links: z.array(z.object({ label: text, href: text.pipe(z.url({ protocol: /^https?$/ })) })).default([]),
  videos: z.array(z.object({ src: video ?? z.never(), poster: image, label: text, caption: text, duration: z.number().positive(), uploadDate: z.iso.date() })).default([]),
  videoDescription: text.optional(), comparison: z.object({ title: text, description: text, columns: row, rows: z.array(row).min(1) }).optional(),
 });
}
export function pairGalleries<T extends { id: string; data: GalleryData }>(entries: T[], language: Locale, includeDrafts = false): { slug: string; entry: T }[] {
 const groups = new Map<string, Partial<Record<Locale, T>>>();
 for (const entry of entries) {
  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)\/(en|zh)$/.exec(entry.id);
  if (!match) throw new Error(`Invalid gallery locale id: ${entry.id}`);
  const [, slug, lang] = match;
  const pair = groups.get(slug) ?? {};
  if (pair[lang as Locale]) throw new Error(`Duplicate gallery locale entry: ${entry.id}`);
  pair[lang as Locale] = entry;
  groups.set(slug, pair);
 }
 const result: { slug: string; entry: T }[] = [];
 for (const [slug, { en, zh }] of groups) {
  if (!includeDrafts && (en?.data.draft || zh?.data.draft)) continue;
  if (!en || !zh) throw new Error(`Missing translation for gallery ${slug}`);
  if (en.data.category !== zh.data.category) throw new Error(`Mismatched gallery category for ${slug}`);
  if (en.data.order !== zh.data.order) throw new Error(`Mismatched gallery order for ${slug}`);
  if (Boolean(en.data.preview) !== Boolean(zh.data.preview)) throw new Error(`Mismatched gallery preview status for ${slug}`);
  if ((en.data.layout ?? 'photos') !== (zh.data.layout ?? 'photos')) throw new Error(`Mismatched gallery layout for ${slug}`);
  const enVideos = en.data.videos ?? [], zhVideos = zh.data.videos ?? [];
  if (enVideos.length !== zhVideos.length || enVideos.some((clip, index) => clip.src.src !== zhVideos[index].src.src || clip.poster.src !== zhVideos[index].poster.src)) throw new Error(`Mismatched gallery videos for ${slug}`);
  result.push({ slug, entry: language === 'en' ? en : zh });
 }
 return result.sort((a, b) => a.entry.data.order - b.entry.data.order || a.slug.localeCompare(b.slug));
}
export function galleryHomeItems<T extends { data: GalleryData }>(sources: LinkItem[], galleries: { slug: string; entry: T }[], category: GalleryData['category'], language: Locale): GalleryHomeItem[] {
 const available = galleries.filter(item => item.entry.data.category === category && !item.entry.data.draft);
 const bySlug = new Map(available.map(item => [item.slug, item]));
 const seen = new Set<string>();
 const published = ({ slug, entry }: { slug: string; entry: T }): GalleryHomeItem => ({ title: entry.data.title, href: `/gallery/${slug}/`, year: entry.data.period, external: false });
 const result = sources.flatMap<GalleryHomeItem>(source => {
  const gallery = source.gallerySlug ? bySlug.get(source.gallerySlug) : undefined;
  if (gallery) { if (seen.has(gallery.slug)) return []; seen.add(gallery.slug); return [published(gallery)]; }
  return [{ title: source.title[language], href: '/wip/', venue: source.venue?.[language], year: source.year, external: false }];
 });
 for (const gallery of available) if (!seen.has(gallery.slug)) { result.push(published(gallery)); seen.add(gallery.slug); }
 return result;
}
