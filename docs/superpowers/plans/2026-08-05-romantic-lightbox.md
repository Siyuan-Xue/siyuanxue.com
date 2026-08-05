# Romantic Mode Editorial Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-built Romantic Mode large-image dialog with a PhotoSwipe-powered thumbnail zoom and the approved editorial-matte, corner-tab presentation.

**Architecture:** Keep the existing Romantic Mode state machine and lazy secret-thumbnail lifecycle. Add one pure utility for PhotoSwipe options and frame geometry, then let `RomanticPortrait.astro` initialize one scoped PhotoSwipe lightbox. PhotoSwipe owns open/close animation, focus, keyboard, and gestures; site CSS owns only the editorial frame and registered caption/close UI.

**Tech Stack:** Astro 7, TypeScript 6, Bun 1.3.14, PhotoSwipe 5.4.4, Bun test, CSS custom properties.

## Global Constraints

- Install exactly `photoswipe` 5.4.4 as a production dependency and bundle it locally.
- Do not implement a second FLIP animation, modal state machine, focus trap, or gesture layer.
- Preserve the seven-activation unlock flow, session persistence, on/off toggle, status messages, asset, caption wording, metadata, robots rule, and sitemap behavior.
- Keep `/images/p-202.jpg` absent from eager image tags, preload/prefetch hints, social metadata, structured data, and generated sitemaps.
- Use the approved editorial matte, double hairline, `VII · PRIVATE PROOF` edition mark, and corner-tab close control.
- Keep the full portrait uncropped in the large view and support widths down to 320 CSS pixels.
- Keep the close hit target at least 44 × 44 CSS pixels and localize its accessible label.
- Respect `prefers-reduced-motion`; PhotoSwipe must own the open/close animation suppression.
- Make no unrelated page, content, navigation, deployment, or HTTPS changes.

---

## File Map

- `package.json`: pin PhotoSwipe and include the new unit test in the standard test command.
- `bun.lock`: record the exact PhotoSwipe package resolution.
- `src/utils/romanticLightbox.ts`: pure PhotoSwipe option and frame-layout functions.
- `tests/romantic-lightbox.test.ts`: unit tests for layout and PhotoSwipe options.
- `src/components/RomanticPortrait.astro`: replace native dialog markup/handlers with a PhotoSwipe trigger, registered UI, localization, and layout synchronization.
- `src/styles/base.css`: remove native dialog styles and add the editorial PhotoSwipe skin.
- `tests/romantic-mode-output.check.ts`: guard production markup, lazy-loading/privacy, registered hooks, and compiled CSS.

---

### Task 1: Add the PhotoSwipe configuration boundary

**Files:**
- Create: `src/utils/romanticLightbox.ts`
- Create: `tests/romantic-lightbox.test.ts`
- Modify: `package.json`
- Modify: `bun.lock`

**Interfaces:**
- Consumes: PhotoSwipe types `Padding`, `PhotoSwipeOptions`, and `Point`.
- Produces: `ROMANTIC_LIGHTBOX_ASPECT`, `RomanticLightboxLayout`, `getRomanticLightboxLayout(viewport)`, and `createRomanticLightboxOptions(closeTitle)`.

- [ ] **Step 1: Write the failing layout and option tests**

