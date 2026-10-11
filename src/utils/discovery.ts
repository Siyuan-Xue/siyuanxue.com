import { createHash } from 'node:crypto';
import { parseHTML } from 'linkedom';
import { z } from 'astro/zod';
import { site } from '../data/site';
import { localeOrigin } from '../i18n/locale';
import type { Locale } from '../i18n/types';
import { pairEntries } from './contentPairs';
import { pairGalleries, type GalleryData } from './gallery';
import { imageMedia, media } from './media';
import type { GalleryMetadataImage, GalleryMetadataVideo, ShareImage } from './pageMetadata';

export type DiscoveryKind = 'profile' | 'chat' | 'placeholder' | 'not-found' | 'redirect' | 'essay' | 'post' | 'gallery';
export interface DiscoveryPage {
 locale: Locale; kind: DiscoveryKind; path: string; canonical: string;
 alternates: Record<'en' | 'zh-CN' | 'x-default', string>;
 title: string; fullTitle: string; description: string; structuredDescription: string; indexable: boolean;
 datePublished?: string; dateModified?: string;
 shareImage?: ShareImage; images: GalleryMetadataImage[]; videos: GalleryMetadataVideo[];
}
type ArticleEntry = { id: string; data: { title: string; description: string; seoDescription?: string; date: Date; updatedDate?: Date; draft: boolean } };
export type DiscoverySources = { essay: ArticleEntry[]; post: ArticleEntry[]; gallery: { id: string; data: GalleryData }[] };

/** Every non-content HTML route has an explicit policy. New content comes from the paired collections. */
export const staticPagePolicies = [
 { path: '/', kind: 'profile', indexable: true, title: site.title, description: site.description },
 { path: '/chat/', kind: 'chat', indexable: true, title: { en: 'Chat with xue', zh: '与小薛聊聊' }, description: {
  en: `I’m ${site.name.en}’s AI assistant—he’s my Boss. Welcome! Ask about his projects and writing, or just stay for a chat. A little wit comes with the welcome.`,
  zh: `我是${site.name.zh}的 AI 助手，他是我的 Boss。聊项目、读文章，或者随便坐坐——正经介绍，偶尔贫嘴。`,
 } },
 { path: '/wip/', kind: 'placeholder', indexable: false, title: { en: 'Under construction', zh: '正在施工' }, description: { en: 'This page is still under construction.', zh: '这个页面还在施工中。' } },
 { path: '/404/', kind: 'not-found', indexable: false, title: { en: 'Page not found', zh: '页面未找到' }, description: site.description },
 { path: '/gallery/probfun/', kind: 'redirect', indexable: false, title: { en: 'Redirecting', zh: '正在跳转' }, description: site.description, target: '/gallery/imathbook/' },
] as const;

export function buildDiscoveryInventory(sources: DiscoverySources, locale: Locale, includeDrafts = false): DiscoveryPage[] {
 const make = (path: string, kind: DiscoveryKind, title: string, description: string, indexable: boolean, target = path): DiscoveryPage => ({
  locale, kind, path, title, description, structuredDescription: description, indexable,
  fullTitle: path === '/' ? site.homeTitle[locale] : `${title} — ${site.name[locale]}`,
  canonical: new URL(target, localeOrigin(locale)).href,
  alternates: { en: new URL(target, localeOrigin('en')).href, 'zh-CN': new URL(target, localeOrigin('zh')).href, 'x-default': new URL(target, localeOrigin('en')).href },
  images: [], videos: [],
 });
 const pages = staticPagePolicies.map(policy => make(policy.path, policy.kind, policy.title[locale], policy.description[locale], policy.indexable, 'target' in policy ? policy.target : policy.path));
 const portrait = imageMedia('portrait');
 pages[0].images = [{ src: portrait.src, width: portrait.width, height: portrait.height, alt: site.portrait.alt[locale], caption: site.portrait.alt[locale] }];
 for (const kind of ['essay', 'post'] as const) for (const { slug, entry } of pairEntries(sources[kind], locale)) {
  const data = entry.data;
  pages.push({ ...make(`/${kind}/${slug}/`, kind, data.title, data.seoDescription ?? data.description, true), structuredDescription: data.description, datePublished: data.date.toISOString(), ...(data.updatedDate ? { dateModified: data.updatedDate.toISOString() } : {}) });
 }
 const isSample = (entry: { id: string }) => entry.id.startsWith('layout-preview/');
 const galleries = [...pairGalleries(sources.gallery.filter(entry => !isSample(entry)), locale, includeDrafts), ...pairGalleries(sources.gallery.filter(isSample), locale, true)];
 for (const { slug, entry: { data } } of galleries) {
  const first = data.images[0];
  pages.push({ ...make(`/gallery/${slug}/`, 'gallery', data.title, data.seoDescription ?? data.description, !includeDrafts && !data.draft && !data.preview && slug !== 'layout-preview'), structuredDescription: data.description,
   ...(data.datePublished ? { datePublished: new Date(data.datePublished).toISOString() } : {}),
   ...(data.dateModified ? { dateModified: new Date(data.dateModified).toISOString() } : {}),
   shareImage: { src: first.src.cover.src, width: first.src.cover.width, height: first.src.cover.height, alt: first.alt },
   images: data.images.map(image => ({ src: image.src.src, width: image.src.width, height: image.src.height, alt: image.alt, caption: image.caption })),
   videos: (data.videos ?? []).map(video => ({ src: video.src.src, poster: video.poster.cover.src, name: `${data.title} · ${video.label}`, description: video.caption, duration: video.duration, uploadDate: video.uploadDate })),
  });
 }
 if (new Set(pages.map(page => page.path)).size !== pages.length) throw new Error('Duplicate discovery route');
 return pages.sort((a, b) => a.path.localeCompare(b.path));
}

