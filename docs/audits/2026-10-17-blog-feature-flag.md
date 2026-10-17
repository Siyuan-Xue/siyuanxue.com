# Blog feature flag — 2026-10-17

The user asked for the blog to be hidden for now, not deleted, and for it to be easy to turn back on with a single setting. Baseline `main` = `779d441`.

## What made up the blog

| Surface | Location | Behaviour with the flag off |
|---|---|---|
| Essay and post pages | `src/pages/essay/[slug].astro`, `src/pages/post/[slug].astro` via `getEssays()` / `getPosts()` in `src/utils/content.ts` | Not built. Pairing (both translations, matching dates) is still validated. |
| Content | `src/content/essays/*`, `src/content/posts/*` | Unchanged. |
| Homepage section | `src/pages/index.astro` (`getBlog()`) | Omitted entirely; no empty heading or gap. |
| RSS feed | `src/pages/rss.xml.ts` | Returns an empty 404, so Astro writes no `rss.xml`. |
| Feed discovery link | `src/components/BaseHead.astro` | Not rendered. |
| Sitemaps, IndexNow manifest, canonical audit, language routes | `buildDiscoveryInventory()` in `src/utils/discovery.ts` | Blog pages left out. |
| BlogPosting JSON-LD, article Open Graph | Article pages only | Not emitted, because the pages are not built. |
| Chat starter "Find a good read" | `src/pages/chat.astro` | Hidden. |
| Header, mobile menu, footer, `robots.txt` | — | Had no blog link or rule; unchanged. |
| List, tag, pagination pages, Atom feed | — | Do not exist. |

## Design

- **One switch:** `src/features.ts` exports `BLOG_ENABLED`, default `false`. Re-enabling means setting that default to `true`, or reverting the "Turn the blog off" commit.
- **Test override:** the `BLOG_ENABLED` environment variable (`true`/`false`) overrides the default for a single build, so tests can check both modes. Production builds and CI use the default.
- **Old URLs:** a normal 404, not a redirect.
  - Both Nginx sites already use `error_page 404 /404.html`, so `/essay/…`, `/post/…` and `/rss.xml` get the localized `noindex` 404 page with a real 404 status. Its language link falls back to the other domain's home page.
  - A redirect to the homepage would be a soft 404 for search engines and would mislead visitors, which is wrong for content that is only temporarily hidden.
- **Search engines:** the next deploy removes the blog URLs from the sitemaps and the IndexNow manifest. `ops/indexnow.mjs` submits removed URLs as changed, so participating engines re-crawl and see the 404. Re-enabling restores and resubmits them.
- **Not changed:** the Hermes chat bridge is a separate server-side service. Its answers were not tested here and may still mention articles until it re-reads the site.

## Verification

| Mode | `bun run check` | `bun run test` | `bun run build` (en + zh) | `bun run test:gallery` |
|---|---|---|---|---|
| Off (default) | 0/0/0 | 265 pass | 0 warnings; 16 HTML routes, 11 indexable per locale; 53/53 output checks | pass |
| On (`BLOG_ENABLED=true`) | 0/0/0 | 265 pass | 0 warnings; 20 routes, 15 indexable per locale; 53/53 output checks | pass |

- **Flag on matches today's site:** the output was diffed against a build of `main`. Every file is byte-identical except `chat/index.html` in each locale, where only Astro's generated `astro-island` `uid` differs.
- **Flag off is clean:** a new output check confirms, per locale, that there is:
  - no `essay/`, `post/` or `rss.xml` in the output;
  - no blog URL in any HTML file or in `sitemap-0.xml`, `sitemap-images.xml`, `sitemap-videos.xml` or `indexnow-manifest.json`;
  - no RSS `<link>`, and no "Find a good read" chip;
  - no broken internal link: every root-relative `<a href>` in every page resolves to a built file or registered media.

  A manual grep of the output agreed.
- **Blog code stays covered:** the isolated gallery/essay-figure build always runs with the blog on.

Python 3.12 (via uv) was used locally for the Python-backed tests. The Nginx configuration test needs Nginx and is left to CI.
