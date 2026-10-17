import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMParser, parseHTML } from 'linkedom';
import { imageMedia } from '../src/utils/media';

const project = fileURLToPath(new URL('../', import.meta.url));
const pathname = '/gallery/published-fixture/';
const previewPath = '/gallery/layout-preview/';
const variants = [
 { locale: 'en', language: 'en', origin: 'https://siyuanxue.com' },
 { locale: 'zh', language: 'zh-CN', origin: 'https://xuesiyuan.com' },
];
type Fixture = {
 title: string; description: string; period?: string; homeMeta?: string; role: string; draft: boolean; preview: boolean;
 images: { src: string; alt: string; caption: string }[];
 imageSections?: { title: string; start: number }[];
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
  const contextDirectory = join(temporary, 'src/content/galleries/context-fixture');
  await mkdir(contextDirectory);
  for (const { locale } of variants) {
   const file = join(temporary, 'src/content/galleries/layout-preview', `${locale}.json`);
   const fixture: Fixture = JSON.parse(await readFile(file, 'utf8'));
   expect(fixture.draft).toBe(true);
   expect(fixture.images).toHaveLength(4);
   expect(fixture.links.length).toBeGreaterThan(0);
   delete fixture.period;
   fixture.imageSections = [{ title: locale === 'en' ? 'University team' : '校排球队', start: 0 }, { title: locale === 'en' ? 'College team' : '院排球队', start: 2 }];
   fixtures.set(locale, fixture);
   await writeFile(join(draftDirectory, `${locale}.json`), JSON.stringify(fixture));
   await writeFile(join(publishedDirectory, `${locale}.json`), JSON.stringify({ ...fixture, draft: false, preview: false }));
   await writeFile(join(contextDirectory, `${locale}.json`), JSON.stringify({ ...fixture, draft: false, preview: false, period: 'Gallery background', homeMeta: 'Homepage context' }));
  }

  // Keep a draft copy to verify exclusion and media validation alongside the published essay.
  const essayDirectory = join(temporary, 'src/content/essays/figure-fixture');
  await mkdir(essayDirectory);
  for (const { locale } of variants) {
   const published = await readFile(join(temporary, 'src/content/essays/embodied-agent', `${locale}.md`), 'utf8');
   expect(published).toContain('draft: false');
   await writeFile(join(essayDirectory, `${locale}.md`), published.replace('draft: false', 'draft: true'));
  }

  for (const { locale, language, origin } of variants) {
   const build = spawnSync('node', ['node_modules/astro/bin/astro.mjs', 'build'], {
    // Bun tests set NODE_ENV=test; the child must model a production deployment.
    // The essay-figure pipeline is checked with the blog on, so it stays covered while hidden.
    cwd: temporary, env: { ...process.env, NODE_ENV: 'production', SITE_LOCALE: locale, ASTRO_TELEMETRY_DISABLED: '1', BLOG_ENABLED: 'true' },
    encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
   });
   if (build.error || build.status !== 0) throw new Error(`Astro ${locale} fixture build failed: ${build.error ?? build.signal ?? build.status}\n${build.stdout}\n${build.stderr}`);
   const output = join(temporary, '.build', locale);
   const essayHtml = await readFile(join(output, 'essay/embodied-agent/index.html'), 'utf8');
   const { document: essay } = parseHTML(essayHtml);
   const essayFigures = [...essay.querySelectorAll('.prose figure.essay-figure')];
   expect(essayFigures).toHaveLength(4);
   for (const [index, id] of ['architecture', 'orchestration', 'generation', 'pipelines'].entries()) {
    const figure = essayFigures[index];
    const asset = imageMedia(`essays/embodied-agent/${id}`);
    const anchor = figure.querySelector('a')!;
    const caption = figure.querySelector('figcaption')!;
    const image = figure.querySelector('img')!;
    expect(anchor.getAttribute('href')).toBe(asset.src);
    expect(anchor.getAttribute('aria-describedby')).toBe(caption.id);
    expect(image.getAttribute('alt')!.length).toBeGreaterThan(20);
    expect(caption.textContent).toStartWith(locale === 'en' ? `Figure ${index + 1}.` : `图 ${index + 1}.`);
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(figure.querySelectorAll('picture source')).toHaveLength(2);
    expect(asset.variants.some(file => file.src === image.getAttribute('src'))).toBe(true);
   }
   expect(essayHtml).not.toContain('<!-- figure:');
   expect(essay.querySelectorAll('.prose h2')).toHaveLength(4);
   for (const heading of essay.querySelectorAll('.prose h2')) {
    expect(essay.querySelector(`a[href="#${heading.id}"]`)).not.toBeNull();
   }
   expect(essay.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(origin + '/essay/embodied-agent/');
   expect(await access(join(output, 'essay/figure-fixture/index.html')).then(() => true, () => false)).toBe(false);
   const fixture = fixtures.get(locale)!;
   const { document: preview } = parseHTML(await readFile(join(output, previewPath, 'index.html'), 'utf8'));
   expect(preview.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
   expect(preview.querySelectorAll('article[data-gallery-page] figure')).toHaveLength(4);
   expect(preview.querySelectorAll('.gallery-photo-section')).toHaveLength(0);
   expect(preview.querySelector('.gallery-period')).not.toBeNull();
   expect(preview.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(origin + previewPath);
   expect(JSON.parse(await readFile(join(temporary, 'src/content/galleries/layout-preview', `${locale}.json`), 'utf8')).draft).toBe(true);
   const { document } = parseHTML(await readFile(join(output, pathname, 'index.html'), 'utf8'));
   const gallery = document.querySelector('article[data-gallery-page]')!;
   expect(gallery).not.toBeNull();
   expect(document.documentElement.lang).toBe(language);
   expect(gallery.querySelector('h1')?.textContent).toBe(fixture.title);
   for (const text of [fixture.description, fixture.role]) expect(gallery.textContent).toContain(text);
   expect(gallery.querySelector('.gallery-period')).toBeNull();
   expect(document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '').not.toContain('noindex');
   expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(origin + pathname);
   for (const [lang, domain] of [['en', 'https://siyuanxue.com'], ['zh-CN', 'https://xuesiyuan.com'], ['x-default', 'https://siyuanxue.com']]) {
    expect(document.querySelector(`link[hreflang="${lang}"]`)?.getAttribute('href')).toBe(domain + pathname);
   }

   const figures = [...gallery.querySelectorAll('figure')];
   expect(figures).toHaveLength(4);
   const sections = [...gallery.querySelectorAll('.gallery-photo-section')];
   expect(sections).toHaveLength(2);
   sections.forEach((section, index) => {
    const heading = section.querySelector('h2')!;
    expect(heading.textContent).toBe(fixture.imageSections![index].title);
    expect(section.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(section.querySelectorAll('figure')).toHaveLength(2);
   });
   expect(new Set(figures.map(figure => figure.querySelector('figcaption')!.id)).size).toBe(4);
   expect(figures.map(figure => figure.querySelector('img')!.getAttribute('loading'))).toEqual(['eager', 'lazy', 'lazy', 'lazy']);
   const originals: string[] = [];
   for (const [index, figure] of figures.entries()) {
    const expected = fixture.images[index];
    const image = figure.querySelector('img')!;
    const anchor = figure.querySelector('a[data-gallery-image]')!;
    expect(figure.querySelector('figcaption')?.textContent).toBe(expected.caption);
    expect(image.getAttribute('alt')).toBe(expected.alt);
    const original = anchor.getAttribute('href')!;
    expect(original).toStartWith('/media/');
    originals.push(new URL(original, origin).href);
    const dimensions = imageMedia(expected.src);
    expect(original).toBe(dimensions.src);
    expect(await access(join(output, original)).then(() => true, () => false)).toBe(false);
    expect(Number(anchor.getAttribute('data-width'))).toBe(dimensions.width!);
    expect(Number(anchor.getAttribute('data-height'))).toBe(dimensions.height!);
    expect(Number(image.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(image.getAttribute('height'))).toBeGreaterThan(0);
    for (const candidate of figure.querySelectorAll('img[src],source[srcset]')) {
     const sources = candidate.getAttribute('srcset')?.split(',').map(value => value.trim().split(/\s+/)[0]) ?? [candidate.getAttribute('src')!];
     const registered = [dimensions.src, ...dimensions.variants.map(file => file.src)];
     for (const asset of sources) expect(registered).toContain(asset);
    }
   }
   for (const link of fixture.links) {
    expect([...gallery.querySelectorAll('.gallery-links a')].some(anchor => anchor.getAttribute('href') === link.href && anchor.textContent === link.label)).toBe(true);
   }

   const coverUrl = document.querySelector('meta[property="og:image"]')!.getAttribute('content')!;
   expect(new URL(coverUrl).origin).toBe(origin);
   const sourceCover = imageMedia(fixture.images[0].src);
   const cover = sourceCover.cover;
   expect(new URL(coverUrl).pathname).toBe(cover.src);
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
   expect(homeLinks[0].closest('li')?.querySelector('.bullet-list_meta')).toBeNull();
   const contextLink = home.querySelector('a[href="/gallery/context-fixture/"]')!;
   expect(contextLink.closest('li')?.querySelector('.bullet-list_meta')?.textContent?.trim()).toBe('(Homepage context)');
   const { document: contextGallery } = parseHTML(await readFile(join(output, 'gallery/context-fixture/index.html'), 'utf8'));
   expect(contextGallery.querySelector('.gallery-period')?.textContent).toBe('Gallery background');
   expect(contextGallery.querySelector('.gallery-period')?.textContent).not.toContain('Homepage context');
   const legacyLink = home.querySelector('a[href="/gallery/yuheng/"]')!;
   expect(legacyLink.closest('li')?.querySelector('.bullet-list_meta')).toBeNull();
   expect(home.querySelector(`a[href="${previewPath}"]`)).toBeNull();
   expect(home.querySelector('a[href="/gallery/unpublished-fixture/"]')).toBeNull();
   expect(home.querySelector('a[href="/essay/embodied-agent/"]')).not.toBeNull();
   expect(home.querySelector('a[href="/essay/figure-fixture/"]')).toBeNull();
   expect(await access(join(output, 'gallery/unpublished-fixture/index.html')).then(() => true, () => false)).toBe(false);
   const sitemap = new DOMParser().parseFromString(await readFile(join(output, 'sitemap-0.xml'), 'utf8'), 'text/xml');
   const locations = [...sitemap.querySelectorAll('url > loc')].map(loc => loc.textContent);
   expect(locations).toContain(origin + pathname);
   expect(locations).not.toContain(origin + previewPath);
   expect(locations).not.toContain(origin + '/gallery/unpublished-fixture/');
   expect(locations).not.toContain(origin + '/essay/figure-fixture/');
   expect(locations).toContain(origin + '/essay/embodied-agent/');
  }
  const draftFile = join(essayDirectory, 'en.md');
  await writeFile(draftFile, (await readFile(draftFile, 'utf8')).replace('src: essays/embodied-agent/architecture', 'src: essays/embodied-agent/missing'));
  const invalid = spawnSync('node', ['node_modules/astro/bin/astro.mjs', 'build'], {
   cwd: temporary, env: { ...process.env, NODE_ENV: 'production', SITE_LOCALE: 'en', ASTRO_TELEMETRY_DISABLED: '1' },
   encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
  });
  expect(invalid.status).not.toBe(0);
  expect(invalid.stdout + invalid.stderr).toContain('Unknown image media ID: essays/embodied-agent/missing');
 } finally {
  await rm(temporary, { recursive: true, force: true });
 }
}, 300_000);