Create `tests/romantic-lightbox.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
	createRomanticLightboxOptions,
	getRomanticLightboxLayout,
} from '../src/utils/romanticLightbox';

describe('Romantic Mode lightbox layout', () => {
	test('reserves an editorial caption margin on desktop', () => {
		const layout = getRomanticLightboxLayout({ x: 1280, y: 900 });

		expect(layout.padding).toEqual({ top: 36, bottom: 124, left: 40, right: 40 });
		expect(layout.mediaWidth).toBeCloseTo(493.333, 3);
		expect(layout.mediaHeight).toBeCloseTo(740, 3);
		expect(layout.mediaTop).toBeCloseTo(36, 3);
	});

	test('keeps the frame and corner tab inside a 320px viewport', () => {
		const layout = getRomanticLightboxLayout({ x: 320, y: 640 });

		expect(layout.padding).toEqual({ top: 28, bottom: 112, left: 16, right: 16 });
		expect(layout.mediaWidth).toBe(288);
		expect(layout.mediaHeight).toBe(432);
		expect(layout.mediaTop).toBe(62);
	});
});

describe('Romantic Mode PhotoSwipe options', () => {
	test('delegates zoom, focus, keyboard, and reduced-motion behavior to PhotoSwipe', () => {
		const options = createRomanticLightboxOptions('Close Romantic Mode portrait');

		expect(options).toMatchObject({
			mainClass: 'romantic-lightbox',
			showHideAnimationType: 'zoom',
			loop: false,
			arrowPrev: false,
			arrowNext: false,
			counter: false,
			close: false,
			zoom: false,
			escKey: true,
			trapFocus: true,
			returnFocus: true,
			bgClickAction: 'close',
			imageClickAction: 'zoom-or-close',
			doubleTapAction: 'zoom',
			closeTitle: 'Close Romantic Mode portrait',
		});

		expect(options.paddingFn?.({ x: 320, y: 640 }, {}, 0)).toEqual({
			top: 28,
			bottom: 112,
			left: 16,
			right: 16,
		});
	});
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
/tmp/siyuanxue-bun/bin/bun test ./tests/romantic-lightbox.test.ts
```

Expected: FAIL because `src/utils/romanticLightbox.ts` does not exist.

- [ ] **Step 3: Install the exact library version**

Run:

```bash
/tmp/siyuanxue-bun/bin/bun add --exact photoswipe@5.4.4
```

Verify `package.json` contains:

```json
"photoswipe": "5.4.4"
```

- [ ] **Step 4: Implement the minimal pure configuration utility**

Create `src/utils/romanticLightbox.ts`:

```ts
import type { Padding, PhotoSwipeOptions, Point } from 'photoswipe';

export const ROMANTIC_LIGHTBOX_ASPECT = 2 / 3;

export type RomanticLightboxLayout = Readonly<{
	padding: Padding;
	mediaWidth: number;
	mediaHeight: number;
	mediaTop: number;
}>;

export function getRomanticLightboxLayout(
	viewport: Pick<Point, 'x' | 'y'>,
): RomanticLightboxLayout {
	const compact = viewport.x <= 720;
	const side = compact ? 16 : 40;
	const top = compact ? 28 : 36;
	const bottom = compact ? 112 : 124;
	const availableWidth = Math.max(0, viewport.x - side * 2);
	const availableHeight = Math.max(0, viewport.y - top - bottom);
	const mediaWidth = Math.min(
		availableWidth,
		availableHeight * ROMANTIC_LIGHTBOX_ASPECT,
	);
	const mediaHeight = mediaWidth / ROMANTIC_LIGHTBOX_ASPECT;
	const mediaTop = top + (availableHeight - mediaHeight) / 2;

	return {
		padding: { top, bottom, left: side, right: side },
		mediaWidth,
		mediaHeight,
		mediaTop,
	};
}

export function createRomanticLightboxOptions(closeTitle: string): PhotoSwipeOptions {
	return {
		mainClass: 'romantic-lightbox',
		showHideAnimationType: 'zoom',
		bgOpacity: 0.78,
		loop: false,
		arrowKeys: false,
		arrowPrev: false,
		arrowNext: false,
		counter: false,
		close: false,
		zoom: false,
		escKey: true,
		trapFocus: true,
		returnFocus: true,
		bgClickAction: 'close',
		imageClickAction: 'zoom-or-close',
		tapAction: 'toggle-controls',
		doubleTapAction: 'zoom',
		preload: [0, 0],
		closeTitle,
		paddingFn: (viewport) => getRomanticLightboxLayout(viewport).padding,
	};
}
```

- [ ] **Step 5: Add the new test to the normal unit-test command**

Change the `test` script in `package.json` to:

```json
"test": "bun test ./tests/romantic-mode.test.ts ./tests/romantic-lightbox.test.ts"
```

- [ ] **Step 6: Run focused and full unit tests and verify GREEN**

Run:

```bash
/tmp/siyuanxue-bun/bin/bun test ./tests/romantic-lightbox.test.ts
/tmp/siyuanxue-bun/bin/bun run test
```

Expected: all Romantic Mode state and lightbox configuration tests pass with zero failures.

- [ ] **Step 7: Commit the configuration boundary**

