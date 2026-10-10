import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMParser, parseHTML } from 'linkedom';
import sharp from 'sharp';

const project = fileURLToPath(new URL('../', import.meta.url));
const pathname = '/gallery/published-fixture/';
const previewPath = '/gallery/layout-preview/';
const variants = [
 { locale: 'en', language: 'en', origin: 'https://siyuanxue.com' },
 { locale: 'zh', language: 'zh-CN', origin: 'https://xuesiyuan.com' },
];
type Fixture = {
 title: string; description: string; period: string; role: string; draft: boolean; preview: boolean;
 images: { src: string; alt: string; caption: string }[];
 links: { label: string; href: string }[];
};

test('published bilingual gallery survives a real Astro build with crawlable content, assets and metadata', async () => {
 const temporary = await mkdtemp(join(tmpdir(), 'siyuan-gallery-output-'));
 try {
  await Promise.all(['src', 'public', 'astro.config.mjs', 'tsconfig.json', 'package.json'].map(name => cp(join(project, name), join(temporary, name), { recursive: true })));
  // Link dependencies individually so Astro/Vite caches stay inside this temporary project.
  await mkdir(join(temporary, 'node_modules'));
  await Promise.all((await readdir(join(project, 'node_modules'))).filter(name => !name.startsWith('.')).map(name => symlink(join(project, 'node_modules', name), join(temporary, 'node_modules', name), 'dir')));
  const fixtures = new Map<string, Fixture>();
  const draftDirectory = join(temporary, 'src/content/galleries/unpublished-fixture');
  await mkdir(draftDirectory);
  const publishedDirectory = join(temporary, 'src/content/galleries/published-fixture');
  await mkdir(publishedDirectory);
  for (const { locale } of variants) {
   const file = join(temporary, 'src/content/galleries/layout-preview', `${locale}.json`);
   const fixture: Fixture = JSON.parse(await readFile(file, 'utf8'));
   expect(fixture.draft).toBe(true);
   expect(fixture.images).toHaveLength(4);
   expect(fixture.links.length).toBeGreaterThan(0);
   fixtures.set(locale, fixture);
   await writeFile(join(draftDirectory, `${locale}.json`), JSON.stringify(fixture));
   await writeFile(join(publishedDirectory, `${locale}.json`), JSON.stringify({ ...fixture, draft: false, preview: false }));
  }

  for (const { locale, language, origin } of variants) {
   const build = spawnSync('node', ['node_modules/astro/bin/astro.mjs', 'build'], {
    // Bun tests set NODE_ENV=test; the child must model a production deployment.
    cwd: temporary, env: { ...process.env, NODE_ENV: 'production', SITE_LOCALE: locale, ASTRO_TELEMETRY_DISABLED: '1' },
    encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
   });
   if (build.error || build.status !== 0) throw new Error(`Astro ${locale} fixture build failed: ${build.error ?? build.signal ?? build.status}\n${build.stdout}\n${build.stderr}`);
   const output = join(temporary, '.build', locale);
   const fixture = fixtures.get(locale)!;
   const { document: preview } = parseHTML(await readFile(join(output, previewPath, 'index.html'), 'utf8'));
   expect(preview.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
   expect(preview.querySelectorAll('article[data-gallery-page] figure')).toHaveLength(4);
   expect(preview.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(origin + previewPath);
   expect(JSON.parse(await readFile(join(temporary, 'src/content/galleries/layout-preview', `${locale}.json`), 'utf8')).draft).toBe(true);
   const { document } = parseHTML(await readFile(join(output, pathname, 'index.html'), 'utf8'));
   const gallery = document.querySelector('article[data-gallery-page]')!;
   expect(gallery).not.toBeNull();
   expect(document.documentElement.lang).toBe(language);
   expect(gallery.querySelector('h1')?.textContent).toBe(fixture.title);
   for (const text of [fixture.description, fixture.period, fixture.role]) expect(gallery.textContent).toContain(text);
   expect(document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '').not.toContain('noindex');
   expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(origin + pathname);
   for (const [lang, domain] of [['en', 'https://siyuanxue.com'], ['zh-CN', 'https://xuesiyuan.com'], ['x-default', 'https://siyuanxue.com']]) {
    expect(document.querySelector(`link[hreflang="${lang}"]`)?.getAttribute('href')).toBe(domain + pathname);
   }

   const figures = [...gallery.querySelectorAll('figure')];
   expect(figures).toHaveLength(4);
   const originals: string[] = [];
   for (const [index, figure] of figures.entries()) {
    const expected = fixture.images[index];
    const image = figure.querySelector('img')!;
    const anchor = figure.querySelector('a[data-gallery-image]')!;
    expect(figure.querySelector('figcaption')?.textContent).toBe(expected.caption);
    expect(image.getAttribute('alt')).toBe(expected.alt);
    const original = anchor.getAttribute('href')!;
    expect(original).toStartWith('/_astro/');
    originals.push(new URL(original, origin).href);
    const source = await readFile(resolve(temporary, 'src/content/galleries/layout-preview', expected.src));
    expect((await readFile(join(output, original))).equals(source)).toBe(true);
    const dimensions = await sharp(source).metadata();
    expect(Number(anchor.getAttribute('data-width'))).toBe(dimensions.width!);
    expect(Number(anchor.getAttribute('data-height'))).toBe(dimensions.height!);
    expect(Number(image.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(image.getAttribute('height'))).toBeGreaterThan(0);
    for (const candidate of figure.querySelectorAll('img[src],source[srcset]')) {
     const sources = candidate.getAttribute('srcset')?.split(',').map(value => value.trim().split(/\s+/)[0]) ?? [candidate.getAttribute('src')!];
     for (const asset of sources) expect((await readFile(join(output, asset))).length).toBeGreaterThan(0);
    }
   }
   for (const link of fixture.links) {
    expect([...gallery.querySelectorAll('.gallery-links a')].some(anchor => anchor.getAttribute('href') === link.href && anchor.textContent === link.label)).toBe(true);
   }

   const coverUrl = document.querySelector('meta[property="og:image"]')!.getAttribute('content')!;
   expect(new URL(coverUrl).origin).toBe(origin);
   const cover = await sharp(await readFile(join(output, new URL(coverUrl).pathname))).metadata();
   const sourceCover = await sharp(resolve(temporary, 'src/content/galleries/layout-preview', fixture.images[0].src)).metadata();
   expect(cover.width).toBe(Math.min(1200, sourceCover.width!));
   expect(cover.height).toBe(Math.round(cover.width! * sourceCover.height! / sourceCover.width!));
   expect(Number(document.querySelector('meta[property="og:image:width"]')?.getAttribute('content'))).toBe(cover.width!);
   expect(Number(document.querySelector('meta[property="og:image:height"]')?.getAttribute('content'))).toBe(cover.height!);
   expect(document.querySelector('meta[property="og:image:alt"]')?.getAttribute('content')).toBe(fixture.images[0].alt);
   expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(coverUrl);
   const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(script => { const data = JSON.parse(script.textContent!); return data['@graph'] ?? [data]; });
   const schema = schemas.find(node => node['@type'] === 'ImageGallery');
   expect(schema).toBeTruthy();
   expect(schema.url).toBe(origin + pathname);
   expect(schema.name).toBe(fixture.title);
   expect(schema.author['@id']).toBe('https://siyuanxue.com/#person');
   expect(schema.primaryImageOfPage.contentUrl).toBe(coverUrl);
   expect(schema.image.map((image: { contentUrl: string }) => image.contentUrl)).toEqual(originals);
   expect(schema.image.map((image: { caption: string }) => image.caption)).toEqual(fixture.images.map(image => image.caption));
   expect(schemas.some(node => node['@type'] === 'BlogPosting')).toBe(false);
   expect(JSON.stringify(schemas)).not.toContain('"datePublished"');
   expect(document.querySelector('meta[property="article:published_time"]')).toBeNull();
   const { document: home } = parseHTML(await readFile(join(output, 'index.html'), 'utf8'));
   const homeLinks = home.querySelectorAll(`a[href="${pathname}"]`);
   expect(homeLinks).toHaveLength(1);
   expect(homeLinks[0].textContent).toBe(fixture.title);
   expect(home.querySelector(`a[href="${previewPath}"]`)).toBeNull();
   expect(home.querySelector('a[href="/gallery/unpublished-fixture/"]')).toBeNull();
   expect(await access(join(output, 'gallery/unpublished-fixture/index.html')).then(() => true, () => false)).toBe(false);
   const sitemap = new DOMParser().parseFromString(await readFile(join(output, 'sitemap-0.xml'), 'utf8'), 'text/xml');
   const locations = [...sitemap.querySelectorAll('url > loc')].map(loc => loc.textContent);
   expect(locations).toContain(origin + pathname);
   expect(locations).not.toContain(origin + previewPath);
   expect(locations).not.toContain(origin + '/gallery/unpublished-fixture/');
  }
 } finally {
  await rm(temporary, { recursive: true, force: true });
 }
}, 300_000);
