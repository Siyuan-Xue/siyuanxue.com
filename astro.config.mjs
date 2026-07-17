// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeSlug from 'rehype-slug';

// https://astro.build/config
// Use unified (not Sätteri) so rehype-slug can add heading ids for the left TOC.
export default defineConfig({
	site: 'https://siyuanxue.com',
	integrations: [sitemap()],
	markdown: {
		processor: unified({
			rehypePlugins: [rehypeSlug],
		}),
	},
	fonts: [
		{
			provider: fontProviders.fontsource(),
			name: 'Newsreader',
			cssVariable: '--font-newsreader',
			weights: [400, 500, 600, 700],
			styles: ['normal', 'italic'],
			fallbacks: ['Times New Roman', 'serif'],
		},
		{
			provider: fontProviders.fontsource(),
			name: 'Noto Serif SC',
			cssVariable: '--font-noto-serif-sc',
			weights: [400, 600, 700],
			styles: ['normal'],
			fallbacks: ['Songti SC', 'SimSun', 'serif'],
		},
	],
});