```bash
git add package.json bun.lock src/utils/romanticLightbox.ts tests/romantic-lightbox.test.ts
git commit -m "Add Romantic Mode lightbox configuration"
```

---

### Task 2: Replace native dialog markup with a PhotoSwipe-ready trigger

**Files:**
- Modify: `src/components/RomanticPortrait.astro:14-136,147-400`
- Modify: `tests/romantic-mode-output.check.ts`

**Interfaces:**
- Consumes: existing `site.secretPortrait` URL, intrinsic size, localized alt/caption/labels, and lazy `secretImage` creation.
- Produces: one anchor marked `data-romantic-lightbox-trigger`, intrinsic PhotoSwipe attributes, localized root data, and no native dialog surface.

- [ ] **Step 1: Add a failing production-markup test**

Append inside `describe('Romantic Mode production output', ...)`:

```ts
test('emits one PhotoSwipe trigger without the previous native dialog', () => {
	const html = readFileSync(indexPath, 'utf8');

	expect(html).toContain('data-romantic-lightbox');
	expect(html).toContain('data-romantic-lightbox-trigger');
	expect(html).toContain('data-pswp-width="1200"');
	expect(html).toContain('data-pswp-height="1800"');
	expect(html).toContain('data-proof-label="VII · PRIVATE PROOF"');
	expect(html).not.toMatch(/<dialog\b/i);
	expect(html).not.toContain('data-romantic-dialog');
	expect(html).not.toContain('data-romantic-dialog-close');
});
```

- [ ] **Step 2: Run the production-output test and verify RED**

Run:

```bash
/tmp/siyuanxue-bun/bin/bun run build
/tmp/siyuanxue-bun/bin/bun run test:output
```

Expected: FAIL because the page still contains `<dialog>` and does not contain the PhotoSwipe trigger hooks.

- [ ] **Step 3: Change the secret card from a button to a semantic image link**

Add these attributes to the Romantic Portrait root:

```astro
data-romantic-lightbox
data-caption-en={secret.caption.en}
data-caption-zh={secret.caption.zh}
data-proof-label="VII · PRIVATE PROOF"
```

Replace the current secret-card `<button>` with:

```astro
<a
	id="romantic-secret-card"
	class="romantic-portrait_secret loading-slot"
	href={secret.src}
	data-secret-card
	data-romantic-lightbox-trigger
	data-pswp-width={secret.width}
	data-pswp-height={secret.height}
	aria-label={secret.dialogLabel.en}
	aria-describedby={captionId}
	hidden
>
	<span class="loading-slot_indicator loading-slot_indicator--veil" data-secret-loader>
		<LoadingBlocks size="md" tone="faint" decorative />
	</span>
	<span class="romantic-portrait_secret-media" data-secret-image-slot></span>
</a>

<p id={captionId} class="u-sr-only" data-romantic-lightbox-description>
	<span class="i18n-en" lang="en">{secret.caption.en}</span>
	<span class="i18n-zh" lang="zh-CN">{secret.caption.zh}</span>
</p>
```

- [ ] **Step 4: Remove the native dialog and manual dialog state**

Delete the entire `<dialog data-romantic-dialog>` block. In the client script:

- query the secret card as `HTMLAnchorElement`;
- remove the `dialog`, `dialogImageSlot`, `dialogLoadingSlot`, and `closeButton` queries;
- remove `dialogImage` and `dialogOpener` state;
- remove `ensureDialogImage`, `secretCard`'s manual dialog click listener, `closeDialog`, and all native dialog event listeners;
- remove dialog and close-button localization writes from `syncLanguage`.

The required-element guard should become:

```ts
if (
	!trigger ||
	!primaryImage ||
	!secretCard ||
	!secretImageSlot ||
	!status
) {
	return;
}
```

The secret-card query should become:

```ts
const secretCard = root.querySelector<HTMLAnchorElement>('[data-secret-card]');
```

- [ ] **Step 5: Rebuild and verify the markup contract is GREEN**

Run:

```bash
/tmp/siyuanxue-bun/bin/bun run build
/tmp/siyuanxue-bun/bin/bun run test:output
/tmp/siyuanxue-bun/bin/bun run test
```

Expected: the new markup test and all existing lazy-asset, metadata, robots, image-contract, and state-machine tests pass.

