import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

test('local preparation creates verified portrait thumbnails and a natural-ratio cover; invalid IDs cannot write outside storage', async () => {
 const root = await mkdtemp(join(tmpdir(), 'media-prepare-'));
 try {
  const source = join(root, 'phone.png'), manifest = join(root, 'manifest.json');
  await sharp({ create: { width: 1080, height: 2424, channels: 3, background: '#eeebe3' } }).png().toFile(source);
  await writeFile(manifest, '{}');
  const run = (id: string) => spawnSync('node', ['scripts/prepare-media.mjs', id, source, '--directory', join(root, 'media'), '--manifest', manifest, '--profile', 'product'], { encoding: 'utf8' });
  expect(run('../escape').status).not.toBe(0);
  const prepared = run('sample/phone');
  if (prepared.status !== 0) throw new Error(prepared.stderr);
  const record = JSON.parse(await readFile(manifest, 'utf8'))['sample/phone'];
  expect(record.width).toBe(1080);
  expect(record.height).toBe(2424);
  expect(record.variants.filter((file: {format:string}) => file.format === 'webp').map((file: {width:number}) => file.width)).toEqual([180, 360, 540]);
  for (const file of [record, ...record.variants, record.cover]) {
   const bytes = await readFile(join(root, file.src));
   expect(bytes.length).toBe(file.bytes);
   expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);
   const dimensions = await sharp(bytes).metadata();
   expect(dimensions.width).toBe(file.width);
   expect(dimensions.height).toBe(file.height);
  }
  expect(record.cover.width).toBe(1080);
  expect(record.cover.height).toBe(2424);
 } finally { await rm(root, { recursive: true, force: true }); }
}, 30_000);

test('video preparation preserves bytes with a streamable file record and no image derivatives', async () => {
 const root = await mkdtemp(join(tmpdir(), 'video-prepare-'));
 try {
  const source = join(root, 'clip.mp4'), manifest = join(root, 'manifest.json');
  const bytes = Buffer.alloc(3 * 1024 * 1024, 0x5a);
  await writeFile(source, bytes);
  await writeFile(manifest, '{}');
  const run = spawnSync('node', ['scripts/prepare-media.mjs', 'sample/clip', source, '--directory', join(root, 'media'), '--manifest', manifest], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr);
  const record = JSON.parse(await readFile(manifest, 'utf8'))['sample/clip'];
  expect(record.kind).toBe('video');
  expect(record.bytes).toBe(bytes.length);
  expect(record.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
  expect(record.variants).toBeUndefined();
  expect((await readFile(join(root, record.src))).equals(bytes)).toBe(true);
 } finally { await rm(root, { recursive: true, force: true }); }
});
