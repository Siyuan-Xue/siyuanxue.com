# Full-site audit — 2026-10-16

Scope: the bilingual Astro site (`SITE_LOCALE=en|zh`, built twice, served as `siyuanxue.com` and `xuesiyuan.com`), audited at `main` = `4fb985d` before any change on branch `audit/full-site-upgrade-2026-10-16`. Server services (`services/`, Nginx, Hermes, bridge, media install) were read only where the website depends on them; they are not changed by this work.

## Method and baseline

- Read every file under `src/`, `scripts/`, `astro.config.mjs`, the CI workflows, `ops/verify.sh`, the tests, `README.md`, `AGENTS.md` and the maintenance checklist.
- Baseline commands on macOS (Bun 1.4.2, Node 26.9): `bun run check` 0 errors / 0 warnings / 0 hints; `bun run build` passed for both locales with no warnings (20 audited HTML routes, 15 indexable per locale; 51 output checks); `bun run test:gallery` passed; `bun run test` 273 pass / 2 fail. Both failures are in `tests/media-upload.test.ts` and come from this machine's Python 3.9 (`hashlib.file_digest` needs Python 3.11+). CI runs Ubuntu 24.04 with Python 3.12, so they are environmental, not regressions.
- Rendered the production build of both locales with headless Chromium (Playwright) at 320, 360, 390, 768 and 1280px, light and dark, for the home, essay, gallery and chat pages (80 captures plus expanded-header captures). No horizontal overflow, no wrapped top-bar controls and no console errors were found at baseline.
- Measured bundles (gzip): chat route about 310 KB of JS (React client 57 KB, ChatApp 85 KB, Streamdown/Shiki/Mermaid chunk 143 KB, GSAP 27 KB); shared header chunk 6.9 KB; PhotoSwipe CSS is linked render-blocking on the home and gallery pages.
- Computed WCAG contrast for every palette pair used for text.

Severity: **High** = user-visible defect, accessibility failure or significant dead weight; **Medium** = maintainability or performance cost with real impact; **Low** = polish or hygiene.

## 1. Code design

