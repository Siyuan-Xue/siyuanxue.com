import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, copyFile, link, unlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve, join, extname } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

export async function prepareMedia(id, source, { directory = 'media-local', profile = 'photos' } = {}) {
 if (!/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(id)) throw new Error('Invalid media ID');
 if (!['photos', 'product', 'portrait', 'plain'].includes(profile)) throw new Error('Invalid media profile');
 const extension = extname(source).slice(1).toLowerCase();
 const video = ['mp4', 'webm', 'mov'].includes(extension);
 if (video) {
  await mkdir(directory, { recursive: true });
  const temporary = join(directory, `.prepare-${randomUUID()}`);
  try {
   await copyFile(source, temporary);
   const hash = createHash('sha256');
   let bytes = 0;
   for await (const chunk of createReadStream(temporary)) { hash.update(chunk); bytes += chunk.length; }
   if (!bytes) throw new Error('Video must not be empty');
   const sha256 = hash.digest('hex');
   const target = join(directory, `${sha256}.${extension}`);
   try { await link(temporary, target); }
   catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = createHash('sha256');
    for await (const chunk of createReadStream(target)) existing.update(chunk);
    if (existing.digest('hex') !== sha256) throw new Error('Existing media checksum mismatch');
   }
   return { src: `/media/${sha256}.${extension}`, sha256, bytes, format: extension, kind: 'video' };
  } finally { await unlink(temporary).catch(() => {}); }
 }
 const input = await readFile(source);
 const metadata = await sharp(input).metadata();
 const format = metadata.format;
 if (!['png', 'jpeg', 'webp', 'avif', 'gif', 'mp4', 'webm', 'mov'].includes(format)) throw new Error('Unsupported media format');
 const dimensions = metadata?.autoOrient ?? metadata;
 const store = async (bytes, format, width, height) => {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const filename = `${sha256}.${format}`;
  await mkdir(directory, { recursive: true });
  const path = join(directory, filename);
  try { await writeFile(path, bytes, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST' || !(await readFile(path)).equals(bytes)) throw error; }
  return { src: `/media/${filename}`, sha256, bytes: bytes.length, format, ...(width ? { width, height } : {}) };
 };
 const original = await store(input, format, dimensions?.width, dimensions?.height);
 const widths = { photos: [320, 640, 960, 1280], product: [180, 360, 540], portrait: [320, 640, 960], plain: [] }[profile];
 const variants = [];
 for (const format of ['avif', 'webp']) {
  for (const width of [...new Set(widths.map(width => Math.min(width, dimensions.width)))]) {
   const { data, info } = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).toFormat(format, { quality: format === 'avif' ? 60 : 85 }).toBuffer({ resolveWithObject: true });
   variants.push(await store(data, format, info.width, info.height));
  }
 }
 const { data, info } = await sharp(input).rotate().resize({ width: Math.min(1200, dimensions.width), withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
 const cover = await store(data, 'jpeg', info.width, info.height);
 return { ...original, kind: 'image', variants, cover };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { directory: { type: 'string' }, manifest: { type: 'string' }, profile: { type: 'string' } } });
  if (positionals.length !== 2) throw new Error('Usage: prepare-media.mjs ID SOURCE [--profile photos|product|portrait|plain] [--directory media-local] [--manifest src/data/media.json]');
  const [id, source] = positionals;
  const file = values.manifest ?? 'src/data/media.json';
  const records = JSON.parse(await readFile(file, 'utf8'));
  const asset = await prepareMedia(id, source, values);
  records[id] = asset;
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(records, null, 2) + '\n');
  await rename(temporary, file);
  console.log(`Prepared ${id}: ${asset.src}`);
 } catch (error) { console.error(error.message); process.exitCode = 1; }
}
