# Siyuan Xue / 薛思远

An Astro static personal blog inspired by [Dario Amodei](https://darioamodei.com/), with Markdown content, serif typography, light/dark themes and an optional seven-tap portrait Easter egg.

- **English:** https://siyuanxue.com
- **中文：** https://xuesiyuan.com
- Each `www` hostname redirects to its own apex. Language links navigate to the same article on the other domain; browser language and stored preferences never override the domain.
- `xuesiyuan.com.cn` is retired from this website.

## Development

Use Bun 1.3.14 and Node.js ≥22.12. Install with `bun install --frozen-lockfile`.

```sh
bun run dev:en
bun run dev:zh
bun run check
bun run test
bun run build
bun run preview:en
bun run preview:zh
```

`SITE_LOCALE` accepts `en` or `zh` and defaults to English in local development. A production build renders each language independently under `.build/`, then assembles English in `dist/` and Chinese in `dist/zh/`. The internal directory is not a public language prefix. Both outputs are required for publication.

`bash ops/verify.sh` is the shared CI/deploy check. It requires Nginx and Python 3 in addition to the frontend runtimes; Nginx integration tests run an isolated process on loopback ports 18080/18443.

## Content

Site labels and lists are authored as `{ en, zh }` pairs in `src/data/site.ts`. Pages render only the selected language.

Each article has `en.md` and `zh.md` under `src/content/essays/<slug>/` or `src/content/posts/<slug>/`. Published pairs require matching dates and valid unique IDs. Missing translations or mismatched dates fail the build; a draft in either language excludes the pair. Article headings and TOC anchors come from the same Markdown renderer.

Each language has its own RSS feed at `/rss.xml`, sitemap, canonical URLs and reciprocal language alternates. Incomplete homepage entries are visibly marked; the compatibility `/wip/` page is not indexed.

## Assets and interaction

The normal portrait is optimized at build time with responsive AVIF/WebP/JPEG. The optional Romantic Mode uses a local neutral SVG; PhotoSwipe/GSAP load only after unlock or restoration of an unlocked session. The old secret photograph is removed, and its former URL is explicitly denied by Nginx even when reverting an older release.

Fonts are bundled locally using Fontsource. Chinese font files use Unicode ranges and are not referenced by English font CSS. Feature styles are separate from shared typography/layout. Transitive dependency overrides keep the affected packages above the security-fix versions; review them when updating Astro/Vite.

## Deployment

The tested English and Chinese outputs form one release, with a version-2 `release.json` and matching `__health` commit markers. Both domains move atomically through one `current` symlink; hashed assets are retained separately so old open pages can still load their chunks. Deployment consumes the artifact produced by the shared CI workflow, rather than rebuilding it.

See [operations](ops/README.md) for SSH, GitHub configuration, deployment and rollback, and [HTTPS migration](ops/HTTPS.md) for domain routing and certificate maintenance. Server operations use SSH first; Tencent OrcaTerm is the fallback.
