import type { ImageMedia, VideoMedia } from './media';
import { z } from 'astro/zod';
import type { Locale } from '../i18n/types';
import { WIP_HREF, type LinkItem } from '../data/site';
import { groupLocalePairs, requireBoth } from './contentPairs';
export type GalleryImage = { src: ImageMedia; alt: string; caption: string };
export type GalleryVideo = { src: VideoMedia; poster: ImageMedia; label: string; caption: string; duration?: number; uploadDate?: string };
export type GalleryComparison = { title: string; description: string };
export type GalleryHomeItem = { title: string; href: string; meta?: string; year?: string | number; venue?: string; external?: boolean };
export type GalleryLink = { label: string; href: string };
export type GalleryImageSection = { title: string; start: number };
export type GalleryData = { title: string; description: string; seoDescription?: string; datePublished?: string; dateModified?: string; period?: string; homeMeta?: string; role: string; category: 'projects' | 'research' | 'appearances'; order: number; draft: boolean; preview?: boolean; layout?: 'photos' | 'product'; images: GalleryImage[]; imageSections?: GalleryImageSection[]; links: GalleryLink[]; videos?: GalleryVideo[]; videoTitle?: string | null; videoLayout?: 'comparison' | 'demos'; videoDescription?: string; comparison?: GalleryComparison };
export function createGallerySchema<T extends z.ZodType, V extends z.ZodType = z.ZodNever>(image: T, video?: V) {
 const text = z.string().trim().min(1);
 return z.object({ title: text, description: text, seoDescription: text.optional(), datePublished: z.iso.date().optional(), dateModified: z.iso.date().optional(), period: text.optional(), homeMeta: text.optional(), role: text, category: z.enum(['projects', 'research', 'appearances']), order: z.number().int().default(0), draft: z.boolean().default(true), preview: z.boolean().default(false), layout: z.enum(['photos', 'product']).default('photos'), images: z.array(z.object({ src: image, alt: text, caption: text })).min(1), links: z.array(z.object({ label: text, href: text.pipe(z.url({ protocol: /^https?$/ })) })).default([]),
  imageSections: z.array(z.object({ title: text, start: z.number().int().nonnegative() })).default([]),
  videos: z.array(z.object({ src: video ?? z.never(), poster: image, label: text, caption: text, duration: z.number().positive().optional(), uploadDate: z.iso.date().optional() })).default([]),
  videoTitle: text.nullable().optional(), videoLayout: z.enum(['comparison', 'demos']).default('comparison'), videoDescription: text.optional(), comparison: z.object({ title: text, description: text }).optional(),
 }).refine(({ imageSections, images }) => imageSections.every((section, index) => section.start < images.length && (index === 0 ? section.start === 0 : section.start > imageSections[index - 1].start)), { path: ['imageSections'], message: 'Image sections must partition images in order, starting at zero.' });
}
export function pairGalleries<T extends { id: string; data: GalleryData }>(entries: T[], language: Locale, includeDrafts = false): { slug: string; entry: T }[] {
 const result: { slug: string; entry: T }[] = [];
 for (const pair of groupLocalePairs(entries, 'gallery', '[a-z0-9]+(?:-[a-z0-9]+)*')) {
  if (!includeDrafts && (pair.en?.data.draft || pair.zh?.data.draft)) continue;
  const { slug } = pair;
  const { en, zh } = requireBoth(pair, 'gallery');
  if (en.data.category !== zh.data.category) throw new Error(`Mismatched gallery category for ${slug}`);
  if (en.data.order !== zh.data.order) throw new Error(`Mismatched gallery order for ${slug}`);
  if (Boolean(en.data.preview) !== Boolean(zh.data.preview)) throw new Error(`Mismatched gallery preview status for ${slug}`);
  if ((en.data.layout ?? 'photos') !== (zh.data.layout ?? 'photos')) throw new Error(`Mismatched gallery layout for ${slug}`);
  if (Boolean(en.data.period) !== Boolean(zh.data.period)) throw new Error(`Mismatched gallery period visibility for ${slug}`);
  if (Boolean(en.data.homeMeta) !== Boolean(zh.data.homeMeta)) throw new Error(`Mismatched gallery homepage context for ${slug}`);
  const enSections = en.data.imageSections ?? [], zhSections = zh.data.imageSections ?? [];
  if (enSections.length !== zhSections.length || enSections.some((section, index) => section.start !== zhSections[index].start)) throw new Error(`Mismatched gallery image sections for ${slug}`);
  if (enSections.length > 0 && (en.data.images.length !== zh.data.images.length || en.data.images.some((image, index) => image.src.src !== zh.data.images[index].src.src))) throw new Error(`Mismatched gallery section images for ${slug}`);
  if ((en.data.videoLayout ?? 'comparison') !== (zh.data.videoLayout ?? 'comparison')) throw new Error(`Mismatched gallery video layout for ${slug}`);
  if ((en.data.videoTitle === null) !== (zh.data.videoTitle === null)) throw new Error(`Mismatched gallery video heading for ${slug}`);
  const enVideos = en.data.videos ?? [], zhVideos = zh.data.videos ?? [];
  if (enVideos.length !== zhVideos.length || enVideos.some((clip, index) => clip.src.src !== zhVideos[index].src.src || clip.poster.src !== zhVideos[index].poster.src)) throw new Error(`Mismatched gallery videos for ${slug}`);
  result.push({ slug, entry: language === 'en' ? en : zh });
 }
 return result.sort((a, b) => a.entry.data.order - b.entry.data.order || a.slug.localeCompare(b.slug));
}
/** The designated layout sample is public for review but never indexed; ordinary drafts stay private. */
export const GALLERY_PREVIEW_SLUG = 'layout-preview';
export const isGalleryPreview = (entry: { id: string }) => entry.id.startsWith(`${GALLERY_PREVIEW_SLUG}/`);
export function pairGalleryPages<T extends { id: string; data: GalleryData }>(entries: T[], language: Locale, includeDrafts = false) {
 return [
  ...pairGalleries(entries.filter(entry => !isGalleryPreview(entry)), language, includeDrafts),
  ...pairGalleries(entries.filter(isGalleryPreview), language, true),
 ];
}
export function galleryHomeItems<T extends { data: GalleryData }>(sources: LinkItem[], galleries: { slug: string; entry: T }[], category: GalleryData['category'], language: Locale): GalleryHomeItem[] {
 const available = galleries.filter(item => item.entry.data.category === category && !item.entry.data.draft);
 const bySlug = new Map(available.map(item => [item.slug, item]));
 const seen = new Set<string>();
 const published = ({ slug, entry }: { slug: string; entry: T }): GalleryHomeItem => ({ title: entry.data.title, href: `/gallery/${slug}/`, meta: entry.data.homeMeta, external: false });
 const result = sources.flatMap<GalleryHomeItem>(source => {
  const gallery = source.gallerySlug ? bySlug.get(source.gallerySlug) : undefined;
  if (gallery) { if (seen.has(gallery.slug)) return []; seen.add(gallery.slug); return [published(gallery)]; }
  return [{ title: source.title[language], href: WIP_HREF, venue: source.venue?.[language], external: false }];
 });
 for (const gallery of available) if (!seen.has(gallery.slug)) { result.push(published(gallery)); seen.add(gallery.slug); }
 return result;
}
