import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const schema = z.object({ title: z.string().min(1), subtitle: z.string().optional(), description: z.string().min(1), date: z.coerce.date(), draft: z.boolean().default(false) });
const essay = defineCollection({ loader: glob({ base: './src/content/essays', pattern: '**/*.md' }), schema });
const post = defineCollection({ loader: glob({ base: './src/content/posts', pattern: '**/*.md' }), schema });
export const collections = { essay, post };
