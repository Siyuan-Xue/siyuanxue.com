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
		// 思源宋体 SC — must include chinese-simplified (default subset is latin-only,
		// which left Safari falling back to system sans for Han glyphs).
		{
			provider: fontProviders.fontsource(),
			name: 'Noto Serif SC',
			cssVariable: '--font-noto-serif-sc',
			weights: [400, 600, 700],
			styles: ['normal'],
			subsets: ['chinese-simplified', 'latin'],
			fallbacks: [
				// Real CJK serifs first — never put a Latin-only face as CJK fallback
				'Songti SC',
				'STSongti-SC-Regular',
				'STSong',
				'Source Han Serif SC',
				'Noto Serif CJK SC',
				'SimSun',
				'宋体',
				'serif',
			],
		},
	],
});
