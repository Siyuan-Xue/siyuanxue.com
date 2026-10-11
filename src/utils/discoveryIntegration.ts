import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import type { Locale } from '../i18n/types';
import { localeOrigin } from '../i18n/locale';
import { auditDiscoveryHtml, collectReferencedMedia, contentDigest, imageSitemap, pageSitemap, sitemapIndex, videoSitemap, type DiscoveryPage } from './discovery';

export function discoveryIntegration(locale: Locale): AstroIntegration {
 return { name: 'public-discovery', hooks: {
  'astro:build:start': async () => { await rm(`.build/discovery/${locale}.json`, { force: true }); },
  'astro:build:done': async ({ dir, logger }) => {
   const root = fileURLToPath(dir);
   const inventory: DiscoveryPage[] = JSON.parse(await readFile(`.build/discovery/${locale}.json`, 'utf8'));
   const files = (await readdir(root, { recursive: true })).filter(path => path.endsWith('.html'));
   const seen = new Set<string>();
   const pages: Record<string, string> = {};
   for (const file of files.sort()) {
    const path = `/${relative(root, join(root, file)).replace(/index\.html$/, '').replace(/404\.html$/, '404/')}`;
    const html = await readFile(join(root, file), 'utf8');
    const page = auditDiscoveryHtml(path, html, inventory);
    collectReferencedMedia(page, html);
    seen.add(page.path);
    if (page.indexable) pages[page.canonical] = contentDigest(html);
   }
   for (const page of inventory) if (!seen.has(page.path)) throw new Error(`Discovery route did not generate HTML: ${page.path}`);
   const videos = videoSitemap(inventory);
   for (const warning of videos.omitted) logger.warn(warning);
   await Promise.all([
    writeFile(`.build/discovery/${locale}.json`, JSON.stringify(inventory, null, 2)),
    writeFile(join(root, 'sitemap-index.xml'), sitemapIndex(locale)),
    writeFile(join(root, 'sitemap-0.xml'), pageSitemap(inventory)),
    writeFile(join(root, 'sitemap-images.xml'), imageSitemap(inventory)),
    writeFile(join(root, 'sitemap-videos.xml'), videos.xml),
    writeFile(join(root, 'indexnow-manifest.json'), JSON.stringify({ version: 1, host: new URL(localeOrigin(locale)).host, pages }, null, 2)),
    writeFile(`.build/discovery/${locale}-report.json`, JSON.stringify({ generatedPages: seen.size, indexablePages: Object.keys(pages).length, omittedVideos: videos.omitted }, null, 2)),
   ]);
   const key = process.env[`INDEXNOW_KEY_${locale.toUpperCase()}`];
   if (key) {
    if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) throw new Error(`Invalid INDEXNOW_KEY_${locale.toUpperCase()} format`);
    await writeFile(join(root, `${key}.txt`), key);
   }
   logger.info(`Audited ${seen.size} HTML routes; ${Object.keys(pages).length} indexable pages; ${videos.omitted.length} omitted videos`);
  },
 } };
}