| # | Finding | Location | Severity | Proposed fix | Decision |
|---|---|---|---|---|---|
| 1.1 | The pre-React vanilla chat implementation is still shipped in the repo and tested, but nothing imports it. It is about 400 lines of code plus 4 test files, and it is the only user of the `marked` and `entities` dependencies. | `src/utils/chat.ts`, `chat-ui.ts`, `chat-session.ts`, `chat-markdown.ts`; `tests/chat.test.ts`, `chat-ui.test.ts`, `chat-session.test.ts`, `chat-markdown.test.ts` | High | Delete the modules and tests and drop `marked` and `entities`. Legacy session migration stays, because `chat-persistence.ts` reads the old `xiaoxue-chat:v1` key itself. | Fix |
| 1.2 | Two animation runtimes: Motion (header) and GSAP (portrait lightbox and chat thinking indicator). GSAP adds 27 KB gzip to the chat page only to rotate one SVG path. | `src/utils/romanticLightboxMotion.ts`, `src/components/chat/ThinkingIndicator.tsx` | High | Drive the lightbox timeline with the Web Animations API and the indicator with native SVG animation. Keep the tested motion spec unchanged and remove `gsap`. | Fix |
| 1.3 | The gallery script listens for `astro:page-load` / `astro:before-swap`, but the site has no `<ClientRouter />`, so the listeners never fire. | `src/components/GalleryContent.astro` | Low | Bind once. | Fix |
| 1.4 | UI strings are scattered as inline `{ en, zh }` literals and `locale === 'en' ? … : …` ternaries, and some are duplicated: chat labels for home and light/dark repeat `site.ui`, "Chat with xue" is defined twice, and the TOC, 404, WIP, loader and gallery labels are inline. | `Header.astro`, `Toc.astro`, `404.astro`, `wip.astro`, `BulletList.astro`, `LoadingBlocks.astro`, `GalleryContent.astro`, `chat/chat-chrome.ts`, `utils/discovery.ts` | Medium | Move all chrome strings to `site.ui` as typed `Bi` pairs, read them with `t()` (or `[locale]` in React), and delete `chat-chrome.ts`. | Fix |
| 1.5 | Locale pairing logic is duplicated: `pairEntries` and `pairGalleries` each re-implement id parsing, duplicate detection and missing-translation errors. The layout-sample slug is hard-coded in two files. | `src/utils/contentPairs.ts`, `src/utils/gallery.ts`, `src/utils/galleries.ts`, `src/utils/discovery.ts` | Medium | Extract one `groupLocalePairs()` and share `GALLERY_PREVIEW_SLUG`. | Fix |
| 1.6 | Dead exports: `DEFAULT_LOCALE`, `LOCALES`, `formatDate`, `site.ui.switchToEnglish`/`switchToChinese`/`essays`/`posts`/`externalWriting`, and `site.externalWriting`. `WIP_HREF` exists but `'/wip/'` is still hard-coded elsewhere. | `src/i18n/types.ts`, `src/utils/content.ts`, `src/data/site.ts`, `BulletList.astro`, `gallery.ts` | Low | Remove the dead exports and use `WIP_HREF` everywhere. | Fix |
| 1.7 | `prefers-reduced-motion` is declared twice in `base.css` with slightly different rules. | `src/styles/base.css` | Low | Merge into one block. | Fix |
| 1.8 | `romanticMode.ts` wraps a boolean in a state machine (`{ state: { active } }`). It is harmless, covered by tests and imported by three modules. | `src/utils/romanticMode.ts` | Low | Simplify to a boolean later. | Deferred: churn without user benefit |
| 1.9 | Mixed file naming (`chat-client.ts` vs `headerActions.ts`) and mixed indentation (tabs, 1 and 2 spaces). No formatter is configured. | `src/utils/*`, `romanticPortraitFeature.ts` | Low | Adopt one formatter in a dedicated change. | Deferred: needs a new dev dependency and a repo-wide reformat that would bury this PR's diff |
| 1.10 | The language-switch route list re-collects the content collections instead of reusing the discovery inventory, because the inventory does not carry `draft`. | `src/utils/langSwitchContent.ts` | Low | Add `draft` to the inventory and reuse it. | Deferred: the inventory JSON is a build artifact read by ops tooling, so leave its shape unchanged |
| 1.11 | Unit tests cover state, hints, header, TOC, chat and discovery well. There are no browser-level tests for real layout (overflow, top-bar wrap, tap targets). | `tests/` | Medium | Keep the Playwright probe used for this audit as a documented manual check. | Partially fixed: documented here; adding Playwright to CI is a separate decision because it is a new dependency |

## 2. Platform-native alternatives

| # | Candidate | Finding | Decision |
|---|---|---|---|
| 2.1 | `100vh` | `body` and `.page-wrapper` use `min-height: 100vh`. On iOS this is the large viewport, so short pages (404, WIP) scroll while the toolbar is shown. | Fix: `100vh` fallback plus `100svh` |
| 2.2 | Web Animations API / SVG animation | See 1.2: GSAP duplicates what the platform does natively. | Fix |
| 2.3 | `light-dark()` | It would collapse the explicit-dark and no-JS dark palettes into one. But the palette is made of registered `@property` colors with a light `initial-value`, so a browser without `light-dark()` (Safari < 17.5) would silently fall back to the light palette in dark mode. The two palettes are already kept identical by a test. | Deferred: keep duplication guarded by test |
| 2.4 | `color-scheme` / `prefers-color-scheme` | Already native: the meta tag pair and the root `color-scheme` are set before first paint. | No change |
| 2.5 | `prefers-reduced-motion` | Honoured by CSS, Motion, the PhotoSwipe options and the chat. | No change (merged per 1.7) |
| 2.6 | `<dialog>` / popover for the mobile TOC and the header action row | Both are custom disclosures with `inert`, Escape and focus-return logic that AGENTS.md specifies in detail. Popover light-dismiss and top-layer stacking would change the documented order of Escape handling and the header visibility lock. | Deferred: high regression risk for no visible gain |
| 2.7 | `<details>` for chat starters | Already native. | No change |
| 2.8 | Container queries / `:has()` | `:has()` is already used for the composer and the crowded header. No component needs container queries yet. | No change |
| 2.9 | Scroll-driven animations | The header hide/show depends on scroll *direction*, which CSS scroll timelines cannot express in Safari. | No change |
| 2.10 | Native lazy loading / `fetchpriority` / `decoding` | Already used for gallery and essay figures. | No change |
| 2.11 | `text-wrap: balance` / `pretty` | Only essay titles use them. Gallery titles wrap with a single orphan word ("Ye / Peida"). | Fix: balance all page titles |
| 2.12 | Astro i18n routing | Each locale is its own domain and static build. Astro's `i18n.domains` requires server output. | Not applicable |
| 2.13 | Astro `<Image>` | Media lives outside Git on the server, with its own Sharp pipeline and `<picture>` variants (`MediaPicture.astro`). Astro cannot optimise images it does not own. | Not applicable |
| 2.14 | Astro `<ClientRouter />` / cross-document view transitions | The site has no custom page-transition code to replace. Adding transitions would be a new visible behaviour. | Not applicable |
| 2.15 | Content collections | Already used for essays, posts and galleries. | No change |

