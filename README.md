# siyuanxue.com

Local project folder for the personal site at `siyuanxue.com`.

Personal site in the spirit of [darioamodei.com](https://darioamodei.com): narrow column, serif type, full bio, lists by genre — plus **EN / 中** language toggle (default **English**) next to the color-mode switch.

## Stack

```
Bun · Node ≥ 22.12 · Astro 7 · TypeScript 6 strict · plain CSS · static
```

Package manager and scripts: **Bun** (`bun install`, `bun run dev`, `bun run build`).

## Commands

```bash
bun install
bun run dev
bun run build
bun run preview
```

## Bilingual content

### Site chrome & lists

Edit `src/data/site.ts`. Every user-facing string is a `{ en, zh }` pair (`Bi` type).

### Essays & short posts

One folder per article; **both** locales required:

```
src/content/essays/<slug>/en.md
src/content/essays/<slug>/zh.md
src/content/posts/<slug>/en.md
src/content/posts/<slug>/zh.md
```

If either locale is missing, the article is skipped (console warning).

### How the toggle works

- Preference: `localStorage` key `site-lang` (`en` | `zh`)
- Default: **English** when unset
- UI strings and both article bodies ship in the HTML; CSS + `data-lang` show the active language (same idea as color mode)

## Deploy

```bash
bun run build   # → dist/
```

Pull requests are build-checked by GitHub Actions. A successful push to `main`
deploys `dist/` to the production server and rolls back automatically if the
post-deploy health check fails.

Production serves the site from `http://82.156.77.131` until DNS, ICP filing,
and HTTPS are configured separately. The canonical site URL used by Astro and
the sitemap is `https://siyuanxue.com`.

See [`ops/README.md`](ops/README.md) for one-time server bootstrap, GitHub
Environment configuration, deployment diagnostics, and manual rollback.
