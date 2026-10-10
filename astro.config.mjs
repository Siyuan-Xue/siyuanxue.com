import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { resolveLocale, localeOrigin } from './src/i18n/locale.ts';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
const locale = resolveLocale(process.env.SITE_LOCALE);
// The sitemap integration sees routes, not page robots metadata. Derive exclusions from content.
const galleryRoot = new URL('./src/content/galleries/', import.meta.url);
const unindexedGalleries = new Set(['/gallery/layout-preview/']);
for (const directory of readdirSync(galleryRoot, { withFileTypes: true })) {
 if (!directory.isDirectory()) continue;
 const entries = ['en', 'zh'].flatMap(language => {
  const file = new URL(`${directory.name}/${language}.json`, galleryRoot);
  return existsSync(file) ? [JSON.parse(readFileSync(file, 'utf8'))] : [];
 });
 if (entries.some(entry => entry.draft !== false || entry.preview === true)) unindexedGalleries.add(`/gallery/${directory.name}/`);
}
export default defineConfig({
 site: localeOrigin(locale),
 outDir: `./.build/${locale}`,
 integrations: [react(), sitemap({ filter: (page) => {
  const pathname = new URL(page).pathname.replace(/\/?$/, '/');
  return !/\/(wip|404)\/$/.test(pathname) && !unindexedGalleries.has(pathname);
 } })],
 markdown: { processor: unified() },
 vite: {
  resolve: { alias: { 'site-fonts': new URL(`./src/styles/fonts-${locale}.css`, import.meta.url).pathname } },
  server: { proxy: { '/media/': { target: localeOrigin(locale), changeOrigin: true } } },
  preview: { proxy: { '/media/': { target: localeOrigin(locale), changeOrigin: true } } },
 },
});