## 3. UI/UX and accessibility

| # | Finding | Location | Severity | Proposed fix | Decision |
|---|---|---|---|---|---|
| 3.1 | WCAG AA contrast failures in light mode. Inactive TOC links use opacity 0.5 (3.13:1). Essay figure captions use a 50% ink mix (3.13:1). Chat placeholder, identity labels and the disclaimer use `--fg-faint` (3.15:1 on the page, 3.47:1 on the composer). In dark mode the composer placeholder is 2.98:1. | `src/styles/article.css`, `src/components/chat/chat.css` | High | TOC opacity 0.65 (4.87:1 light, 6.76:1 dark). Captions use `--fg-muted` (5.67:1, 7.48:1). Chat text uses `--fg-muted`. `--fg-faint` stays for decorative and disabled states only. | Fix |
| 3.2 | Header controls are 36×36px from 768px up, including touch tablets (an iPad in portrait is 768–834px). | `src/styles/base.css`, `src/styles/header-actions.css` | High | Use 44px controls on `(pointer: coarse)` as well as ≤767px. Desktop mouse layout is unchanged. | Fix |
| 3.3 | Chat touch targets are below 44px on phones: starters 36px, send 36px, prompt chips 36px tall, message actions 40px. | `chat.css` | High | 44px hit areas on coarse pointers. Visual sizes are kept where an invisible hit area suffices. | Fix |
| 3.4 | Prompt chips use 11–12px text, which is hard to read in a serif face. | `chat.css` | Medium | Use 13px. | Fix |
| 3.5 | Home list links and gallery "Related material" links are 18–26px tall tap targets. | `base.css`, `gallery.css` | Medium | Extend the hit area vertically with a pseudo-element, without moving text. | Fix |
| 3.6 | The 404 page title is a browser-default `<h1>`, unlike every other page title. | `src/pages/404.astro` | Low | Use the shared `.post-title` style. | Fix |
| 3.7 | The WIP panel wraps a static `<h1>` in `role="status" aria-live`, which can announce on load in some screen readers. | `src/pages/wip.astro` | Low | Remove the live region. | Fix |
| 3.8 | On the chat page the site `<header>` is rendered inside `<main>`, so there is no banner landmark. | `src/components/chat/ChatApp.tsx`, `src/pages/chat.astro` | Low | Render the chat header outside `main`. | Deferred: the island owns both the header and the conversation state; splitting it is a larger refactor |
| 3.9 | At 320px the floated portrait leaves a narrow (about 9rem) bio column with 2–3 words per line. | `src/styles/romantic.css` | Low | Consider a smaller float or `text-wrap: pretty` on very small screens. | Fix: `text-wrap: pretty` on bio copy only (no layout change) |
| 3.10 | Focus states, keyboard order, Escape handling and `inert` behave as documented. | header, TOC, chat, lightboxes | — | — | No change |

## 4. Motion