- [ ] **Step 6: Commit the semantic trigger migration**

```bash
git add src/components/RomanticPortrait.astro tests/romantic-mode-output.check.ts
git commit -m "Prepare Romantic Mode portrait for PhotoSwipe"
```

---

### Task 3: Initialize PhotoSwipe and register the localized UI

**Files:**
- Modify: `src/components/RomanticPortrait.astro:138-400`

**Interfaces:**
- Consumes: `createRomanticLightboxOptions(closeTitle)` and `getRomanticLightboxLayout(viewport)` from Task 1; PhotoSwipe trigger markup from Task 2.
- Produces: one initialized `PhotoSwipeLightbox`, deferred `photoswipe` core import, custom `romantic-caption` and `romantic-close` UI elements, thumbnail origin filtering, and CSS layout variables.

- [ ] **Step 1: Verify the real pre-implementation behavior is RED**

Build and open the existing site in the in-app browser. Unlock Romantic Mode, click the second portrait, and record that the current native dialog appears without a thumbnail-origin zoom. This is the real behavior the integration must replace; do not substitute a source-text assertion.

- [ ] **Step 2: Add supported PhotoSwipe imports and initialize one scoped lightbox**

At the top of the client script, add:

```ts
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import {
	createRomanticLightboxOptions,
	getRomanticLightboxLayout,
} from '../utils/romanticLightbox';
```

After `localized` is defined, add:

```ts
let lightboxCaptionText: HTMLElement | null = null;
let lightboxProof: HTMLElement | null = null;
let lightboxClose: HTMLElement | null = null;

const lightbox = new PhotoSwipeLightbox({
	gallery: root,
	children: '[data-romantic-lightbox-trigger]',
	pswpModule: () => import('photoswipe'),
	...createRomanticLightboxOptions(localized('closeLabel')),
});

lightbox.addFilter('thumbEl', () => secretImage ?? secretCard);
```

- [ ] **Step 3: Register the approved caption and corner-tab close UI**

Add before `lightbox.init()`:

```ts
lightbox.on('uiRegister', () => {
	const pswp = lightbox.pswp;
	if (!pswp) return;

	pswp.ui.registerElement({
		name: 'romantic-caption',
		className: 'romantic-lightbox_caption',
		appendTo: 'root',
		onInit: (element) => {
			lightboxCaptionText = document.createElement('span');
			lightboxCaptionText.className = 'romantic-lightbox_caption-text';
			lightboxProof = document.createElement('small');
			lightboxProof.className = 'romantic-lightbox_proof';
			lightboxProof.textContent = root.dataset.proofLabel ?? '';
			element.append(lightboxCaptionText, lightboxProof);
		},
	});

	pswp.ui.registerElement({
		name: 'romantic-close',
		className: 'romantic-lightbox_close',
		appendTo: 'root',
		isButton: true,
		ariaLabel: localized('closeLabel'),
		html: '<span aria-hidden="true">×</span>',
		onClick: 'close',
		onInit: (element) => {
			lightboxClose = element;
		},
	});
});
```

- [ ] **Step 4: Synchronize frame geometry with PhotoSwipe's padding**

Add:

```ts
const syncLightboxLayout = () => {
	const pswp = lightbox.pswp;
	if (!pswp?.element) return;
	const layout = getRomanticLightboxLayout(pswp.viewportSize);
	const properties = {
		'--romantic-lightbox-media-width': layout.mediaWidth,
		'--romantic-lightbox-media-half-width': layout.mediaWidth / 2,
		'--romantic-lightbox-media-height': layout.mediaHeight,
		'--romantic-lightbox-media-top': layout.mediaTop,
	};

	for (const [name, value] of Object.entries(properties)) {
		pswp.element.style.setProperty(name, `${value}px`);
	}
};

lightbox.on('afterInit', syncLightboxLayout);
lightbox.on('resize', syncLightboxLayout);
```

- [ ] **Step 5: Extend existing language synchronization to open UI**

At the end of `syncLanguage`, add:

```ts
const caption = localized('caption');
const closeLabel = localized('closeLabel');
lightbox.options.closeTitle = closeLabel;
if (lightbox.pswp) lightbox.pswp.options.closeTitle = closeLabel;
if (lightboxCaptionText) lightboxCaptionText.textContent = caption;
if (lightboxProof) lightboxProof.textContent = root.dataset.proofLabel ?? '';
if (lightboxClose) lightboxClose.setAttribute('aria-label', closeLabel);
```

