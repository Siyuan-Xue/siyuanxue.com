import { z } from 'astro/zod';
import registry from '../data/media.json';

const formats = ['png', 'jpeg', 'webp', 'avif', 'gif', 'mp4', 'webm', 'mov'] as const;
export const mediaFileSchema = z.object({
 src: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive(),
 width: z.number().int().positive().optional(), height: z.number().int().positive().optional(), format: z.enum(formats),
}).superRefine((file, context) => {
 if (file.src !== `/media/${file.sha256}.${file.format}`) context.addIssue({ code: 'custom', message: 'Media path must match its SHA-256 and format' });
});
const imageFileSchema = mediaFileSchema.refine(file => !['mp4', 'webm', 'mov'].includes(file.format) && file.width && file.height, 'Image requires dimensions and an image format')
 .transform(file => ({ ...file, width: file.width!, height: file.height! }));
export const imageMediaSchema = imageFileSchema.and(z.object({ kind: z.literal('image'), variants: z.array(imageFileSchema), cover: imageFileSchema }));
const videoMediaSchema = mediaFileSchema.and(z.object({ kind: z.literal('video') })).refine(file => ['mp4', 'webm', 'mov'].includes(file.format), 'Video requires a video format');
export const mediaRegistrySchema = z.record(z.string().regex(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/), z.union([imageMediaSchema, videoMediaSchema]));
export type ImageMedia = z.infer<typeof imageMediaSchema>;
export type MediaFile = z.infer<typeof mediaFileSchema>;
export const media = mediaRegistrySchema.parse(registry);
export function createImageMediaSchema(records: Record<string, unknown> = media) {
 return z.string().regex(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/).transform((id, context): ImageMedia => {
  const asset = Object.hasOwn(records, id) ? imageMediaSchema.safeParse(records[id]) : undefined;
  if (!asset?.success) {
   context.addIssue({ code: 'custom', message: `Unknown image media ID: ${id}` });
   return z.NEVER;
  }
  return asset.data;
 });
}
export function imageMedia(id: string): ImageMedia { return createImageMediaSchema().parse(id); }