| # | Finding | Location | Severity | Proposed fix | Decision |
|---|---|---|---|---|---|
| 4.1 | The gallery lightbox opens and closes with no transition (`showHideAnimationType: 'none'`), while the portrait lightbox uses a 1.1s choreographed open. The difference feels abrupt. | `src/utils/galleryLightbox.ts` | Medium | A 200ms fade in and 160ms fade out (exit slightly faster), 0ms with reduced motion. | Fix |
| 4.2 | Two motion runtimes with different easing vocabularies. | see 1.2 | Medium | One native WAAPI layer for the lightbox, with GSAP's named curves mapped to exact cubic-béziers; Motion springs stay for the header. | Fix |
| 4.3 | The thinking indicator morphs via GSAP every frame on the main thread. | `ThinkingIndicator.tsx` | Low | Use declarative SVG `<animate>` / `<animateTransform>`, omitted entirely for reduced motion. | Fix |
| 4.4 | Header hide/show animates `top` (160ms). This is a layout property, but a deliberate choice that keeps the fixed TOC's containing block intact; it is cheap for one sticky element. | `base.css` | Low | — | No change |
| 4.5 | Header row: spring open and 160ms close, interruptible, reduced-motion aware. Theme: 100ms linear (user requirement). Portrait reveal: 520–580ms ease-out with a symmetric close timer. | — | — | — | No change |

## 5. Cross-language and cross-domain behaviour

All verified by existing tests and the rendered build: build-time language links map to the same path on the other fixed-language domain and fall back to `/` for drafts or missing translations. Runtime `theme`, `header` and `media` hash hints are carried and cleaned. hreflang `en`, `zh-CN` and `x-default` are reciprocal, and canonical, `og:url` and the sitemaps never carry hints. No wrong-theme flash: the critical palette and the theme script run inline before any stylesheet or body content. **No defects found; no changes.**

## 6. Safari and iOS

| # | Finding | Decision |
|---|---|---|
| 6.1 | `100vh` on short pages (see 2.1). | Fix |
| 6.2 | One chat rule reads `env(safe-area-inset-bottom)` directly instead of the shared `--safe-area-bottom` used everywhere else. | Fix |
| 6.3 | Toolbar colour sync, the iPhone-only `data-header-tint` branch, `viewport-fit=cover` and the safe-area variables match the 2026-10-15 audits. | No change; real-device check remains manual |
| 6.4 | Overscroll shows the root canvas, which carries the theme background. | No change |

## 7. Performance

| # | Finding | Severity | Decision |
|---|---|---|---|
| 7.1 | GSAP in the chat page's eager graph (27 KB gzip). | High | Fix (1.2) |
| 7.2 | Chat page about 310 KB gzip of JS, mostly Streamdown's Markdown, Shiki and Mermaid stack, loaded before the first message. | Medium | Deferred: lazy-loading the renderer changes the streaming component's lifecycle and needs its own review |
| 7.3 | PhotoSwipe CSS (4.5 KB) is hoisted render-blocking into the home and gallery pages, because Astro collects CSS from dynamically imported chunks. | Low | Deferred: small, and moving it changes the cascade order that the lightbox overrides rely on |
| 7.4 | The zh base CSS is 113 KB raw / 39 KB gzip, almost all Fontsource `unicode-range` declarations for Noto Serif SC. | Low | No change: subsets download only on demand |
| 7.5 | The header chunk stays under the 8 KiB gzip budget. | — | No change |

## 8. SEO and metadata

| # | Finding | Decision |
|---|---|---|
| 8.1 | Titles, descriptions, Open Graph, Twitter, JSON-LD, sitemaps (pages, images, videos) and robots are generated from one audited inventory and pass the build-time discovery audit. | No change |
| 8.2 | The RSS feed has no `atom:link rel="self"` or `lastBuildDate`, which feed validators flag. | Fix |

## 9. Repository hygiene

| # | Finding | Decision |
|---|---|---|
| 9.1 | Unused dependencies: `@astrojs/sitemap` (the site writes its own sitemaps), plus `marked` and `entities` after 1.1 and `gsap` after 1.2. | Fix |
| 9.2 | No lint or format configuration. | Deferred (1.9) |
| 9.3 | CI (`ci.yml` → `ops/verify.sh`) runs check, tests, the Python and Nginx suites, the build and the gallery check; deploy reuses the verified artifact. | No change |
| 9.4 | README says PhotoSwipe and GSAP load on demand. | Fix after 1.2 |
| 9.5 | `AGENTS.md`, `docs/MAINTENANCE.md`, `docs/GALLERIES.md`, `docs/SEARCH.md` and every earlier audit are written in Chinese, and contributor docs are expected in English. They hold dated operational history, where a careless translation could change meaning. | Deferred to a dedicated translation change; new docs from this work are in English |
| 9.6 | The local test failure on Python 3.9 (see Baseline). | No change to ops code; CI uses Python 3.12 |

