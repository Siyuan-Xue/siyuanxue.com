import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { createGallerySchema } from './utils/gallery';
import { createImageMediaSchema, createVideoMediaSchema } from './utils/media';

const schema = z.object({ title: z.string().min(1), subtitle: z.string().optional(), description: z.string().min(1), seoDescription: z.string().trim().min(1).optional(), updatedDate: z.coerce.date().optional(), date: z.coerce.date(), draft: z.boolean().default(false) });
const essay = defineCollection({ loader: glob({ base: './src/content/essays', pattern: '**/*.md' }), schema: schema.extend({
 figures: z.array(z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), src: createImageMediaSchema(),
  alt: z.string().trim().min(1), caption: z.string().trim().min(1),
 })).default([]).refine(figures => new Set(figures.map(figure => figure.id)).size === figures.length, 'Duplicate essay figure ID'),
}) });
const post = defineCollection({ loader: glob({ base: './src/content/posts', pattern: '**/*.md' }), schema });
const gallery = defineCollection({ loader: glob({ base: './src/content/galleries', pattern: '**/*.json' }), schema: createGallerySchema(createImageMediaSchema(), createVideoMediaSchema()) });
export const collections = { essay, post, gallery };