Call `syncLanguage()` inside each registered element's `onInit` after storing its element reference so UI created during open is immediately localized.

- [ ] **Step 6: Initialize after all filters and events are registered**

Add once near the existing final initialization block:

```ts
lightbox.init();
```

Do not add a second click handler to the secret link. PhotoSwipe's documented gallery binding must own opening and fallback-to-link behavior.

- [ ] **Step 7: Run focused, full, build, and output tests and verify GREEN**

Run:

```bash
/tmp/siyuanxue-bun/bin/bun test ./tests/romantic-lightbox.test.ts
/tmp/siyuanxue-bun/bin/bun run test
/tmp/siyuanxue-bun/bin/bun run build
/tmp/siyuanxue-bun/bin/bun run test:output
```

Expected: all tests pass; the build emits locally bundled PhotoSwipe JS and CSS with no runtime-CDN reference.

- [ ] **Step 8: Verify the real integration behavior is GREEN**

Open the rebuilt site in the same browser workflow, unlock Romantic Mode, and click the second portrait. Confirm PhotoSwipe opens from the actual thumbnail, Escape closes it, and focus returns to the trigger. The visual skin is completed in Task 4; this step verifies the real library lifecycle before styling.

- [ ] **Step 9: Commit the PhotoSwipe runtime integration**

```bash
git add src/components/RomanticPortrait.astro
git commit -m "Use PhotoSwipe for Romantic Mode portrait"
```

---

### Task 4: Apply the editorial matte and corner-tab skin

**Files:**
- Modify: `src/styles/base.css:762-846,868-872,1525-1527`
- Modify: `tests/romantic-mode-output.check.ts`

**Interfaces:**
- Consumes: PhotoSwipe's `.pswp__img`, `.pswp__bg`, and `.pswp--zoomed-in` documented classes; Task 3's `.romantic-lightbox_caption`, `.romantic-lightbox_close`, and CSS geometry variables.
- Produces: token-based backdrop, paper matte, double hairline, bilingual caption, proof mark, corner-tab close control, zoom-state decluttering, and responsive/reduced-motion styling.

- [ ] **Step 1: Add a failing compiled-CSS contract test**

Append inside the production-output describe block:

```ts
test('builds the editorial PhotoSwipe skin without legacy dialog CSS', () => {
	const css = allFiles(distDir)
		.filter((path) => extname(path) === '.css')
		.map((path) => readFileSync(path, 'utf8'))
		.join('\n');

	expect(css).toContain('.romantic-lightbox .pswp__img');
	expect(css).toContain('.romantic-lightbox_caption');
	expect(css).toContain('.romantic-lightbox_close');
	expect(css).toContain('.romantic-lightbox_proof');
	expect(css).not.toContain('.romantic-dialog_panel');
	expect(css).not.toContain('.romantic-dialog_close');
});
```

- [ ] **Step 2: Build and verify the CSS test is RED**

Run:

```bash
/tmp/siyuanxue-bun/bin/bun run build
/tmp/siyuanxue-bun/bin/bun run test:output
```

Expected: FAIL because the new editorial selectors do not exist and legacy dialog selectors remain.

- [ ] **Step 3: Remove the complete `.romantic-dialog*` CSS block**

Delete the styles from `.romantic-dialog` through `.romantic-dialog_caption`, plus the later `.romantic-dialog_media.loading-slot` rule. Do not change portrait-card or toast styles.

- [ ] **Step 4: Add the editorial PhotoSwipe skin**

Insert after `.romantic-mode_toast.is-visible`:

```css
.romantic-lightbox {
	--romantic-lightbox-matte: 0.6rem;
	--romantic-lightbox-paper: var(--bg-elevated);
	--romantic-lightbox-rule: color-mix(in srgb, var(--border) 82%, var(--fg-muted));
	--romantic-lightbox-media-width: 20rem;
	--romantic-lightbox-media-half-width: 10rem;
	--romantic-lightbox-media-height: 30rem;
	--romantic-lightbox-media-top: 2rem;
}

.romantic-lightbox .pswp__bg {
	background: color-mix(in srgb, var(--fg) 86%, transparent);
	backdrop-filter: blur(4px);
}

.romantic-lightbox .pswp__img {
	box-sizing: content-box;
	padding: var(--romantic-lightbox-matte);
	border: 1px solid var(--romantic-lightbox-rule);
	outline: 1px solid color-mix(in srgb, var(--romantic-lightbox-rule) 46%, transparent);
	outline-offset: 0.28rem;
	background: var(--romantic-lightbox-paper);
	box-shadow: 0 1.8rem 4.5rem rgb(0 0 0 / 34%);
}

.romantic-lightbox_caption {
	position: absolute;
	z-index: 2;
	top: calc(
		var(--romantic-lightbox-media-top) +
		var(--romantic-lightbox-media-height) +
		var(--romantic-lightbox-matte)
	);
	left: 50%;
	display: grid;
	gap: 0.3rem;
	width: calc(
		var(--romantic-lightbox-media-width) +
		var(--romantic-lightbox-matte) * 2
	);
	padding: 0.7rem 0.8rem 0.9rem;
	border: 1px solid var(--romantic-lightbox-rule);
	border-top: 0;
	background: var(--romantic-lightbox-paper);
	box-shadow: 0 1.2rem 2.4rem rgb(0 0 0 / 18%);
	color: var(--fg-body);
	line-height: 1.45;
	text-align: center;
	transform: translateX(-50%);
	transition: opacity 180ms ease;
	pointer-events: none;
}

.romantic-lightbox_caption-text {
	font-family: var(--font-serif);
	font-size: 0.95rem;
}

.romantic-lightbox_proof {
	color: var(--fg-muted);
	font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	font-size: 0.625rem;
	letter-spacing: 0.14em;
}

.romantic-lightbox_close {
	position: absolute;
	z-index: 3;
	top: calc(var(--romantic-lightbox-media-top) - 1rem);
	left: calc(
		50% +
		var(--romantic-lightbox-media-half-width) -
		0.8rem
	);
	display: inline-grid;
	place-items: center;
	width: 2.75rem;
	height: 2.75rem;
	margin: 0;
	padding: 0 0 0.08rem;
	border: 1px solid var(--romantic-lightbox-rule);
	border-radius: 50%;
	background: var(--romantic-lightbox-paper);
	box-shadow: 0 0.35rem 1rem rgb(0 0 0 / 20%);
	color: var(--fg);
	cursor: pointer;
	font-family: system-ui, sans-serif;
	font-size: 1.45rem;
	font-weight: 300;
	line-height: 1;
	transition:
		opacity 180ms ease,
		background-color var(--ease-color),
		border-color var(--ease-color);
}

.romantic-lightbox_close:hover {
	background: var(--bg-soft);
}

.romantic-lightbox_close:focus-visible {
	outline: 2px solid var(--focus);
	outline-offset: 3px;
}

.romantic-lightbox.pswp--zoomed-in .romantic-lightbox_caption,
.romantic-lightbox.pswp--zoomed-in .romantic-lightbox_close {
	opacity: 0;
	pointer-events: none;
}
```

- [ ] **Step 5: Add narrow-screen and reduced-motion adjustments**

Add inside the existing `@media (max-width: 720px)` block:

```css
.romantic-lightbox {
	--romantic-lightbox-matte: 0.42rem;
}

.romantic-lightbox_caption {
	gap: 0.22rem;
	padding: 0.55rem 0.6rem 0.7rem;
}

.romantic-lightbox_caption-text {
	font-size: 0.875rem;
}

.romantic-lightbox_proof {
	font-size: 0.56rem;
}
```

Add inside the existing `@media (prefers-reduced-motion: reduce)` block:

```css
.romantic-lightbox_caption,
.romantic-lightbox_close {
	transition: none;
}
```

- [ ] **Step 6: Rebuild and verify all automated checks are GREEN**

Run:

```bash
/tmp/siyuanxue-bun/bin/bun run test
/tmp/siyuanxue-bun/bin/bun run build
/tmp/siyuanxue-bun/bin/bun run test:output
git diff --check
```

Expected: unit tests, output tests, production build, and whitespace validation all pass with zero failures.