## Out of scope

Deployment workflow, secrets, DNS, server configuration, Hermes and the chat bridge, and media storage. Real iPhone Safari behaviour cannot be verified from this machine; see the manual checklist in the pull request.

## Resolution (same branch, 2026-10-16)

| Commit | Audit items | Change |
|---|---|---|
| `Remove the unused vanilla chat and dead exports` | 1.1, 1.6, 1.7, 9.1 | Deleted `src/utils/chat{,-ui,-session,-markdown}.ts` and their tests. Removed `marked`, `entities` and `@astrojs/sitemap`. Merged the reduced-motion blocks. |
| `Centralize interface copy and locale pairing` | 1.3–1.6, 3.6, 3.7 | Interface labels now live in `site.ts` (`ui`, `gallery`, `chat`). One `groupLocalePairs()`, one `pairGalleryPages()`, one `languageTag()`. The 404 and redirect titles use the title style. WIP is not a live region. The gallery binds once. |
| `Drive motion with native APIs and drop GSAP` | 1.2, 4.1–4.3, 7.1 | The lightbox uses Web Animations with the spec unchanged. The thinking ribbon uses SVG animation. The gallery lightbox fades 200/160ms. `gsap` removed. |
| `Meet WCAG AA contrast and 44px touch targets` | 2.1, 2.11, 3.1–3.5, 3.9, 6.2 | TOC opacity 0.65, muted captions and chat text, a new contrast test. 44px header controls on coarse pointers; chat hit areas and chips on touch; list-link row targets. `svh` heights, balanced titles, `text-wrap: pretty` bio. |
| `Add a self link and lastBuildDate to the RSS feeds` | 8.2 | Feeds are built from `getBlog()` with `atom:link rel="self"` and a content-derived `lastBuildDate`. |
| `Stop phone pages scrolling sideways past the main column` | new, found in verification | Pre-existing: once the portrait was revealed, the card reached 2–11px past the edge at 320–430px (Chromium and WebKit), and Safari's `hanging-punctuation` made the zh gallery 1px wide. `.page-main { overflow-x: clip }`. |

Deliberate deviation from the 2026-10-15 Dario reference: inactive TOC entries use opacity 0.65 instead of 0.5 so they meet WCAG AA. Essay captions use the muted token instead of a 50% ink mix.

Verification on the final branch head (macOS; Python 3.12 via uv for the Python-backed tests):

- `bun run check`: 0 errors, 0 warnings, 0 hints.
- `bun run test`: 261 pass, 0 fail.
- Python unit suites from `ops/verify.sh`: all OK. Six of the seven ops shell tests pass; `test-nginx-config.sh` needs Nginx, which is not installed locally, and is left to CI.
- `bun run build` (both locales): 0 warnings, 20 audited routes per locale, 51 output checks pass. `bun run test:gallery`: pass.
- Rendered both locales at 320/360/390/768/1280px, light and dark, home/essay/gallery/chat, in Chromium and WebKit (160 captures). All had 0px horizontal overflow, no wrapped top-bar row (collapsed or expanded) and no console errors.
- Interaction checks:
  - The portrait lightbox opens with the full sequence and closes on Escape, returning focus (Chromium).
  - The gallery lightbox fades in over about 200ms.
  - The chat indicator animates natively with no GSAP request, and is static under reduced motion.
  - `#theme=dark&header=open` on a light system paints dark before `<body>` exists, then cleans the hash and keeps the expanded row.
  - On a coarse-pointer tablet the header controls are 44×44px.
- JS (gzip, full static import graph): chat page 322.1 KB → 295.9 KB; home 8.5 KB, essay 7.1 KB (unchanged); the header chunk stays at 6.9 KB.

Still manual: real iPhone Safari (toolbar tint in both directions, safe areas, overscroll, keyboard with the chat composer), and the pre-existing WebKit focus-return difference after closing the portrait lightbox in Playwright's WebKit build. The deferred items above stay open.