const escapeXml = (value: string) => value.replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);
const absolute = (value: string, page: DiscoveryPage) => new URL(value, localeOrigin(page.locale)).href;
const xml = (body: string, namespaces = '') => `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${namespaces}>${body}</urlset>`;
export function pageSitemap(pages: DiscoveryPage[]): string {
 return xml(pages.filter(page => page.indexable).map(page => `<url><loc>${escapeXml(page.canonical)}</loc>${page.dateModified || page.datePublished ? `<lastmod>${page.dateModified ?? page.datePublished}</lastmod>` : ''}${Object.entries(page.alternates).map(([language, url]) => `<xhtml:link rel="alternate" hreflang="${language}" href="${escapeXml(url)}"/>`).join('')}</url>`).join(''), ' xmlns:xhtml="http://www.w3.org/1999/xhtml"');
}
export function imageSitemap(pages: DiscoveryPage[]): string {
 return xml(pages.filter(page => page.indexable && page.images.length).map(page => `<url><loc>${escapeXml(page.canonical)}</loc>${[...new Set(page.images.map(image => absolute(image.src, page)))].map(url => `<image:image><image:loc>${escapeXml(url)}</image:loc></image:image>`).join('')}</url>`).join(''), ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
}
const videoPublicationDate = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);
export function videoSitemap(pages: DiscoveryPage[]): { xml: string; omitted: string[] } {
 const omitted: string[] = [];
 const body = pages.filter(page => page.indexable).flatMap(page => {
  const videos = page.videos.filter(video => {
   const valid = Boolean(video.src && video.poster && video.name.trim() && video.description.trim() && typeof video.duration === 'number' && video.duration > 0 && video.duration <= 28800 && videoPublicationDate.safeParse(video.uploadDate).success);
   if (!valid) omitted.push(`${page.canonical}: ${video.src} — missing or invalid required video metadata`);
   return valid;
  });
  if (!videos.length) return [];
  return [`<url><loc>${escapeXml(page.canonical)}</loc>${videos.map(video => `<video:video><video:thumbnail_loc>${escapeXml(absolute(video.poster, page))}</video:thumbnail_loc><video:title>${escapeXml(video.name)}</video:title><video:description>${escapeXml(video.description)}</video:description><video:content_loc>${escapeXml(absolute(video.src, page))}</video:content_loc><video:duration>${Math.ceil(video.duration!)}</video:duration><video:publication_date>${escapeXml(video.uploadDate!)}</video:publication_date></video:video>`).join('')}</url>`];
 }).join('');
 return { xml: xml(body, ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"'), omitted };
}
export function sitemapIndex(locale: Locale): string {
 return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['sitemap-0.xml', 'sitemap-images.xml', 'sitemap-videos.xml'].map(path => `<sitemap><loc>${localeOrigin(locale)}/${path}</loc></sitemap>`).join('')}</sitemapindex>`;
}

function publicMediaUrl(value: string | null, page: DiscoveryPage): string | undefined {
 if (!value?.trim()) return;
 try {
  const url = new URL(value, page.canonical);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return;
  url.hash = '';
  return url.href;
 } catch { return; }
}

/** Collect public body media, including future articles, without treating alternate renditions as works. */
export function collectReferencedMedia(page: DiscoveryPage, html: string): void {
 if (!page.indexable) return;
 const { document } = parseHTML(html);
 const seen = new Set(page.images.map(image => image.src));
 for (const node of document.querySelectorAll('main img[src]')) {
  const src = node.getAttribute('src')!;
  const image = Object.values(media).find(asset => asset.kind === 'image' && [asset.src, asset.cover.src, ...asset.variants.map(variant => variant.src)].includes(src));
  if (!image || image.kind !== 'image' || seen.has(image.src)) continue;
  const alt = node.getAttribute('alt') ?? '';
  page.images.push({ src: image.src, width: image.width, height: image.height, alt, caption: node.closest('figure')?.querySelector('figcaption')?.textContent ?? alt });
  seen.add(image.src);
 }
 const knownVideos = new Map(page.videos.map(video => [publicMediaUrl(video.src, page), video]));
 for (const node of document.querySelectorAll('main video')) {
  // A video's source elements are alternative encodings, not separate recordings.
  const sources = [node.getAttribute('src'), ...[...node.querySelectorAll('source[src]')].map(source => source.getAttribute('src'))];
  const url = sources.map(source => publicMediaUrl(source, page)).find(Boolean);
  if (!url) continue;
  const parsed = new URL(url);
  const registered = [localeOrigin('en'), localeOrigin('zh')].includes(parsed.origin)
   ? Object.values(media).find(asset => asset.kind === 'video' && asset.src === parsed.pathname) : undefined;
  const src = registered?.src ?? url;
  const identity = publicMediaUrl(src, page)!;
  const duration = node.getAttribute('data-duration')?.trim();
  const uploadDate = node.getAttribute('data-upload-date')?.trim();
  const video: GalleryMetadataVideo = {
   src, poster: publicMediaUrl(node.getAttribute('poster'), page) ?? '',
   name: (node.getAttribute('aria-label') || node.getAttribute('title') || '').trim(),
   description: (node.closest('figure')?.querySelector('figcaption')?.textContent || node.getAttribute('aria-description') || '').trim(),
   ...(duration ? { duration: Number(duration) } : {}),
   ...(uploadDate ? { uploadDate } : {}),
  };
  const existing = knownVideos.get(identity);
  if (existing) {
   // Content collection metadata is authoritative; DOM metadata can fill explicit gaps.
   existing.poster ||= video.poster;
   existing.name ||= video.name;
   existing.description ||= video.description;
   existing.duration ??= video.duration;
   existing.uploadDate ||= video.uploadDate;
  } else {
   page.videos.push(video);
   knownVideos.set(identity, video);
  }
 }
}

/** Final HTML is checked independently of the page components before deployment. */
export function auditDiscoveryHtml(path: string, html: string, inventory: DiscoveryPage[]): DiscoveryPage {
 const page = inventory.find(page => page.path === path);
 if (!page) throw new Error(`Unregistered generated HTML route: ${path}; add an explicit discovery policy`);
 const { document } = parseHTML(html);
 const fail = (reason: string) => { throw new Error(`Discovery audit ${path}: ${reason}`); };
 if (document.querySelectorAll('link[rel="canonical"]').length !== 1 || document.querySelector('link[rel="canonical"]')?.getAttribute('href') !== page.canonical) fail('canonical does not match inventory');
 const noindex = /\bnoindex\b/.test(document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '');
 if (noindex === page.indexable) fail('indexability does not match inventory');
 if (page.kind === 'redirect') return page;
 if (document.documentElement.lang !== (page.locale === 'en' ? 'en' : 'zh-CN')) fail('incorrect document language');
 if (document.title !== page.fullTitle) fail('title does not match inventory');
 for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) if (document.querySelector(selector)?.getAttribute('content') !== page.description) fail('description does not match inventory');
 for (const [language, url] of Object.entries(page.alternates)) if (document.querySelector(`link[hreflang="${language}"]`)?.getAttribute('href') !== url) fail(`missing or incorrect ${language} alternate`);
 if (document.querySelector('meta[property="og:url"]')?.getAttribute('content') !== page.canonical) fail('Open Graph URL does not match canonical');
 for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
  const schema = JSON.parse(script.textContent ?? '');
  if (JSON.stringify(schema).includes('dateModified') && !page.dateModified) fail('unsupported modification date');
 }
 return page;
}

/** Editorial content and metadata change the digest; bundle names, theme state and release IDs do not. */
export function contentDigest(html: string): string {
 const { document } = parseHTML(html);
 const main = document.querySelector('main')?.cloneNode(true) as HTMLElement | undefined;
 main?.querySelectorAll('script,style').forEach(node => node.remove());
 const payload = {
  title: document.title,
  metadata: [...document.querySelectorAll('meta[name="description"],meta[property^="og:"],meta[property^="article:"],link[rel="canonical"],link[hreflang]')].map(node => [...node.attributes].map(attribute => [attribute.name, attribute.value])),
  schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent ?? 'null')),
  text: main?.textContent?.replace(/\s+/g, ' ').trim(),
  references: [...(main?.querySelectorAll('a[href],img[src],video,source[src],time[datetime]') ?? [])].map(node => [node.tagName, ...['href', 'src', 'poster', 'alt', 'datetime', 'aria-label', 'aria-description', 'title', 'data-upload-date', 'data-duration'].map(attribute => node.getAttribute(attribute))]),
 };
 return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
