import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { resolveLocale, localeOrigin } from './src/i18n/locale.ts';
const locale = resolveLocale(process.env.SITE_LOCALE);
export default defineConfig({
 site: localeOrigin(locale),
 outDir: `./.build/${locale}`,
 integrations: [sitemap({ filter: (page) => !/\/(wip|404)\/?$/.test(new URL(page).pathname) })],
 markdown: { processor: unified() },
 vite: { resolve: { alias: { 'site-fonts': new URL(`./src/styles/fonts-${locale}.css`, import.meta.url).pathname } } },
});
