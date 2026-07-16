import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** One markdown file per locale: essays/{slug}/en.md + essays/{slug}/zh.md */
const essay = defineCollection({
	loader: glob({ base: './src/content/essays', pattern: '**/{en,zh}.md' }),
	schema: z.object({
		title: z.string(),
		subtitle: z.string().optional(),
		description: z.string(),
		date: z.coerce.date(),
		draft: z.boolean().default(false),
	}),
});

const post = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/{en,zh}.md' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.coerce.date(),
		draft: z.boolean().default(false),
	}),
});

export const collections = { essay, post };