- [ ] **Step 7: Commit the approved visual treatment**

```bash
git add src/styles/base.css tests/romantic-mode-output.check.ts
git commit -m "Style Romantic Mode editorial lightbox"
```

---

### Task 5: Perform full regression and browser acceptance testing

**Files:**
- Verify only; modify a file only after adding a failing regression check for a discovered defect.

**Interfaces:**
- Consumes: the completed PhotoSwipe trigger, configuration, runtime, and editorial skin from Tasks 1-4.
- Produces: fresh automated evidence and desktop/mobile interaction evidence suitable for completion and integration review.

- [ ] **Step 1: Run the repository-pinned full verification suite**

Run:

```bash
/tmp/siyuanxue-bun/bin/bun --version
/tmp/siyuanxue-bun/bin/bun install --frozen-lockfile
bash -n ops/bootstrap-remote.sh ops/bootstrap-server.sh ops/enable-https.sh ops/install-nginx-config.sh ops/reload-nginx-after-renewal.sh ops/release.sh ops/test-enable-https.sh ops/test-install-nginx-config.sh ops/test-nginx-config.sh ops/test-release.sh
bash ops/test-enable-https.sh
bash ops/test-install-nginx-config.sh
bash ops/test-release.sh
/tmp/siyuanxue-bun/bin/bun run test
ASTRO_TELEMETRY_DISABLED=1 /tmp/siyuanxue-bun/bin/bun run build
/tmp/siyuanxue-bun/bin/bun run test:output
test -s dist/index.html
test -s dist/sitemap-index.xml
rg -q 'https://siyuanxue.com' dist
git diff --check
```

Expected:

- Bun prints `1.3.14`.
- All shell tests available on macOS pass; `ops/test-nginx-config.sh` remains CI-only when local Nginx is unavailable.
- All Romantic Mode tests pass with zero failures.
- Astro builds all five routes and copies configured fonts without warnings when network access is available.
- Production-output checks pass.

- [ ] **Step 2: Start the production preview for interactive verification**

Run:

```bash
/tmp/siyuanxue-bun/bin/bun run preview --host 127.0.0.1
```

Open the printed local URL with the in-app browser control workflow.

- [ ] **Step 3: Verify the unlocked desktop interaction**

In a fresh session at desktop width:

1. Confirm `/images/p-202.jpg` is not present as an `<img>` before unlock.
2. Activate the primary portrait seven times and confirm the secret portrait appears.
3. Click the second portrait and confirm the large image zoom originates at that exact thumbnail.
4. Confirm the full portrait is uncropped inside the ivory matte.
5. Confirm the double hairline, bilingual caption, `VII · PRIVATE PROOF`, and corner-tab close control match the approved direction.
6. Close with the corner tab and confirm the reverse zoom returns to the second portrait and focus returns there.
7. Reopen and close with Escape.
8. Reopen and close with the supported backdrop click action.

- [ ] **Step 4: Verify localization, mobile layout, gestures, and reduced motion**

1. Switch between English and Chinese while the lightbox is open; confirm caption and accessible close label update immediately while `VII · PRIVATE PROOF` remains unchanged.
2. At 720 CSS pixels and 320 CSS pixels, confirm the image, caption, double rule, and full 44 × 44 close target remain inside the viewport with no horizontal scroll.
3. On a touch-capable browser or simulator, confirm pinch/pan and double-tap zoom are not blocked by the decorative UI; caption and close UI hide while zoomed.
4. Emulate `prefers-reduced-motion: reduce`; confirm opening and closing change state without the PhotoSwipe zoom transition.

- [ ] **Step 5: Run the verification-before-completion gate**

Invoke `superpowers:verification-before-completion`, rerun its required fresh commands, read every exit code, and compare the final result against every acceptance criterion in the design specification.

- [ ] **Step 6: Inspect final repository state**

Run:

```bash
git status --short --branch
git log --oneline --decorate -8
```

Expected: only intentional implementation commits are ahead of the chosen base; no generated `dist/`, `.astro/`, dependency cache, screenshot, or visual-companion file is tracked.

- [ ] **Step 7: Hand off integration choice**

Invoke `superpowers:finishing-a-development-branch`. Use the user's chosen integration path; do not push or open a pull request without that explicit choice.
