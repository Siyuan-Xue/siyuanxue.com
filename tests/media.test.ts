import { expect, test } from 'bun:test';
import { createImageMediaSchema, mediaFileSchema } from '../src/utils/media';

const hash = 'a'.repeat(64);
const file = { src: `/media/${hash}.webp`, sha256: hash, bytes: 100, width: 180, height: 404, format: 'webp' as const };
const image = { ...file, kind: 'image' as const, variants: [file], cover: file };
test('content resolves a registered image without needing its binary file', () => {
 const schema = createImageMediaSchema({ sample: image });
 expect(schema.parse('sample')).toEqual(image);
 expect(schema.safeParse('missing').success).toBe(false);
 expect(schema.safeParse('../sample').success).toBe(false);
 expect(createImageMediaSchema({ movie: { kind: 'video' } }).safeParse('movie').success).toBe(false);
});
test('media records reject paths, hashes and dimensions that cannot represent immutable public files', () => {
 expect(mediaFileSchema.safeParse(file).success).toBe(true);
 for (const change of [{ src: '/media/../private.webp' }, { src: `/media/${'b'.repeat(64)}.webp` }, { bytes: 0 }, { width: -1 }, { format: 'html' }]) {
  expect(mediaFileSchema.safeParse({ ...file, ...change }).success).toBe(false);
 }
});
